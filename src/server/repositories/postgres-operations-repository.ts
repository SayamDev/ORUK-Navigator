import type {
  AlertReconciliationResult,
  CorrectionReceipt,
  CorrectionState,
  CorrectionSubmission,
  CorrectionTransition,
  OperationsRepository,
  RetentionResult,
} from "@/domain/operations-repository";
import type { ParameterOrJSON, Sql, TransactionSql } from "postgres";

export class CorrectionRateLimitError extends Error {
  constructor() {
    super("Correction submission rate limit exceeded");
    this.name = "CorrectionRateLimitError";
  }
}

export class CorrectionTargetError extends Error {
  constructor() {
    super("Active catalogue entry was not found");
    this.name = "CorrectionTargetError";
  }
}

const allowedTransitions: Record<CorrectionState, CorrectionState[]> = {
  new: ["triaged", "rejected", "duplicate"],
  triaged: ["investigating", "resolved", "rejected", "duplicate"],
  investigating: ["resolved", "rejected", "duplicate"],
  resolved: [],
  rejected: [],
  duplicate: [],
};

export class PostgresOperationsRepository implements OperationsRepository {
  constructor(private readonly sql: Sql) {}

  async submitCorrection(input: CorrectionSubmission): Promise<CorrectionReceipt> {
    const windowRows = await this.sql.unsafe<Array<{ requestCount: number }>>(
      `insert into operations.abuse_windows (
         key_hash, window_started_at, expires_at, request_count
       ) values ($1, now(), now() + interval '24 hours', 1)
       on conflict (key_hash) do update set
         request_count = case
           when operations.abuse_windows.expires_at <= now() then 1
           else operations.abuse_windows.request_count + 1
         end,
         window_started_at = case
           when operations.abuse_windows.expires_at <= now() then now()
           else operations.abuse_windows.window_started_at
         end,
         expires_at = case
           when operations.abuse_windows.expires_at <= now() then now() + interval '24 hours'
           else operations.abuse_windows.expires_at
         end
       returning request_count::integer as "requestCount"`,
      [input.abuseKeyHash],
    );

    if ((windowRows[0]?.requestCount ?? 0) > 5) throw new CorrectionRateLimitError();

    return this.sql.begin(async (transaction) => {
      const targets = await transaction.unsafe<
        Array<{ entryId: string; publicationId: string }>
      >(
        `select
           entry.id as "entryId",
           entry.active_publication_id as "publicationId"
         from catalogue.entries entry
         join catalogue.publications publication
           on publication.id = entry.active_publication_id
         where entry.public_id = $1::uuid
           and entry.lifecycle = 'active'
           and publication.publication_state = 'active'
         limit 1`,
        [input.entryPublicId],
      );
      const target = targets[0];
      if (!target) throw new CorrectionTargetError();

      const reports = await transaction.unsafe<Array<{ reportId: string; reference: string }>>(
        `insert into operations.correction_reports (
           entry_id, publication_id, category, detail
         ) values ($1, $2, $3, $4)
         returning id as "reportId", public_reference::text as reference`,
        [target.entryId, target.publicationId, input.category, input.detail],
      );
      const report = reports[0];
      if (!report) throw new Error("Correction report could not be created");

      await transaction.unsafe(
        `insert into operations.correction_transitions (
           report_id, from_state, to_state, actor, reason_code, publication_id
         ) values ($1, null, 'new', 'public.form', 'submitted', $2)`,
        [report.reportId, target.publicationId],
      );
      await transaction.unsafe(
        `insert into operations.operational_events (
           event_type, correlation_id, entity_kind, entity_id, outcome_code
         ) values ('correction_report_created', $1::uuid, 'correction', $2, 'accepted')`,
        [input.correlationId, report.reference],
      );

      return { reference: report.reference };
    });
  }

  async transitionCorrection(input: CorrectionTransition): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const rows = await transaction.unsafe<Array<{ reportId: string; state: CorrectionState }>>(
        `select id as "reportId", state
         from operations.correction_reports
         where public_reference = $1::uuid
         for update`,
        [input.reference],
      );
      const report = rows[0];
      if (!report) throw new Error("Correction report was not found");
      if (!allowedTransitions[report.state].includes(input.toState)) {
        throw new Error(`Invalid correction transition: ${report.state} to ${input.toState}`);
      }

      const terminal = ["resolved", "rejected", "duplicate"].includes(input.toState);
      await transaction.unsafe(
        `update operations.correction_reports
         set state = $1,
             outcome_code = $2,
             updated_at = now(),
             closed_at = case when $3::boolean then now() else null end
         where id = $4`,
        [input.toState, input.outcomeCode ?? null, terminal, report.reportId],
      );
      await transaction.unsafe(
        `insert into operations.correction_transitions (
           report_id, from_state, to_state, actor, reason_code, candidate_id, publication_id
         ) values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          report.reportId,
          report.state,
          input.toState,
          input.actor,
          input.reasonCode,
          input.candidateId ?? null,
          input.publicationId ?? null,
        ],
      );
      await transaction.unsafe(
        `insert into operations.operational_events (
           event_type, correlation_id, entity_kind, entity_id, outcome_code
         ) values ('correction_report_state_changed', $1::uuid, 'correction', $2, $3)`,
        [input.correlationId, input.reference, input.toState],
      );
    });
  }

  async runRetention(correlationId: string, now = new Date()): Promise<RetentionResult> {
    return this.sql.begin(async (transaction) => {
      const expiredAbuseWindows = await affectedRows(
        transaction,
        "delete from operations.abuse_windows where expires_at <= $1",
        [now],
      );
      const redactedClosedDetails = await affectedRows(
        transaction,
        `update operations.correction_reports
         set detail = null, detail_deleted_at = $1, updated_at = $1
         where detail is not null and closed_at <= $1 - interval '30 days'`,
        [now],
      );
      const overdueRows = await transaction.unsafe<Array<{ reportId: string; reference: string }>>(
        `update operations.correction_reports
         set detail = null, detail_deleted_at = $1, updated_at = $1
         where detail is not null
           and state in ('new', 'triaged', 'investigating')
           and created_at <= $1 - interval '90 days'
         returning id as "reportId", public_reference::text as reference`,
        [now],
      );
      for (const overdue of overdueRows) {
        await transaction.unsafe(
          `insert into operations.alerts (alert_key, kind)
           values ($1, 'security')
           on conflict (alert_key) where state = 'open'
           do update set occurrence_count = operations.alerts.occurrence_count + 1,
             last_seen_at = $2`,
          [`correction_retention:${overdue.reportId}`, now],
        );
      }
      const purgedClosedReports = await affectedRows(
        transaction,
        "delete from operations.correction_reports where closed_at <= $1 - interval '12 months'",
        [now],
      );
      const expiredEvents = await affectedRows(
        transaction,
        "delete from operations.operational_events where created_at <= $1 - interval '30 days'",
        [now],
      );
      const result = {
        expiredAbuseWindows,
        redactedClosedDetails,
        redactedOverdueDetails: overdueRows.length,
        purgedClosedReports,
        expiredEvents,
      };

      await transaction.unsafe(
        `insert into operations.operational_events (
           event_type, correlation_id, entity_kind, entity_id, outcome_code
         ) values ('retention_job_finished', $1::uuid, 'retention_job', $2, 'succeeded')`,
        [correlationId, now.toISOString().slice(0, 10).replaceAll("-", "")],
      );
      return result;
    });
  }

  async reconcileSourceAlerts(
    correlationId: string,
    now = new Date(),
  ): Promise<AlertReconciliationResult> {
    return this.sql.begin(async (transaction) => {
      const actionable = await transaction.unsafe<
        Array<{ alertKey: string; kind: "source_failure" | "source_stale" | "material_candidate" | "all_source_failure"; sourcePageId: string | null }>
      >(
        `with ranked_observations as (
           select observation.source_page_id, observation.transport_outcome,
             observation.is_contract_valid,
             row_number() over (
               partition by observation.source_page_id order by observation.retrieved_at desc, observation.id desc
             ) as rank
           from ingest.fetch_observations observation
         ), repeated_failures as (
           select source_page_id
           from ranked_observations
           where rank <= 2
           group by source_page_id
           having count(*) = 2
             and bool_and(transport_outcome <> 'succeeded' or not is_contract_valid)
         ), actionable as (
           select 'source_failure:' || page.id::text as alert_key,
             'source_failure'::text as kind, page.id as source_page_id
           from ingest.source_pages page
           join repeated_failures failure on failure.source_page_id = page.id
           where page.admission_status = 'approved'
           union all
           select 'source_stale:' || page.id::text,
             'source_stale', page.id
           from ingest.source_pages page
           where page.admission_status = 'approved'
             and (page.last_successful_fetch_at is null
               or page.last_successful_fetch_at + page.freshness_window <= $1)
           union all
           select 'material_candidate:' || candidate.id::text,
             'material_candidate', candidate.source_page_id
           from ingest.extraction_candidates candidate
           where candidate.outcome = 'candidate' and candidate.review_status = 'pending_review'
           union all
           select 'all_source_failure:' || run.run_public_id::text,
             'all_source_failure', null::bigint
           from ingest.ingestion_runs run
           where run.id = (select max(id) from ingest.ingestion_runs)
             and run.status = 'failed'
             and run.considered_count > 0
             and run.failed_count + run.rejected_count = run.considered_count
         )
         select alert_key as "alertKey", kind, source_page_id as "sourcePageId"
         from actionable order by alert_key`,
        [now],
      );

      let opened = 0;
      let updated = 0;
      for (const alert of actionable) {
        const rows = await transaction.unsafe<Array<{ inserted: boolean }>>(
          `insert into operations.alerts (alert_key, source_page_id, kind, last_seen_at)
           values ($1, $2, $3, $4)
           on conflict (alert_key) where state = 'open'
           do update set occurrence_count = operations.alerts.occurrence_count + 1,
             last_seen_at = excluded.last_seen_at
           returning (xmax = 0) as inserted`,
          [alert.alertKey, alert.sourcePageId, alert.kind, now],
        );
        if (rows[0]?.inserted) opened += 1;
        else updated += 1;
      }

      const activeKeys = actionable.map((alert) => alert.alertKey);
      const resolvedRows = await transaction.unsafe<Array<{ id: string }>>(
        `update operations.alerts
         set state = 'resolved', resolved_at = $1, last_seen_at = $1
         where state = 'open'
           and kind in ('source_failure', 'source_stale', 'material_candidate', 'all_source_failure')
           and not (alert_key = any($2::text[]))
         returning id`,
        [now, activeKeys],
      );

      await transaction.unsafe(
        `insert into operations.operational_events (
           event_type, correlation_id, entity_kind, entity_id, outcome_code
         ) values ('alert_state_changed', $1::uuid, 'alert', $2, 'reconciled')`,
        [correlationId, now.toISOString().slice(0, 10).replaceAll("-", "")],
      );

      return {
        actionable: actionable.length,
        opened,
        updated,
        resolved: resolvedRows.length,
      };
    });
  }
}

async function affectedRows(
  sql: Sql | TransactionSql,
  query: string,
  parameters: ParameterOrJSON<never>[],
): Promise<number> {
  const result = await sql.unsafe(query, parameters);
  return result.count;
}

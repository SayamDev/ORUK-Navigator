import type {
  ApprovalResult,
  CandidateClaim,
  CandidateIdentity,
  IngestionRun,
  IngestionRepository,
  PageCheckRecord,
  PublicationApproval,
  RunCompletion,
  ReviewDisposition,
} from "@/domain/ingestion-repository";
import type { Sql } from "postgres";

type CandidateRow = {
  candidateId: string;
  created: boolean;
  reviewStatus: CandidateClaim["reviewStatus"];
};

type LockedCandidate = {
  candidateId: string;
  reviewStatus: CandidateClaim["reviewStatus"];
};

type EntryRow = { entryId: string };
type PublicationRow = { publicationId: string; versionNumber: number };

export class PostgresIngestionRepository implements IngestionRepository {
  constructor(private readonly sql: Sql) {}

  async resolveApprovedPageForCheck(key: string, canonicalUrl: string): Promise<{
    sourcePageId: string;
    previousCanonicalHash?: string;
  } | null> {
    const rows = await this.sql.unsafe<Array<{ sourcePageId: string; previousCanonicalHash: string | null }>>(
      `select page.id::text as "sourcePageId",
              approved.canonical_content_sha256 as "previousCanonicalHash"
       from ingest.source_pages page
       join ingest.sources source on source.id = page.source_id
       join ingest.source_licences licence on licence.source_id = source.id
       left join lateral (
         select candidate.canonical_content_sha256
         from ingest.extraction_candidates candidate
         join catalogue.publications publication on publication.approved_candidate_id = candidate.id
         join catalogue.entries entry on entry.active_publication_id = publication.id
         where candidate.source_page_id = page.id
           and entry.lifecycle = 'active'
           and publication.publication_state = 'active'
         order by publication.version_number desc
         limit 1
       ) approved on true
       where page.key = $1 and page.canonical_url = $2
         and page.admission_status = 'approved'
         and source.admission_status = 'approved' and source.is_enabled
         and licence.review_status = 'approved'
         and licence.next_review_at > now()
         and licence.permits_extraction and licence.permits_normalisation
         and licence.permits_storage and licence.permits_indexing
         and licence.permits_display and licence.permits_redistribution
       limit 1`,
      [key, canonicalUrl],
    );
    const page = rows[0];
    return page ? {
      sourcePageId: page.sourcePageId,
      ...(page.previousCanonicalHash ? { previousCanonicalHash: page.previousCanonicalHash } : {}),
    } : null;
  }

  async claimCandidate(candidate: CandidateIdentity): Promise<CandidateClaim> {
    return this.sql.begin(async (transaction) => {
      const rows = await transaction.unsafe<CandidateRow[]>(`
      with inserted as (
        insert into ingest.extraction_candidates (
          source_page_id,
          fetch_observation_id,
          adapter_version,
          rules_version,
          canonical_content_sha256,
          normalized_payload,
          outcome,
          review_status,
          warnings
        ) values (
          $1, $2, $3, $4, $5, $6::jsonb,
          'candidate', 'pending_review', $7::jsonb
        )
        on conflict (
          source_page_id,
          canonical_content_sha256,
          adapter_version,
          rules_version
        ) do nothing
        returning id, review_status
      )
      select
        id as "candidateId",
        true as created,
        review_status as "reviewStatus"
      from inserted
      union all
      select
        candidate.id as "candidateId",
        false as created,
        candidate.review_status as "reviewStatus"
      from ingest.extraction_candidates candidate
      where candidate.source_page_id = $1
        and candidate.canonical_content_sha256 = $5
        and candidate.adapter_version = $3
        and candidate.rules_version = $4
        and not exists (select 1 from inserted)
      limit 1
    `, [
      candidate.sourcePageId,
      candidate.fetchObservationId,
      candidate.adapterVersion,
      candidate.rulesVersion,
      candidate.canonicalContentSha256,
      JSON.stringify(candidate.normalizedPayload),
      JSON.stringify(candidate.warnings ?? []),
      ]);
      const row = rows[0];

      if (!row) {
        throw new Error("Candidate claim did not return a row");
      }

      if (row.created) {
        for (const evidence of candidate.evidence ?? []) {
          await transaction.unsafe(
            `insert into ingest.candidate_field_evidence (
              candidate_id,
              field_path,
              evidence_kind,
              source_locator,
              normalized_excerpt,
              value_sha256,
              transformation_note,
              safety_flags
            ) values ($1, $2, $3, $4, $5, $6, $7, $8::text[])`,
            [
              row.candidateId,
              evidence.fieldPath,
              evidence.evidenceKind,
              evidence.sourceLocator,
              evidence.normalizedExcerpt ?? null,
              evidence.valueSha256 ?? null,
              evidence.transformationNote,
              evidence.safetyFlags,
            ],
          );
        }
      }

      return row;
    });
  }

  async recordDisposition(disposition: ReviewDisposition): Promise<void> {
    await this.sql.begin(async (transaction) => {
      const rows = await transaction.unsafe<Array<{ reviewStatus: CandidateClaim["reviewStatus"] }>>(
        `select review_status as "reviewStatus"
         from ingest.extraction_candidates
         where id = $1
         for update`,
        [disposition.candidateId],
      );
      const candidate = rows[0];
      if (!candidate) throw new Error(`Candidate ${disposition.candidateId} does not exist`);
      if (candidate.reviewStatus !== "pending_review") {
        throw new Error(
          `Candidate ${disposition.candidateId} is already ${candidate.reviewStatus}`,
        );
      }

      await transaction.unsafe(
        `insert into ingest.review_decisions (candidate_id, decision, reason, reviewer)
         values ($1, $2, $3, $4)`,
        [
          disposition.candidateId,
          disposition.decision,
          disposition.reason,
          disposition.reviewer,
        ],
      );
      await transaction.unsafe(
        `update ingest.extraction_candidates set review_status = $1 where id = $2`,
        [disposition.decision, disposition.candidateId],
      );
    });
  }

  async approveCandidate(approval: PublicationApproval): Promise<ApprovalResult> {
    return this.sql.begin(async (transaction) => {
      const candidateRows = await transaction.unsafe<LockedCandidate[]>(`
        select
          id as "candidateId",
          review_status as "reviewStatus"
        from ingest.extraction_candidates
        where id = $1
        for update
      `, [approval.candidateId]);
      const candidate = candidateRows[0];

      if (!candidate) {
        throw new Error(`Candidate ${approval.candidateId} does not exist`);
      }

      if (candidate.reviewStatus !== "pending_review") {
        throw new Error(
          `Candidate ${approval.candidateId} is already ${candidate.reviewStatus}`,
        );
      }

      const entryRows = await transaction.unsafe<EntryRow[]>(`
        insert into catalogue.entries (slug)
        values ($1)
        on conflict (slug) do update set updated_at = catalogue.entries.updated_at
        returning id as "entryId"
      `, [approval.entrySlug]);
      const entry = entryRows[0];

      if (!entry) {
        throw new Error("Catalogue entry could not be resolved");
      }

      const publicationRows = await transaction.unsafe<PublicationRow[]>(`
        insert into catalogue.publications (
          entry_id,
          approved_candidate_id,
          version_number,
          name,
          description,
          provider_name,
          source_status,
          cost_summary,
          access_summary,
          source_checked_at,
          completeness_band,
          completeness_inputs,
          document,
          publication_state
        )
        select
          $1,
          $2,
          coalesce(max(version_number), 0) + 1,
          $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13
        from catalogue.publications
        where entry_id = $1
        returning id as "publicationId", version_number as "versionNumber"
      `, [
        entry.entryId,
        approval.candidateId,
        approval.publication.name,
        approval.publication.description,
        approval.publication.providerName,
        approval.publication.sourceStatus,
        approval.publication.costSummary ?? null,
        approval.publication.accessSummary ?? null,
        approval.publication.sourceCheckedAt,
        approval.publication.completenessBand,
        JSON.stringify(approval.publication.completenessInputs),
        JSON.stringify(approval.publication.document),
        approval.publication.publicationState ?? "active",
      ]);
      const publication = publicationRows[0];

      if (!publication) {
        throw new Error("Publication could not be created");
      }

      await transaction.unsafe(`
        insert into ingest.review_decisions (
          candidate_id, decision, reason, reviewer, resulting_publication_id
        ) values (
          $1,
          'approved',
          $2,
          $3,
          $4
        )
      `, [approval.candidateId, approval.reason, approval.reviewer, publication.publicationId]);

      await transaction.unsafe(`
        update ingest.extraction_candidates
        set review_status = 'approved'
        where id = $1
      `, [approval.candidateId]);

      await transaction.unsafe(`
        update catalogue.entries
        set
          lifecycle = $3,
          active_publication_id = $1,
          updated_at = now()
        where id = $2
      `, [
        publication.publicationId,
        entry.entryId,
        approval.publication.publicationState ?? "active",
      ]);

      await transaction.unsafe(
        `insert into catalogue.search_projection_jobs (publication_id)
         values ($1)
         on conflict (publication_id) do nothing`,
        [publication.publicationId],
      );

      return {
        entryId: entry.entryId,
        publicationId: publication.publicationId,
        versionNumber: publication.versionNumber,
      };
    });
  }

  async beginRun(input: {
    trigger: "scheduled" | "manual" | "replay";
    adapterVersion: string;
    rulesVersion: string;
  }): Promise<IngestionRun> {
    const rows = await this.sql.unsafe<IngestionRun[]>(
      `insert into ingest.ingestion_runs (trigger, adapter_version, rules_version)
       values ($1, $2, $3)
       returning id as "runId", run_public_id::text as "runPublicId"`,
      [input.trigger, input.adapterVersion, input.rulesVersion],
    );
    const run = rows[0];
    if (!run) throw new Error("Ingestion run could not be created");
    return run;
  }

  async recordPageCheck(check: PageCheckRecord): Promise<string> {
    return this.sql.begin(async (transaction) => {
      const rows = await transaction.unsafe<Array<{ observationId: string }>>(
        `insert into ingest.fetch_observations (
          run_id, source_page_id, requested_url, final_url, http_status,
          response_content_type, response_bytes, duration_ms, retrieved_at,
          raw_response_sha256, transport_outcome, error_code,
          is_contract_valid, retry_count
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) returning id as "observationId"`,
        [
          check.runId,
          check.sourcePageId,
          check.requestedUrl,
          check.finalUrl ?? null,
          check.httpStatus ?? null,
          check.responseContentType ?? null,
          check.responseBytes ?? null,
          check.durationMs,
          check.retrievedAt,
          check.rawResponseSha256 ?? null,
          check.transportOutcome,
          check.errorCode ?? null,
          check.isContractValid,
          check.retryCount,
        ],
      );
      const observation = rows[0];
      if (!observation) throw new Error("Fetch observation could not be created");

      await transaction.unsafe(
        `update ingest.source_pages
         set
           health = $1,
           last_successful_fetch_at = case when $2 then $3 else last_successful_fetch_at end,
           updated_at = now()
         where id = $4`,
        [check.health, check.isContractValid, check.retrievedAt, check.sourcePageId],
      );
      return observation.observationId;
    });
  }

  async finishRun(completion: RunCompletion): Promise<void> {
    const rows = await this.sql.unsafe<Array<{ id: string }>>(
      `update ingest.ingestion_runs
       set
         finished_at = now(),
         status = $1,
         considered_count = $2,
         skipped_count = $3,
         unchanged_count = $4,
         changed_count = $5,
         rejected_count = $6,
         failed_count = $7,
         summary = $8::jsonb
       where id = $9 and status = 'running'
       returning id`,
      [
        completion.status,
        completion.consideredCount,
        completion.skippedCount,
        completion.unchangedCount,
        completion.changedCount,
        completion.rejectedCount,
        completion.failedCount,
        JSON.stringify(completion.summary),
        completion.runId,
      ],
    );
    if (!rows[0]) throw new Error(`Running ingestion run ${completion.runId} was not found`);
  }

  async projectPublication(publicationId: string): Promise<void> {
    try {
      await this.sql.begin(async (transaction) => {
        const rows = await transaction.unsafe<Array<{ publicationId: string }>>(
          `select publication_id as "publicationId"
           from catalogue.search_projection_jobs
           where publication_id = $1
           for update`,
          [publicationId],
        );
        if (!rows[0]) throw new Error(`Projection job for publication ${publicationId} was not found`);

        await transaction.unsafe(
          `insert into catalogue.search_documents (
             publication_id, entry_id, name, provider_name, description, classification_text
           )
           select
             publication.id,
             publication.entry_id,
             publication.name,
             publication.provider_name,
             publication.description,
             coalesce(publication.document ->> 'area', '')
           from catalogue.publications publication
           where publication.id = $1
           on conflict (publication_id) do update set
             entry_id = excluded.entry_id,
             name = excluded.name,
             provider_name = excluded.provider_name,
             description = excluded.description,
             classification_text = excluded.classification_text,
             projected_at = now()`,
          [publicationId],
        );
        await transaction.unsafe(
          `update catalogue.search_projection_jobs
           set status = 'succeeded',
               attempt_count = attempt_count + 1,
               last_error_code = null,
               last_attempted_at = now(),
               projected_at = now()
           where publication_id = $1`,
          [publicationId],
        );
      });
    } catch (error) {
      await this.sql.unsafe(
        `update catalogue.search_projection_jobs
         set status = 'failed',
             attempt_count = attempt_count + 1,
             last_error_code = 'projection_failed',
             last_attempted_at = now()
         where publication_id = $1`,
        [publicationId],
      );
      throw error;
    }
  }

  async suspendSource(sourceId: string): Promise<number> {
    return this.sql.begin(async (transaction) => {
      const sources = await transaction.unsafe<Array<{ id: string }>>(
        `update ingest.sources
         set admission_status = 'suspended', is_enabled = false, updated_at = now()
         where id = $1
         returning id`,
        [sourceId],
      );
      if (!sources[0]) throw new Error(`Source ${sourceId} does not exist`);

      await transaction.unsafe(
        `update ingest.source_pages
         set admission_status = 'suspended', health = 'suspended', updated_at = now()
         where source_id = $1`,
        [sourceId],
      );
      const entries = await transaction.unsafe<Array<{ id: string }>>(
        `update catalogue.entries entry
         set lifecycle = 'suspended', updated_at = now()
         from catalogue.publications publication
         join ingest.extraction_candidates candidate
           on candidate.id = publication.approved_candidate_id
         join ingest.source_pages page on page.id = candidate.source_page_id
         where entry.active_publication_id = publication.id
           and page.source_id = $1
           and entry.lifecycle <> 'suspended'
         returning entry.id`,
        [sourceId],
      );
      return entries.length;
    });
  }
}

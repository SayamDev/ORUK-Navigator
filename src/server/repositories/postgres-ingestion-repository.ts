import type {
  ApprovalResult,
  CandidateClaim,
  CandidateIdentity,
  IngestionRepository,
  PublicationApproval,
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

  async claimCandidate(candidate: CandidateIdentity): Promise<CandidateClaim> {
    const rows = await this.sql.unsafe<CandidateRow[]>(`
      with inserted as (
        insert into ingest.extraction_candidates (
          source_page_id,
          fetch_observation_id,
          adapter_version,
          rules_version,
          canonical_content_sha256,
          normalized_payload,
          outcome
        ) values (
          $1, $2, $3, $4, $5, $6::jsonb,
          'candidate'
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
    ]);
    const row = rows[0];

    if (!row) {
      throw new Error("Candidate claim did not return a row");
    }

    return row;
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
          document
        )
        select
          $1,
          $2,
          coalesce(max(version_number), 0) + 1,
          $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb
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
          lifecycle = 'active',
          active_publication_id = $1,
          updated_at = now()
        where id = $2
      `, [publication.publicationId, entry.entryId]);

      await transaction.unsafe(`
        insert into catalogue.search_documents (
          publication_id,
          entry_id,
          name,
          provider_name,
          description,
          classification_text
        ) values (
          $1, $2, $3, $4, $5, $6
        )
      `, [
        publication.publicationId,
        entry.entryId,
        approval.publication.name,
        approval.publication.providerName,
        approval.publication.description,
        String(approval.publication.document.area ?? ""),
      ]);

      return {
        entryId: entry.entryId,
        publicationId: publication.publicationId,
        versionNumber: publication.versionNumber,
      };
    });
  }
}

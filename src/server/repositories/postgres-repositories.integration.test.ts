import { createHash, randomUUID } from "node:crypto";
import postgres, { type Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { CandidateIdentity, PublicationApproval } from "@/domain/ingestion-repository";
import { PostgresCatalogueRepository } from "@/server/repositories/postgres-catalogue-repository";
import { PostgresIngestionRepository } from "@/server/repositories/postgres-ingestion-repository";

const localDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let sql: Sql;
let catalogue: PostgresCatalogueRepository;
let ingestion: PostgresIngestionRepository;

beforeAll(() => {
  sql = postgres(localDatabaseUrl, { max: 2, transform: postgres.camel });
  catalogue = new PostgresCatalogueRepository(sql);
  ingestion = new PostgresIngestionRepository(sql);
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});

describe("Postgres repository boundary", () => {
  it("reads only active reviewed publications", async () => {
    const services = await catalogue.listActive();
    const service = await catalogue.findActiveBySlug("welfare-rights");

    expect(services).toHaveLength(5);
    expect(service).toMatchObject({
      slug: "welfare-rights",
      providerName: "Tameside Metropolitan Borough Council",
      completenessBand: "partial",
    });
    expect(service?.actions[0]?.url).toMatch(/^https:\/\/www\.tameside\.gov\.uk/);
  });

  it("claims replayed candidates idempotently", async () => {
    const candidate = await candidateFixture("idempotent");
    candidate.evidence = [
      {
        fieldPath: "name",
        evidenceKind: "text",
        sourceLocator: "main h1",
        normalizedExcerpt: "Fixture name",
        transformationNote: "Whitespace only.",
        safetyFlags: [],
      },
    ];

    const first = await ingestion.claimCandidate(candidate);
    const replay = await ingestion.claimCandidate(candidate);

    expect(first.created).toBe(true);
    expect(replay).toEqual({ ...first, created: false });
    const [evidenceCount] = await sql.unsafe<Array<{ count: number }>>(
      "select count(*)::integer as count from ingest.candidate_field_evidence where candidate_id = $1",
      [first.candidateId],
    );
    expect(evidenceCount?.count).toBe(1);
  });

  it("records rejection without creating or switching a publication", async () => {
    const suffix = randomUUID();
    const claim = await ingestion.claimCandidate(await candidateFixture(suffix));

    await ingestion.recordDisposition({
      candidateId: claim.candidateId,
      decision: "rejected",
      reviewer: "integration-test",
      reason: "Fixture deliberately rejected.",
    });

    const [state] = await sql.unsafe<Array<{ reviewStatus: string; publications: number }>>(
      `select
         candidate.review_status as "reviewStatus",
         count(publication.id)::integer as publications
       from ingest.extraction_candidates candidate
       left join catalogue.publications publication
         on publication.approved_candidate_id = candidate.id
       where candidate.id = $1
       group by candidate.review_status`,
      [claim.candidateId],
    );
    expect(state).toEqual({ reviewStatus: "rejected", publications: 0 });
  });

  it("publishes an approval and switches the active version atomically", async () => {
    const suffix = randomUUID();
    const claim = await ingestion.claimCandidate(await candidateFixture(suffix));
    const approval = approvalFixture(claim.candidateId, `integration-${suffix}`);

    const result = await ingestion.approveCandidate(approval);
    const service = await catalogue.findActiveBySlug(approval.entrySlug);

    expect(result.versionNumber).toBe(1);
    expect(service).toMatchObject({
      slug: approval.entrySlug,
      name: "Integration service",
      sourceStatus: "healthy",
    });

    const [pendingJob] = await sql.unsafe<Array<{ status: string; count: number }>>(
      `select job.status, count(document.publication_id)::integer as count
       from catalogue.search_projection_jobs job
       left join catalogue.search_documents document
         on document.publication_id = job.publication_id
       where job.publication_id = $1
       group by job.status`,
      [result.publicationId],
    );
    expect(pendingJob).toEqual({ status: "pending", count: 0 });

    await ingestion.projectPublication(result.publicationId);
    await ingestion.projectPublication(result.publicationId);

    const [projectedJob] = await sql.unsafe<
      Array<{ status: string; attemptCount: number; count: number }>
    >(
      `select
         job.status,
         job.attempt_count as "attemptCount",
         count(document.publication_id)::integer as count
       from catalogue.search_projection_jobs job
       left join catalogue.search_documents document
         on document.publication_id = job.publication_id
       where job.publication_id = $1
       group by job.status, job.attempt_count`,
      [result.publicationId],
    );
    expect(projectedJob).toEqual({ status: "succeeded", attemptCount: 2, count: 1 });

    await expect(ingestion.approveCandidate(approval)).rejects.toThrow(
      `Candidate ${claim.candidateId} is already approved`,
    );
  });

  it("keeps an approved publication active when projection fails, then retries safely", async () => {
    const suffix = randomUUID();
    const claim = await ingestion.claimCandidate(await candidateFixture(suffix));
    const approval = approvalFixture(claim.candidateId, `projection-${suffix}`);
    const result = await ingestion.approveCandidate(approval);

    await sql.unsafe(`
      create or replace function pg_temp.reject_test_projection()
      returns trigger language plpgsql as $$
      begin
        raise exception 'induced projection failure';
      end
      $$
    `);
    await sql.unsafe(`
      create trigger integration_reject_projection
      before insert on catalogue.search_documents
      for each row execute function pg_temp.reject_test_projection()
    `);

    try {
      await expect(ingestion.projectPublication(result.publicationId)).rejects.toThrow(
        "induced projection failure",
      );
    } finally {
      await sql.unsafe(
        "drop trigger if exists integration_reject_projection on catalogue.search_documents",
      );
    }

    const [afterFailure] = await sql.unsafe<
      Array<{ activePublicationId: string; publications: number; jobStatus: string }>
    >(
      `select
         entry.active_publication_id as "activePublicationId",
         count(publication.id)::integer as publications,
         job.status as "jobStatus"
       from catalogue.entries entry
       join catalogue.publications publication on publication.entry_id = entry.id
       join catalogue.search_projection_jobs job on job.publication_id = publication.id
       where entry.id = $1
       group by entry.active_publication_id, job.status`,
      [result.entryId],
    );
    expect(afterFailure).toEqual({
      activePublicationId: result.publicationId,
      publications: 1,
      jobStatus: "failed",
    });

    await ingestion.projectPublication(result.publicationId);
    const [afterRetry] = await sql.unsafe<Array<{ status: string; count: number }>>(
      `select job.status, count(document.publication_id)::integer as count
       from catalogue.search_projection_jobs job
       left join catalogue.search_documents document
         on document.publication_id = job.publication_id
       where job.publication_id = $1
       group by job.status`,
      [result.publicationId],
    );
    expect(afterRetry).toEqual({ status: "succeeded", count: 1 });
  });

  it("records an unreachable source without changing its active publication", async () => {
    const [before] = await sql.unsafe<
      Array<{ sourcePageId: string; activePublicationId: string }>
    >(`
      select
        page.id as "sourcePageId",
        entry.active_publication_id as "activePublicationId"
      from ingest.source_pages page
      join ingest.extraction_candidates candidate on candidate.source_page_id = page.id
      join catalogue.publications publication on publication.approved_candidate_id = candidate.id
      join catalogue.entries entry on entry.id = publication.entry_id
      where page.key = 'welfare-rights'
      limit 1
    `);
    if (!before) throw new Error("Seeded publication was not found");
    const run = await ingestion.beginRun({
      trigger: "replay",
      adapterVersion: "integration-v1",
      rulesVersion: "integration-v1",
    });

    await ingestion.recordPageCheck({
      runId: run.runId,
      sourcePageId: before.sourcePageId,
      requestedUrl: "https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights",
      durationMs: 100,
      retrievedAt: new Date("2026-09-16T01:00:00Z"),
      transportOutcome: "timeout",
      errorCode: "timeout",
      isContractValid: false,
      retryCount: 1,
      health: "unreachable",
    });
    await ingestion.finishRun({
      runId: run.runId,
      status: "succeeded_with_warnings",
      consideredCount: 1,
      skippedCount: 0,
      unchangedCount: 0,
      changedCount: 0,
      rejectedCount: 0,
      failedCount: 1,
      summary: { timeout: 1 },
    });

    const [after] = await sql.unsafe<
      Array<{ health: string; activePublicationId: string; runStatus: string }>
    >(
      `select
         page.health,
         entry.active_publication_id as "activePublicationId",
         run.status as "runStatus"
       from ingest.source_pages page
       join ingest.extraction_candidates candidate on candidate.source_page_id = page.id
       join catalogue.publications publication on publication.approved_candidate_id = candidate.id
       join catalogue.entries entry on entry.id = publication.entry_id
       join ingest.ingestion_runs run on run.id = $2
       where page.id = $1
       limit 1`,
      [before.sourcePageId, run.runId],
    );
    expect(after).toEqual({
      health: "unreachable",
      activePublicationId: before.activePublicationId,
      runStatus: "succeeded_with_warnings",
    });
  });

  it("rolls back entry creation when a later publication write fails", async () => {
    const suffix = randomUUID();
    const claim = await ingestion.claimCandidate(await candidateFixture(suffix));
    const approval = approvalFixture(claim.candidateId, `rollback-${suffix}`);
    approval.publication.sourceCheckedAt = new Date("invalid");

    await expect(ingestion.approveCandidate(approval)).rejects.toThrow();

    const [candidate] = await sql.unsafe<Array<{ reviewStatus: string }>>(
      "select review_status as \"reviewStatus\" from ingest.extraction_candidates where id = $1",
      [claim.candidateId],
    );
    const [entry] = await sql.unsafe<Array<{ count: number }>>(
      "select count(*)::integer as count from catalogue.entries where slug = $1",
      [approval.entrySlug],
    );

    expect(candidate?.reviewStatus).toBe("pending_review");
    expect(entry?.count).toBe(0);
  });
});

async function candidateFixture(seed: string): Promise<CandidateIdentity> {
  const [fixture] = await sql.unsafe<
    Array<{ sourcePageId: string; fetchObservationId: string }>
  >(`
    select
      page.id as "sourcePageId",
      observation.id as "fetchObservationId"
    from ingest.source_pages page
    join ingest.fetch_observations observation
      on observation.source_page_id = page.id
    where page.key = 'welfare-rights'
    limit 1
  `);

  if (!fixture) {
    throw new Error("Run the deterministic database seed before integration tests");
  }

  return {
    ...fixture,
    adapterVersion: "integration-v1",
    rulesVersion: "integration-v1",
    canonicalContentSha256: createHash("sha256").update(seed).digest("hex"),
    normalizedPayload: { seed },
  };
}

function approvalFixture(candidateId: string, entrySlug: string): PublicationApproval {
  return {
    candidateId,
    entrySlug,
    reviewer: "integration-test",
    reason: "Exercises the atomic repository transaction.",
    publication: {
      name: "Integration service",
      description: "A repository integration test publication.",
      providerName: "ORUK Navigator test suite",
      sourceStatus: "healthy",
      sourceCheckedAt: new Date("2026-09-16T00:00:00Z"),
      completenessBand: "limited",
      completenessInputs: { name: true, description: true },
      document: { area: "Tameside" },
    },
  };
}

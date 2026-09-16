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

    const first = await ingestion.claimCandidate(candidate);
    const replay = await ingestion.claimCandidate(candidate);

    expect(first.created).toBe(true);
    expect(replay).toEqual({ ...first, created: false });
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

    await expect(ingestion.approveCandidate(approval)).rejects.toThrow(
      `Candidate ${claim.candidateId} is already approved`,
    );
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

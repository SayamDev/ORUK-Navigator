// @vitest-environment node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngestionRepository } from "@/domain/ingestion-repository";
import { runTamesidePageCheck } from "@/ingestion/run-page-check";
import { tamesideSourceManifest } from "@/ingestion/source-manifest";

const source = tamesideSourceManifest["welfare-rights"];
const repository = {
  recordPageCheck: vi.fn(),
  claimCandidate: vi.fn(),
} as unknown as IngestionRepository;

beforeEach(() => {
  vi.mocked(repository.recordPageCheck).mockReset().mockResolvedValue("observation-1");
  vi.mocked(repository.claimCandidate).mockReset().mockResolvedValue({
    candidateId: "candidate-1",
    created: true,
    reviewStatus: "pending_review",
  });
});

describe("one-page ingestion orchestration", () => {
  it("records validated transport metadata and a reviewable candidate without raw HTML", async () => {
    const html = await fixture();
    const result = await runTamesidePageCheck({
      source,
      sourcePageId: "page-1",
      runId: "run-1",
      repository,
      fetchDependencies: successfulFetch(html),
      now: stepClock(),
    });

    expect(result).toEqual({
      outcome: "candidate",
      observationId: "observation-1",
      candidateId: "candidate-1",
      created: true,
    });
    expect(repository.recordPageCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        health: "changed",
        isContractValid: true,
        responseBytes: new TextEncoder().encode(html).byteLength,
        rawResponseSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(repository.claimCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: expect.arrayContaining([
          expect.objectContaining({ fieldPath: "name", evidenceKind: "text" }),
        ]),
      }),
    );
    expect(JSON.stringify(vi.mocked(repository.recordPageCheck).mock.calls)).not.toContain(html);
  });

  it("records a bounded transport failure without opening a candidate", async () => {
    const result = await runTamesidePageCheck({
      source: { ...source, retryLimit: 0 },
      sourcePageId: "page-1",
      runId: "run-1",
      repository,
      fetchDependencies: {
        lookup: async () => [{ address: "8.8.8.8", family: 4 }],
        fetch: async () => {
          throw new Error("private upstream details");
        },
      },
    });

    expect(result).toMatchObject({ outcome: "failed", errorCode: "connection_error" });
    expect(repository.recordPageCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        health: "unreachable",
        transportOutcome: "connection_error",
        errorCode: "connection_error",
        isContractValid: false,
      }),
    );
    expect(repository.claimCandidate).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(repository.recordPageCheck).mock.calls)).not.toContain(
      "private upstream details",
    );
  });

  it("marks changed page structure invalid and keeps it out of review", async () => {
    const result = await runTamesidePageCheck({
      source,
      sourcePageId: "page-1",
      runId: "run-1",
      repository,
      fetchDependencies: successfulFetch("<main><h1>Changed</h1></main>"),
    });

    expect(result).toMatchObject({
      outcome: "rejected",
      errorCode: "missing_required_field",
    });
    expect(repository.recordPageCheck).toHaveBeenCalledWith(
      expect.objectContaining({ health: "invalid", isContractValid: false }),
    );
    expect(repository.claimCandidate).not.toHaveBeenCalled();
  });
});

function successfulFetch(html: string) {
  return {
    lookup: async () => [{ address: "8.8.8.8", family: 4 }],
    fetch: async () =>
      new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
  };
}

async function fixture(): Promise<string> {
  const path = fileURLToPath(new URL("./fixtures/welfare-rights.html", import.meta.url));
  return readFile(path, "utf8");
}

function stepClock(): () => number {
  let value = 1_000;
  return () => {
    value += 25;
    return value;
  };
}

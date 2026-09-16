// @vitest-environment node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IngestionRepository } from "@/domain/ingestion-repository";
import { runTamesideBatch } from "@/ingestion/run-batch";
import { tamesideSourceManifest } from "@/ingestion/source-manifest";

const repository = {
  beginRun: vi.fn(),
  recordPageCheck: vi.fn(),
  claimCandidate: vi.fn(),
  finishRun: vi.fn(),
} as unknown as IngestionRepository;

beforeEach(() => {
  vi.mocked(repository.beginRun).mockReset().mockResolvedValue({
    runId: "run-1",
    runPublicId: "00000000-0000-4000-8000-000000000001",
  });
  vi.mocked(repository.recordPageCheck).mockReset().mockResolvedValue("observation-1");
  vi.mocked(repository.claimCandidate).mockReset().mockResolvedValue({
    candidateId: "candidate-1",
    created: true,
    reviewStatus: "pending_review",
  });
  vi.mocked(repository.finishRun).mockReset().mockResolvedValue();
});

describe("Tameside batch ingestion", () => {
  it("finishes with bounded counts when independent pages partly fail", async () => {
    const html = await fixture();
    const publicLookup = async () => [{ address: "8.8.8.8", family: 4 }];
    const result = await runTamesideBatch({
      trigger: "replay",
      repository,
      pages: [
        {
          source: tamesideSourceManifest["welfare-rights"],
          sourcePageId: "page-1",
          fetchDependencies: {
            lookup: publicLookup,
            fetch: async () =>
              new Response(html, { headers: { "content-type": "text/html" } }),
          },
        },
        {
          source: { ...tamesideSourceManifest["debt-advice"], retryLimit: 0 },
          sourcePageId: "page-2",
          fetchDependencies: {
            lookup: publicLookup,
            fetch: async () => {
              throw new Error("never retain this upstream detail");
            },
          },
        },
      ],
    });

    expect(result.status).toBe("succeeded_with_warnings");
    expect(repository.finishRun).toHaveBeenCalledWith({
      runId: "run-1",
      status: "succeeded_with_warnings",
      consideredCount: 2,
      skippedCount: 0,
      unchangedCount: 0,
      changedCount: 1,
      rejectedCount: 0,
      failedCount: 1,
      summary: { considered: 2, changed: 1, unchanged: 0, rejected: 0, failed: 1 },
    });
    expect(JSON.stringify(vi.mocked(repository.finishRun).mock.calls)).not.toContain(
      "upstream detail",
    );
  });

  it("rejects mixed extractor versions before creating a run", async () => {
    await expect(
      runTamesideBatch({
        trigger: "manual",
        repository,
        pages: [
          {
            source: tamesideSourceManifest["welfare-rights"],
            sourcePageId: "page-1",
          },
          {
            source: {
              ...tamesideSourceManifest["debt-advice"],
              rulesVersion: "unexpected-v2",
            },
            sourcePageId: "page-2",
          },
        ],
      }),
    ).rejects.toThrow("one adapter/rules version");
    expect(repository.beginRun).not.toHaveBeenCalled();
  });
});

async function fixture(): Promise<string> {
  const path = fileURLToPath(new URL("./fixtures/welfare-rights.html", import.meta.url));
  return readFile(path, "utf8");
}

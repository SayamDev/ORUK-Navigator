import type { IngestionRepository } from "@/domain/ingestion-repository";
import type { FetchDependencies } from "@/ingestion/bounded-fetch";
import { runTamesidePageCheck } from "@/ingestion/run-page-check";
import type { SourceManifestEntry } from "@/ingestion/source-manifest";

export type BatchPage = {
  source: SourceManifestEntry;
  sourcePageId: string;
  previousCanonicalHash?: string;
  fetchDependencies?: FetchDependencies;
};

export async function runTamesideBatch(input: {
  pages: BatchPage[];
  repository: IngestionRepository;
  trigger: "scheduled" | "manual" | "replay";
}): Promise<{ runPublicId: string; status: "succeeded" | "succeeded_with_warnings" | "failed" }> {
  if (input.pages.length === 0) throw new Error("An ingestion batch requires at least one page");
  const versions = new Set(
    input.pages.map((page) => `${page.source.adapterVersion}:${page.source.rulesVersion}`),
  );
  if (versions.size !== 1) throw new Error("An ingestion batch must use one adapter/rules version");

  const first = input.pages[0];
  if (!first) throw new Error("An ingestion batch requires at least one page");
  const run = await input.repository.beginRun({
    trigger: input.trigger,
    adapterVersion: first.source.adapterVersion,
    rulesVersion: first.source.rulesVersion,
  });
  const counts = { unchanged: 0, changed: 0, rejected: 0, failed: 0 };

  for (const page of input.pages) {
    const result = await runTamesidePageCheck({
      ...page,
      runId: run.runId,
      repository: input.repository,
    });
    if (result.outcome === "candidate") counts.changed += 1;
    else counts[result.outcome] += 1;
  }

  const problemCount = counts.rejected + counts.failed;
  const status =
    problemCount === input.pages.length
      ? "failed"
      : problemCount > 0
        ? "succeeded_with_warnings"
        : "succeeded";
  await input.repository.finishRun({
    runId: run.runId,
    status,
    consideredCount: input.pages.length,
    skippedCount: 0,
    unchangedCount: counts.unchanged,
    changedCount: counts.changed,
    rejectedCount: counts.rejected,
    failedCount: counts.failed,
    summary: {
      considered: input.pages.length,
      changed: counts.changed,
      unchanged: counts.unchanged,
      rejected: counts.rejected,
      failed: counts.failed,
    },
  });
  return { runPublicId: run.runPublicId, status };
}

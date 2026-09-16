import { createHash } from "node:crypto";

import type { IngestionRepository } from "@/domain/ingestion-repository";
import {
  FetchBoundaryError,
  fetchSourcePage,
  type FetchDependencies,
  type FetchedSourcePage,
} from "@/ingestion/bounded-fetch";
import type { SourceManifestEntry } from "@/ingestion/source-manifest";
import { extractTamesidePage, type ExtractionResult } from "@/ingestion/tameside-page-adapter";

export type PageCheckOutcome = {
  outcome: "candidate" | "unchanged" | "rejected" | "failed";
  observationId: string;
  candidateId?: string;
  created?: boolean;
  errorCode?: string;
};

export async function runTamesidePageCheck(input: {
  source: SourceManifestEntry;
  sourcePageId: string;
  runId: string;
  repository: IngestionRepository;
  previousCanonicalHash?: string;
  fetchDependencies?: FetchDependencies;
  now?: () => number;
}): Promise<PageCheckOutcome> {
  const now = input.now ?? Date.now;
  const startedAt = now();
  let fetched: FetchedSourcePage;

  try {
    fetched = await fetchSourcePage(input.source, input.fetchDependencies);
  } catch (error) {
    const boundaryError =
      error instanceof FetchBoundaryError
        ? error
        : new FetchBoundaryError("connection_error", "Source connection failed");
    const observationId = await input.repository.recordPageCheck({
      runId: input.runId,
      sourcePageId: input.sourcePageId,
      requestedUrl: input.source.canonicalUrl,
      durationMs: Math.max(0, now() - startedAt),
      retrievedAt: new Date(),
      transportOutcome: transportOutcome(boundaryError),
      errorCode: boundaryError.code,
      isContractValid: false,
      retryCount: boundaryError.retryCount,
      health: healthForFetchFailure(boundaryError),
    });
    return {
      outcome: "failed",
      observationId,
      errorCode: boundaryError.code,
    };
  }

  const extraction = extractTamesidePage(
    input.source,
    fetched,
    input.previousCanonicalHash,
  );
  const observationId = await recordFetchedPage(
    input.repository,
    input.runId,
    input.sourcePageId,
    fetched,
    extraction,
    Math.max(0, now() - startedAt),
  );

  if (extraction.outcome !== "candidate") {
    return {
      outcome: extraction.outcome,
      observationId,
      ...(extraction.outcome === "rejected" || extraction.outcome === "failed"
        ? { errorCode: extraction.code }
        : {}),
    };
  }

  const claim = await input.repository.claimCandidate({
    sourcePageId: input.sourcePageId,
    fetchObservationId: observationId,
    adapterVersion: input.source.adapterVersion,
    rulesVersion: input.source.rulesVersion,
    canonicalContentSha256: extraction.canonicalContentSha256,
    normalizedPayload: extraction.normalizedPayload,
    warnings: extraction.warnings,
    evidence: extraction.evidence.map((item) => ({
      ...item,
      evidenceKind: "text" as const,
    })),
  });

  return {
    outcome: "candidate",
    observationId,
    candidateId: claim.candidateId,
    created: claim.created,
  };
}

async function recordFetchedPage(
  repository: IngestionRepository,
  runId: string,
  sourcePageId: string,
  fetched: FetchedSourcePage,
  extraction: ExtractionResult,
  durationMs: number,
): Promise<string> {
  const invalid = extraction.outcome === "rejected" || extraction.outcome === "failed";
  return repository.recordPageCheck({
    runId,
    sourcePageId,
    requestedUrl: fetched.requestedUrl,
    finalUrl: fetched.finalUrl,
    httpStatus: fetched.status,
    responseContentType: fetched.contentType,
    responseBytes: fetched.bytes.byteLength,
    durationMs,
    retrievedAt: fetched.retrievedAt,
    rawResponseSha256: createHash("sha256").update(fetched.bytes).digest("hex"),
    transportOutcome: "succeeded",
    errorCode: invalid ? extraction.code : undefined,
    isContractValid: !invalid,
    retryCount: fetched.retryCount,
    health:
      extraction.outcome === "candidate"
        ? "changed"
        : extraction.outcome === "unchanged"
          ? "healthy"
          : "invalid",
  });
}

function transportOutcome(
  error: FetchBoundaryError,
): "timeout" | "dns_error" | "connection_error" | "rejected" {
  if (error.code === "timeout") return "timeout";
  if (error.code === "dns_not_public") return "dns_error";
  if (error.code === "connection_error") return "connection_error";
  return "rejected";
}

function healthForFetchFailure(error: FetchBoundaryError): "unreachable" | "invalid" {
  return ["timeout", "connection_error", "http_status"].includes(error.code)
    ? "unreachable"
    : "invalid";
}

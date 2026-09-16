export type CandidateIdentity = {
  sourcePageId: string;
  fetchObservationId: string;
  adapterVersion: string;
  rulesVersion: string;
  canonicalContentSha256: string;
  normalizedPayload: Record<string, unknown>;
  warnings?: string[];
  evidence?: CandidateEvidence[];
};

export type CandidateEvidence = {
  fieldPath: string;
  evidenceKind: "text" | "attribute" | "structured_value" | "hash";
  sourceLocator: string;
  normalizedExcerpt?: string;
  valueSha256?: string;
  transformationNote: string;
  safetyFlags: string[];
};

export type CandidateClaim = {
  candidateId: string;
  created: boolean;
  reviewStatus: "pending_review" | "approved" | "rejected" | "changes_requested";
};

export type PublicationApproval = {
  candidateId: string;
  entrySlug: string;
  reviewer: string;
  reason: string;
  publication: {
    name: string;
    description: string;
    providerName: string;
    sourceStatus: string;
    sourceCheckedAt: Date;
    costSummary?: string;
    accessSummary?: string;
    completenessBand: "good" | "partial" | "limited";
    completenessInputs: Record<string, boolean>;
    document: Record<string, unknown>;
    publicationState?: "active" | "withdrawn" | "suspended";
  };
};

export type ApprovalResult = {
  entryId: string;
  publicationId: string;
  versionNumber: number;
};

export type ReviewDisposition = {
  candidateId: string;
  decision: "rejected" | "changes_requested";
  reviewer: string;
  reason: string;
};

export type IngestionRun = {
  runId: string;
  runPublicId: string;
};

export type PageCheckRecord = {
  runId: string;
  sourcePageId: string;
  requestedUrl: string;
  finalUrl?: string;
  httpStatus?: number;
  responseContentType?: string;
  responseBytes?: number;
  durationMs: number;
  retrievedAt: Date;
  rawResponseSha256?: string;
  transportOutcome: "succeeded" | "timeout" | "dns_error" | "connection_error" | "rejected";
  errorCode?: string;
  isContractValid: boolean;
  retryCount: number;
  health: "healthy" | "changed" | "stale" | "unreachable" | "invalid" | "suspended";
};

export type RunCompletion = {
  runId: string;
  status: "succeeded" | "succeeded_with_warnings" | "failed";
  consideredCount: number;
  skippedCount: number;
  unchangedCount: number;
  changedCount: number;
  rejectedCount: number;
  failedCount: number;
  summary: Record<string, number | boolean>;
};

export interface IngestionRepository {
  claimCandidate(candidate: CandidateIdentity): Promise<CandidateClaim>;
  approveCandidate(approval: PublicationApproval): Promise<ApprovalResult>;
  recordDisposition(disposition: ReviewDisposition): Promise<void>;
  beginRun(input: {
    trigger: "scheduled" | "manual" | "replay";
    adapterVersion: string;
    rulesVersion: string;
  }): Promise<IngestionRun>;
  recordPageCheck(check: PageCheckRecord): Promise<string>;
  finishRun(completion: RunCompletion): Promise<void>;
  projectPublication(publicationId: string): Promise<void>;
  suspendSource(sourceId: string): Promise<number>;
}

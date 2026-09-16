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

export interface IngestionRepository {
  claimCandidate(candidate: CandidateIdentity): Promise<CandidateClaim>;
  approveCandidate(approval: PublicationApproval): Promise<ApprovalResult>;
  recordDisposition(disposition: ReviewDisposition): Promise<void>;
}

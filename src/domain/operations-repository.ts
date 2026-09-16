export const correctionCategories = [
  "incorrect",
  "outdated",
  "closed",
  "wrong_service",
  "other",
] as const;

export type CorrectionCategory = (typeof correctionCategories)[number];
export type CorrectionState =
  | "new"
  | "triaged"
  | "investigating"
  | "resolved"
  | "rejected"
  | "duplicate";

export type CorrectionSubmission = {
  entryPublicId: string;
  category: CorrectionCategory;
  detail: string | null;
  abuseKeyHash: string;
  correlationId: string;
};

export type CorrectionReceipt = { reference: string };

export type CorrectionTransition = {
  reference: string;
  toState: Exclude<CorrectionState, "new">;
  actor: string;
  reasonCode: string;
  candidateId?: string;
  publicationId?: string;
  outcomeCode?: string;
  correlationId: string;
};

export type RetentionResult = {
  expiredAbuseWindows: number;
  redactedClosedDetails: number;
  redactedOverdueDetails: number;
  purgedClosedReports: number;
  expiredEvents: number;
};

export type AlertReconciliationResult = {
  actionable: number;
  opened: number;
  updated: number;
  resolved: number;
};

export interface OperationsRepository {
  submitCorrection(input: CorrectionSubmission): Promise<CorrectionReceipt>;
  transitionCorrection(input: CorrectionTransition): Promise<void>;
  runRetention(correlationId: string, now?: Date): Promise<RetentionResult>;
  reconcileSourceAlerts(correlationId: string, now?: Date): Promise<AlertReconciliationResult>;
}

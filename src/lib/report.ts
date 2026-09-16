export const problemTypes = [
  "incorrect",
  "outdated",
  "closed",
  "wrong-service",
  "other",
] as const;

type ProblemType = (typeof problemTypes)[number];

export type ReportInput = {
  problem: string;
  details: string;
};

export type ReportErrors = Partial<Record<keyof ReportInput, string>>;

export function validateReport(input: ReportInput): ReportErrors {
  const errors: ReportErrors = {};

  if (!problemTypes.includes(input.problem as ProblemType)) {
    errors.problem = "Select what is wrong.";
  }

  if ([...input.details.normalize("NFKC")].length > 1000) {
    errors.details = "Describe what we should check in 1,000 characters or fewer.";
  }

  return errors;
}

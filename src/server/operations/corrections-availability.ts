type CorrectionsEnvironment = {
  [name: string]: string | undefined;
  PUBLIC_CORRECTIONS_ENABLED?: string;
  CORRECTIONS_FALLBACK_OWNER?: string;
  CORRECTIONS_REVIEW_HOURS?: string;
};

export function publicCorrectionsAreEnabled(
  environment: CorrectionsEnvironment = process.env,
): boolean {
  return environment.PUBLIC_CORRECTIONS_ENABLED === "true"
    && Boolean(environment.CORRECTIONS_FALLBACK_OWNER?.trim())
    && Boolean(environment.CORRECTIONS_REVIEW_HOURS?.trim());
}

export type SourcePageKey =
  | "crisis-payments"
  | "welfare-rights"
  | "debt-advice"
  | "tameside-homelessness-service"
  | "adult-mental-health-services"
  | "housing-payments"
  | "tameside-carers-centre"
  | "family-hubs"
  | "equipment-and-adaptations"
  | "adult-social-care-early-support";

export type SourceManifestEntry = {
  key: SourcePageKey;
  publisherName: string;
  canonicalUrl: string;
  allowedRedirectHosts: readonly string[];
  expectedContentTypes: readonly string[];
  adapterVersion: string;
  rulesVersion: string;
  geographicScope: string;
  timeoutMs: number;
  retryLimit: number;
  maxResponseBytes: number;
  reviewStatus: "approved" | "draft" | "suspended" | "revoked";
  isEnabled: boolean;
  licence: {
    identifier: string;
    evidenceUrl: string;
    evidenceSha256: string;
    checkedAt: string;
    nextReviewAt: string;
    attributionText: string;
    permitsExtraction: boolean;
    permitsNormalisation: boolean;
    permitsStorage: boolean;
    permitsIndexing: boolean;
    permitsDisplay: boolean;
    permitsRedistribution: boolean;
  };
};

const shared = {
  publisherName: "Tameside Metropolitan Borough Council",
  allowedRedirectHosts: ["www.tameside.gov.uk"],
  expectedContentTypes: ["text/html"],
  adapterVersion: "tameside-liferay-v2",
  rulesVersion: "reviewed-pages-v2",
  timeoutMs: 10_000,
  retryLimit: 1,
  maxResponseBytes: 2_097_152,
  reviewStatus: "approved" as const,
  isEnabled: true,
  licence: {
    identifier: "OGL-3.0",
    evidenceUrl: "https://www.tameside.gov.uk/webteam/disclaimer-and-copyright-notice",
    evidenceSha256: "eede30879833549c5d3a2f3ecf9c5bb5d729558fe5016720d25601c067bddec9",
    checkedAt: "2026-09-15T22:09:00Z",
    nextReviewAt: "2027-03-15T00:00:00Z",
    attributionText:
      "© Tameside Metropolitan Borough Council retains the sole intellectual property rights to the named source page and publication date, licensed under the Open Government Licence.",
    permitsExtraction: true,
    permitsNormalisation: true,
    permitsStorage: true,
    permitsIndexing: true,
    permitsDisplay: true,
    permitsRedistribution: true,
  },
};

export const tamesideSourceManifest = {
  "crisis-payments": {
    ...shared,
    key: "crisis-payments",
    canonicalUrl: "https://www.tameside.gov.uk/crisis-payments",
    geographicScope: "Tameside residents or people about to become Tameside residents",
  },
  "welfare-rights": {
    ...shared,
    key: "welfare-rights",
    canonicalUrl: "https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights",
    geographicScope: "Tameside residents",
  },
  "debt-advice": {
    ...shared,
    key: "debt-advice",
    canonicalUrl:
      "https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights/debt-advice",
    geographicScope: "Tameside council service; eligibility is not inferred",
  },
  "tameside-homelessness-service": {
    ...shared,
    key: "tameside-homelessness-service",
    canonicalUrl:
      "https://www.tameside.gov.uk/housing/housing-and-homelessness/tameside-homeless-service",
    geographicScope: "People seeking homelessness help from Tameside Council",
  },
  "adult-mental-health-services": {
    ...shared,
    key: "adult-mental-health-services",
    canonicalUrl:
      "https://www.tameside.gov.uk/adults/care-and-support/types-of-support/adult-mental-health-services",
    geographicScope: "Adult social-care mental-health support in Tameside",
  },
  "housing-payments": {
    ...shared,
    key: "housing-payments",
    canonicalUrl: "https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments",
    geographicScope:
      "Tameside council applicants entitled to Housing Benefit or Universal Credit housing costs",
  },
  "tameside-carers-centre": {
    ...shared,
    key: "tameside-carers-centre",
    canonicalUrl: "https://www.tameside.gov.uk/adults/what-support-is-available/carers",
    geographicScope: "People in Tameside who look after someone",
  },
  "family-hubs": {
    ...shared,
    key: "family-hubs",
    canonicalUrl: "https://www.tameside.gov.uk/children-and-families/family-hubs",
    geographicScope: "Families in Tameside's four neighbourhood areas",
  },
  "equipment-and-adaptations": {
    ...shared,
    key: "equipment-and-adaptations",
    canonicalUrl: "https://www.tameside.gov.uk/adults/equipment-and-adaptations",
    geographicScope: "Adult social-care support in Tameside, subject to assessment",
  },
  "adult-social-care-early-support": {
    ...shared,
    key: "adult-social-care-early-support",
    canonicalUrl: "https://www.tameside.gov.uk/adultservices/contact-us",
    geographicScope: "Adult social-care information and advice in Tameside",
  },
} satisfies Record<SourcePageKey, SourceManifestEntry>;

export function assertAdmittedSource(
  source: SourceManifestEntry,
  now = new Date(),
): SourceManifestEntry {
  const url = parseHttpsUrl(source.canonicalUrl, "canonical URL");
  const evidenceUrl = parseHttpsUrl(source.licence.evidenceUrl, "licence evidence URL");
  const permissions = [
    source.licence.permitsExtraction,
    source.licence.permitsNormalisation,
    source.licence.permitsStorage,
    source.licence.permitsIndexing,
    source.licence.permitsDisplay,
    source.licence.permitsRedistribution,
  ];

  if (!source.isEnabled || source.reviewStatus !== "approved") {
    throw new Error(`Source ${source.key} is not approved and enabled`);
  }
  if (!source.allowedRedirectHosts.includes(url.hostname)) {
    throw new Error(`Source ${source.key} canonical host is not allowlisted`);
  }
  if (!source.allowedRedirectHosts.includes(evidenceUrl.hostname)) {
    throw new Error(`Source ${source.key} licence evidence host is not allowlisted`);
  }
  if (!source.licence.identifier || !source.licence.attributionText) {
    throw new Error(`Source ${source.key} has incomplete licence evidence`);
  }
  if (!/^[0-9a-f]{64}$/.test(source.licence.evidenceSha256)) {
    throw new Error(`Source ${source.key} has an invalid licence evidence hash`);
  }
  if (permissions.some((permission) => !permission)) {
    throw new Error(`Source ${source.key} lacks a required licence permission`);
  }
  if (new Date(source.licence.nextReviewAt) <= now) {
    throw new Error(`Source ${source.key} licence evidence requires review`);
  }
  if (
    source.expectedContentTypes.length === 0 ||
    source.timeoutMs < 100 ||
    source.timeoutMs > 60_000 ||
    source.retryLimit < 0 ||
    source.retryLimit > 5 ||
    source.maxResponseBytes < 1_024 ||
    source.maxResponseBytes > 10_485_760
  ) {
    throw new Error(`Source ${source.key} has invalid fetch limits`);
  }

  return source;
}

function parseHttpsUrl(value: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Source ${label} is invalid`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error(`Source ${label} must be an ordinary HTTPS URL`);
  }
  return url;
}

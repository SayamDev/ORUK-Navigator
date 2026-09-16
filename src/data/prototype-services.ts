export type PrototypeService = {
  slug: string;
  name: string;
  summary: string;
  concepts: string[];
  searchableText: string;
  matchReason: string;
};

/**
 * Reviewed prototype fixtures derived from the provisional source manifest.
 * They are intentionally incomplete and must not be presented as live availability.
 */
export const prototypeServices: PrototypeService[] = [
  {
    slug: "welfare-rights",
    name: "Welfare Rights",
    summary:
      "Free advice about benefits, debt and related support for Tameside residents.",
    concepts: ["debt-support", "financial-support"],
    searchableText:
      "benefits welfare debt money financial appeals forms advice free",
    matchReason: "The service description mentions debt advice.",
  },
  {
    slug: "debt-advice",
    name: "Debt Advice",
    summary:
      "Council debt advice, including help with mortgage or rent arrears.",
    concepts: ["debt-support"],
    searchableText: "debt money mortgage rent arrears court advice free",
    matchReason:
      "Your words ‘money advice’ match the reviewed category Debt support.",
  },
  {
    slug: "crisis-payments",
    name: "Crisis Payments",
    summary:
      "Short-term help for Tameside residents facing an immediate financial crisis.",
    concepts: ["financial-support"],
    searchableText: "money financial crisis emergency payment short term",
    matchReason: "The source describes financial crisis support.",
  },
  {
    slug: "tameside-homelessness-service",
    name: "Tameside Homelessness Service",
    summary:
      "Council information for people who are homeless or at risk of losing their home.",
    concepts: ["housing-support"],
    searchableText: "housing homeless homelessness home eviction prevention",
    matchReason: "The service description mentions homelessness support.",
  },
  {
    slug: "adult-mental-health-services",
    name: "Adult Mental Health Services",
    summary:
      "Council adult social-care information about mental-health support in Tameside.",
    concepts: ["mental-health-support"],
    searchableText: "adult mental health social care wellbeing support",
    matchReason: "The service description mentions adult mental-health support.",
  },
];

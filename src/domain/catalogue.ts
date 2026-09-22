export type CatalogueContact = {
  kind: "phone" | "email" | "website" | "textphone" | "other";
  label: string;
  value: string;
  accessNotes: string | null;
};

export type CatalogueAction = {
  kind:
    | "authoritative_details"
    | "apply"
    | "request_support"
    | "refer"
    | "urgent_guidance";
  label: string;
  url: string;
};

export type SourceHealth =
  | "healthy"
  | "changed"
  | "stale"
  | "unreachable"
  | "invalid"
  | "suspended";

export type CatalogueService = {
  publicId: string;
  slug: string;
  name: string;
  description: string;
  providerName: string;
  sourceStatus: SourceHealth;
  sourceCheckedAt: string;
  lastSuccessfulSourceCheckAt?: string | null;
  costSummary: string | null;
  accessSummary: string | null;
  serviceArea: string;
  completenessBand: "good" | "partial" | "limited";
  contacts: CatalogueContact[];
  actions: CatalogueAction[];
};

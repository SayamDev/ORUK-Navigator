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

export type CatalogueService = {
  publicId: string;
  slug: string;
  name: string;
  description: string;
  providerName: string;
  sourceStatus: string;
  sourceCheckedAt: string;
  costSummary: string | null;
  accessSummary: string | null;
  completenessBand: "good" | "partial" | "limited";
  contacts: CatalogueContact[];
  actions: CatalogueAction[];
};


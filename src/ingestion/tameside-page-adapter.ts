import { createHash } from "node:crypto";

import { load } from "cheerio";

import type { FetchedSourcePage } from "@/ingestion/bounded-fetch";
import type { SourceManifestEntry, SourcePageKey } from "@/ingestion/source-manifest";

export type NormalizedContact = {
  kind: "phone" | "email";
  label: string;
  value: string;
};

export type NormalizedAction = {
  kind: "authoritative_details" | "apply" | "request_support" | "refer" | "urgent_guidance";
  label: string;
  url: string;
};

export type NormalizedCandidate = {
  slug: string;
  name: string;
  description: string;
  providerName: string;
  area: string;
  access: string;
  cost?: string;
  contacts: NormalizedContact[];
  actions: NormalizedAction[];
};

export type FieldEvidence = {
  fieldPath: string;
  sourceLocator: string;
  normalizedExcerpt: string;
  transformationNote: string;
  safetyFlags: string[];
};

type CandidateExtraction = {
  outcome: "candidate";
  canonicalContentSha256: string;
  normalizedPayload: NormalizedCandidate;
  evidence: FieldEvidence[];
  warnings: string[];
};

type UnchangedExtraction = {
  outcome: "unchanged";
  canonicalContentSha256: string;
};

type RejectedExtraction = {
  outcome: "rejected";
  code: "missing_required_field" | "invalid_action_url";
  reason: string;
};

type FailedExtraction = {
  outcome: "failed";
  code: "invalid_encoding" | "processing_error";
  reason: string;
};

export type ExtractionResult =
  | CandidateExtraction
  | UnchangedExtraction
  | RejectedExtraction
  | FailedExtraction;

type PageRule = {
  warning?: string;
  safetyFlags?: string[];
};

const pageRules: Record<SourcePageKey, PageRule> = {
  "crisis-payments": {},
  "welfare-rights": {},
  "debt-advice": {
    warning: "Third-party advice listings are excluded from the council service record.",
  },
  "tameside-homelessness-service": {
    warning: "Urgent and out-of-hours routes require heightened editorial review.",
    safetyFlags: ["urgent-guidance"],
  },
  "adult-mental-health-services": {
    warning: "Crisis and referral wording requires heightened editorial review.",
    safetyFlags: ["urgent-guidance", "health-content"],
  },
};

export function extractTamesidePage(
  source: SourceManifestEntry,
  fetched: FetchedSourcePage,
  previousCanonicalHash?: string,
): ExtractionResult {
  try {
    const html = new TextDecoder("utf-8", { fatal: true }).decode(fetched.bytes);
    const $ = load(html);
    const root = $("main").first();
    root.find("script, style, form, iframe, img, svg, nav, [data-exclude]").remove();

    const required = {
      name: selectedText($, root.find("h1").first()),
      description: selectedText($, root.find("#service-summary").first()),
      area: selectedText($, root.find("#who-it-helps").first()),
      access: selectedText($, root.find("#how-to-access").first()),
    };

    for (const [field, value] of Object.entries(required)) {
      if (!value) {
        return {
          outcome: "rejected",
          code: "missing_required_field",
          reason: `Reviewed selector for ${field} was absent or empty`,
        };
      }
    }

    const rule = pageRules[source.key];
    const contacts = extractContacts($, root);
    const parsedActions = extractActions($, root, source);
    if (parsedActions instanceof Error) {
      return { outcome: "rejected", code: "invalid_action_url", reason: parsedActions.message };
    }

    const payload: NormalizedCandidate = {
      slug: source.key,
      name: required.name,
      description: required.description,
      providerName: source.publisherName,
      area: required.area,
      access: required.access,
      contacts,
      actions: [
        {
          kind: "authoritative_details",
          label: "Check current details on the council website",
          url: source.canonicalUrl,
        },
        ...parsedActions,
      ],
    };
    const cost = selectedText($, root.find("#cost").first());
    if (cost) payload.cost = cost;

    const evidence = buildEvidence(payload, rule);
    const canonicalContentSha256 = createHash("sha256")
      .update(stableJson({ payload, evidence }))
      .digest("hex");

    if (canonicalContentSha256 === previousCanonicalHash) {
      return { outcome: "unchanged", canonicalContentSha256 };
    }

    return {
      outcome: "candidate",
      canonicalContentSha256,
      normalizedPayload: payload,
      evidence,
      warnings: rule.warning ? [rule.warning] : [],
    };
  } catch (error) {
    const invalidEncoding = error instanceof TypeError;
    return {
      outcome: "failed",
      code: invalidEncoding ? "invalid_encoding" : "processing_error",
      reason: invalidEncoding
        ? "Source response was not valid UTF-8"
        : "Source response could not be processed",
    };
  }
}

function selectedText(
  $: ReturnType<typeof load>,
  selection: ReturnType<ReturnType<typeof load>>,
): string {
  void $;
  return normalizeText(selection.text());
}

function extractContacts(
  $: ReturnType<typeof load>,
  root: ReturnType<ReturnType<typeof load>>,
): NormalizedContact[] {
  const contacts: NormalizedContact[] = [];
  root.find("a[data-reviewed-contact]").each((_index, element) => {
    const link = $(element);
    const href = link.attr("href") ?? "";
    const label = normalizeText(link.text());
    if (href.startsWith("tel:")) {
      contacts.push({ kind: "phone", label, value: href.slice(4).replace(/\s+/g, "") });
    } else if (href.startsWith("mailto:")) {
      contacts.push({ kind: "email", label, value: href.slice(7).trim().toLowerCase() });
    }
  });
  return contacts;
}

function extractActions(
  $: ReturnType<typeof load>,
  root: ReturnType<ReturnType<typeof load>>,
  source: SourceManifestEntry,
): NormalizedAction[] | Error {
  const actions: NormalizedAction[] = [];
  let invalid: Error | undefined;
  root.find("a[data-reviewed-action]").each((_index, element) => {
    const link = $(element);
    const rawUrl = link.attr("href") ?? "";
    let url: URL;
    try {
      url = new URL(rawUrl, source.canonicalUrl);
    } catch {
      invalid = new Error("Reviewed source action contained an invalid URL");
      return false;
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      invalid = new Error("Reviewed source action must use HTTPS without credentials");
      return false;
    }
    const kind = link.attr("data-reviewed-action") as NormalizedAction["kind"];
    if (!["apply", "request_support", "refer", "urgent_guidance"].includes(kind)) {
      invalid = new Error("Reviewed source action used an unsupported kind");
      return false;
    }
    actions.push({ kind, label: normalizeText(link.text()), url: url.toString() });
  });
  return invalid ?? actions;
}

function buildEvidence(payload: NormalizedCandidate, rule: PageRule): FieldEvidence[] {
  const fields: Array<[string, string, string]> = [
    ["name", "main h1", payload.name],
    ["description", "main #service-summary", payload.description],
    ["area", "main #who-it-helps", payload.area],
    ["access", "main #how-to-access", payload.access],
  ];
  if (payload.cost) fields.push(["cost", "main #cost", payload.cost]);

  return fields.map(([fieldPath, sourceLocator, normalizedExcerpt]) => ({
    fieldPath,
    sourceLocator,
    normalizedExcerpt,
    transformationNote: "Collapsed presentation whitespace; no facts inferred.",
    safetyFlags: rule.safetyFlags ?? [],
  }));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

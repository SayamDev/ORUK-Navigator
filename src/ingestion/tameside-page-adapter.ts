import { createHash } from "node:crypto";

import { load, type CheerioAPI } from "cheerio";

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
  code: "missing_required_field";
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

/**
 * Where a field comes from on a reviewed Tameside (Liferay) page.
 *
 * - `pageTitle`: the page header `h1`.
 * - `heading`: the text of a reviewed heading inside the article.
 * - `lead`: text lines before the article's first heading.
 * - `section`: text lines under a reviewed heading, up to the next heading of the same or higher rank.
 * - `fromLine`: text lines starting at a reviewed line, up to the next heading.
 * - `reviewed`: an editorially reviewed value that is only published while `mustAppear`
 *   still matches the page. Nothing is inferred from the page for these fields.
 */
type Locator =
  | { kind: "pageTitle" }
  | { kind: "heading"; match: RegExp }
  | { kind: "lead"; lines: number }
  | { kind: "section"; heading: RegExp; lines: number }
  | { kind: "fromLine"; match: RegExp; lines: number }
  | { kind: "reviewed"; value: string; mustAppear: RegExp };

type PageRule = {
  name: Locator;
  description: Locator;
  area: Locator;
  access: Locator;
  cost?: Locator;
  warning?: string;
  safetyFlags?: string[];
};

const pageRules: Record<SourcePageKey, PageRule> = {
  "crisis-payments": {
    name: { kind: "pageTitle" },
    description: { kind: "section", heading: /^What are Crisis Payments\?$/i, lines: 1 },
    area: {
      kind: "reviewed",
      value: "Tameside residents or people about to become residents",
      mustAppear: /about to become a Tameside resident|live in Tameside/i,
    },
    access: { kind: "section", heading: /^How to apply$/i, lines: 6 },
  },
  "welfare-rights": {
    name: { kind: "pageTitle" },
    description: { kind: "section", heading: /^What the Welfare Rights Service Does\??$/i, lines: 2 },
    area: { kind: "reviewed", value: "Tameside residents", mustAppear: /advise Tameside residents/i },
    access: { kind: "section", heading: /^How to contact us$/i, lines: 1 },
    cost: { kind: "reviewed", value: "Free", mustAppear: /\bconfidential and free\b/i },
  },
  "debt-advice": {
    name: { kind: "pageTitle" },
    description: { kind: "lead", lines: 1 },
    area: {
      kind: "reviewed",
      value: "Tameside council service",
      mustAppear: /based within the Council.s Welfare Rights Service/i,
    },
    access: {
      kind: "section",
      heading: /^If You Have a County Court Hearing for Mortgage or Rent Arrears$/i,
      lines: 1,
    },
    cost: { kind: "reviewed", value: "Free", mustAppear: /\bfree, independent/i },
    warning: "Third-party advice listings are excluded from the council service record.",
  },
  "tameside-homelessness-service": {
    name: { kind: "pageTitle" },
    description: {
      kind: "section",
      heading: /^Get advice if you.re at risk of being homeless$/i,
      lines: 1,
    },
    area: {
      kind: "reviewed",
      value: "People seeking homelessness help from Tameside Council",
      mustAppear: /at risk of (?:being )?homeless/i,
    },
    access: { kind: "section", heading: /^Tell us you.re at risk of being homeless$/i, lines: 2 },
    warning: "Urgent and out-of-hours routes require heightened editorial review.",
    safetyFlags: ["urgent-guidance"],
  },
  "adult-mental-health-services": {
    name: { kind: "pageTitle" },
    description: { kind: "lead", lines: 1 },
    area: {
      kind: "reviewed",
      value: "Adult social-care support in Tameside",
      mustAppear: /Mental health services in adult social care/i,
    },
    access: { kind: "fromLine", match: /^For further information, you can speak to/i, lines: 1 },
    warning: "Crisis and referral wording requires heightened editorial review.",
    safetyFlags: ["urgent-guidance", "health-content"],
  },
  "housing-payments": {
    name: { kind: "pageTitle" },
    description: { kind: "section", heading: /^What are Housing Payments\?$/i, lines: 2 },
    area: {
      kind: "reviewed",
      value: "People entitled to Housing Benefit or Universal Credit housing costs",
      mustAppear: /Universal Credit/i,
    },
    access: { kind: "section", heading: /^How to apply$/i, lines: 1 },
    warning: "Awards are discretionary and funding is limited; eligibility is not inferred.",
  },
  "tameside-carers-centre": {
    name: { kind: "heading", match: /^Tameside Carers Centre$/i },
    description: { kind: "section", heading: /^Tameside Carers Centre$/i, lines: 1 },
    area: {
      kind: "reviewed",
      value: "People in Tameside who look after someone",
      mustAppear: /people who look after someone/i,
    },
    access: { kind: "section", heading: /^Drop-in Support$/i, lines: 1 },
    warning: "Third-party carer resources and newsletter content are excluded from the council service record.",
  },
  "family-hubs": {
    name: { kind: "pageTitle" },
    description: { kind: "lead", lines: 2 },
    area: {
      kind: "reviewed",
      value: "Families with children aged 0 to 19, or up to 25 with SEND",
      mustAppear: /children and parents\/carers/i,
    },
    access: { kind: "section", heading: /^Opening Times:?$/i, lines: 3 },
    warning: "Partner organisations and external Best Start for Life content are excluded from the council service record.",
  },
  "equipment-and-adaptations": {
    name: { kind: "pageTitle" },
    description: { kind: "lead", lines: 2 },
    area: {
      kind: "reviewed",
      value: "Adults in Tameside, following an assessment for care and support",
      mustAppear: /after carrying out an assessment for care and support/i,
    },
    access: { kind: "section", heading: /^Refer or request an assessment$/i, lines: 2 },
    cost: {
      kind: "reviewed",
      value:
        "No cost for day-to-day equipment and minor adaptations after assessment; major adaptations may involve a financial assessment",
      mustAppear: /provided at no cost to you/i,
    },
    warning: "Grant values and eligibility are assessment-dependent and require heightened editorial review.",
  },
  "adult-social-care-early-support": {
    name: {
      kind: "reviewed",
      value: "Early Support and Advice Hub",
      mustAppear: /Early Support (?:&|and) Advice Hub/i,
    },
    description: { kind: "lead", lines: 1 },
    area: {
      kind: "reviewed",
      value: "Adults in Tameside, carers and professionals",
      mustAppear: /unpaid carers\), and professionals/i,
    },
    access: { kind: "fromLine", match: /^Contact the team on/i, lines: 4 },
    warning: "Safeguarding and out-of-hours wording requires heightened editorial review.",
    safetyFlags: ["urgent-guidance"],
  },
};

const fieldLimits = { name: 200, description: 1500, area: 500, access: 900, cost: 500 } as const;
type FieldName = keyof typeof fieldLimits;

type Located = { value: string; sourceLocator: string; excerpt: string; transformationNote: string };

type AnyNode = Exclude<Parameters<typeof load>[0], string | Buffer | unknown[]>;

type Token = { kind: "heading"; rank: number; text: string } | { kind: "line"; text: string };

const blockElements = new Set([
  "address", "article", "aside", "blockquote", "dd", "div", "dl", "dt", "figcaption", "figure",
  "footer", "header", "li", "ol", "p", "section", "table", "td", "th", "tr", "ul",
]);

const articleSelector = "#main-content .journal-content-article";

export function extractTamesidePage(
  source: SourceManifestEntry,
  fetched: FetchedSourcePage,
  previousCanonicalHash?: string,
): ExtractionResult {
  try {
    const html = new TextDecoder("utf-8", { fatal: true }).decode(fetched.bytes);
    const $ = load(html);
    $("script, style, form, iframe, img, svg, nav, noscript, [data-exclude]").remove();

    const article = $(articleSelector).first();
    const pageTitle = normalizeText($("#main-content h1.page-title").first().text());
    const tokens = article.length ? linearize($, article.get(0)!) : [];
    const pageText = tokens.map((token) => token.text).join(" ");
    const rule = pageRules[source.key];

    const located: Partial<Record<FieldName, Located>> = {};
    for (const field of ["name", "description", "area", "access"] as const) {
      const result = locate(rule[field], tokens, pageTitle, pageText, fieldLimits[field]);
      if (!result) {
        return {
          outcome: "rejected",
          code: "missing_required_field",
          reason: `Reviewed locator for ${field} was absent or empty`,
        };
      }
      located[field] = result;
    }
    if (rule.cost) {
      const cost = locate(rule.cost, tokens, pageTitle, pageText, fieldLimits.cost);
      if (cost) located.cost = cost;
    }

    const payload: NormalizedCandidate = {
      slug: source.key,
      name: located.name!.value,
      description: located.description!.value,
      providerName: source.publisherName,
      area: located.area!.value,
      access: located.access!.value,
      contacts: [],
      actions: [
        {
          kind: "authoritative_details",
          label: "Check current details on the council website",
          url: source.canonicalUrl,
        },
      ],
    };
    if (located.cost) payload.cost = located.cost.value;

    const evidence = (Object.entries(located) as Array<[FieldName, Located]>).map(
      ([fieldPath, item]) => ({
        fieldPath,
        sourceLocator: item.sourceLocator,
        normalizedExcerpt: item.excerpt,
        transformationNote: item.transformationNote,
        safetyFlags: rule.safetyFlags ?? [],
      }),
    );
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

/** Flattens article markup into headings and text lines, whether the CMS used `<p>` or bare `<br>` text. */
function linearize($: CheerioAPI, root: AnyNode): Token[] {
  const tokens: Token[] = [];
  let buffer = "";
  const flush = () => {
    const text = normalizeText(buffer);
    if (text) tokens.push({ kind: "line", text });
    buffer = "";
  };
  const walk = (node: AnyNode) => {
    if (!("children" in node)) return;
    for (const child of node.children) {
      if (child.type === "text") {
        buffer += child.data;
        continue;
      }
      if (child.type !== "tag") continue;
      const heading = /^h([1-6])$/.exec(child.name);
      if (heading) {
        flush();
        const text = normalizeText($(child).text());
        if (text) tokens.push({ kind: "heading", rank: Number(heading[1]), text });
        continue;
      }
      if (child.name === "br") {
        flush();
        continue;
      }
      const isBlock = blockElements.has(child.name);
      if (isBlock) flush();
      walk(child);
      if (isBlock) flush();
    }
  };
  walk(root);
  flush();
  return tokens;
}

function locate(
  locator: Locator,
  tokens: Token[],
  pageTitle: string,
  pageText: string,
  limit: number,
): Located | null {
  switch (locator.kind) {
    case "pageTitle":
      return pageTitle
        ? verbatim(pageTitle, "#main-content h1.page-title", limit)
        : null;
    case "heading": {
      const heading = tokens.find((token) => token.kind === "heading" && locator.match.test(token.text));
      return heading ? verbatim(heading.text, `article heading "${heading.text}"`, limit) : null;
    }
    case "lead": {
      const end = tokens.findIndex((token) => token.kind === "heading");
      const lines = linesOnly(tokens.slice(0, end === -1 ? tokens.length : end), locator.lines);
      return lines ? verbatim(lines, `article lead (${locator.lines} line max)`, limit) : null;
    }
    case "section": {
      const start = tokens.findIndex(
        (token) => token.kind === "heading" && locator.heading.test(token.text),
      );
      if (start === -1) return null;
      const opener = tokens[start] as Extract<Token, { kind: "heading" }>;
      const rest = tokens.slice(start + 1);
      const end = rest.findIndex((token) => token.kind === "heading" && token.rank <= opener.rank);
      const lines = linesOnly(rest.slice(0, end === -1 ? rest.length : end), locator.lines, true);
      return lines
        ? verbatim(lines, `article section "${opener.text}" (${locator.lines} line max)`, limit)
        : null;
    }
    case "fromLine": {
      const start = tokens.findIndex((token) => token.kind === "line" && locator.match.test(token.text));
      if (start === -1) return null;
      const rest = tokens.slice(start);
      const end = rest.findIndex((token) => token.kind === "heading");
      const lines = linesOnly(rest.slice(0, end === -1 ? rest.length : end), locator.lines);
      return lines
        ? verbatim(lines, `article line "${rest[0].text.slice(0, 40)}" (${locator.lines} line max)`, limit)
        : null;
    }
    case "reviewed": {
      const match = locator.mustAppear.exec(pageText);
      if (!match) return null;
      return {
        value: locator.value,
        sourceLocator: `reviewed value confirmed by page text /${locator.mustAppear.source}/`,
        excerpt: normalizeText(match[0]),
        transformationNote: "Editorially reviewed wording; published only while the confirming text remains on the page.",
      };
    }
  }
}

function linesOnly(tokens: Token[], count: number, includeSubheadings = false): string {
  return tokens
    .filter((token) => token.kind === "line" || includeSubheadings)
    .slice(0, count)
    .map((token) => (token.kind === "heading" ? `${token.text}:` : token.text))
    .join(" ");
}

function verbatim(text: string, sourceLocator: string, limit: number): Located {
  const value = truncateAtWord(text, limit);
  return {
    value,
    sourceLocator,
    excerpt: value,
    transformationNote:
      value === text
        ? "Collapsed presentation whitespace; no facts inferred."
        : "Collapsed presentation whitespace and shortened at a word boundary; no facts inferred.",
  };
}

function truncateAtWord(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const boundary = cut.lastIndexOf(" ");
  return `${(boundary > limit / 2 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
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

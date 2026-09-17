import type { KnownFeed } from "@/oruk/feed-directory";

/**
 * Bounded, read-only probe of a published ORUK v3 feed.
 *
 * The probe answers what a consuming application needs to know before depending on a feed:
 * does it describe itself, does the list envelope behave, and how completely are records
 * populated. It samples a handful of records, keeps only counts and summary facts, and never
 * retains or republishes another publisher's service records.
 */

export type FeedProbeField = {
  field: string;
  populated: number;
  sampled: number;
};

export type FeedProbeResult = {
  key: string;
  publisher: string;
  baseUrl: string;
  note: string;
  reachable: boolean;
  declaredVersion: string | null;
  profilePlaceholder: boolean;
  totalServices: number | null;
  sampled: number;
  coverage: FeedProbeField[];
  completenessScore: number | null;
  warnings: string[];
  checkedAt: string;
};

type ProbeOptions = {
  sampleSize?: number;
  timeoutMs?: number;
  now?: () => Date;
  fetchImplementation?: typeof fetch;
};

const sampledFields = [
  "id",
  "name",
  "description",
  "status",
  "url",
  "email",
  "assured_date",
] as const;

export async function probeFeed(feed: KnownFeed, options: ProbeOptions = {}): Promise<FeedProbeResult> {
  const {
    sampleSize = 25,
    timeoutMs = 8_000,
    now = () => new Date(),
    fetchImplementation = fetch,
  } = options;

  const base = feed.baseUrl.endsWith("/") ? feed.baseUrl : `${feed.baseUrl}/`;
  const warnings: string[] = [];
  const result: FeedProbeResult = {
    ...feed,
    reachable: false,
    declaredVersion: null,
    profilePlaceholder: false,
    totalServices: null,
    sampled: 0,
    coverage: [],
    completenessScore: null,
    warnings,
    checkedAt: now().toISOString(),
  };

  const metadata = await readJson(base, timeoutMs, fetchImplementation);
  if (!isRecord(metadata)) {
    warnings.push("The feed root did not return readable JSON metadata.");
    return result;
  }

  result.reachable = true;
  result.declaredVersion = typeof metadata.version === "string" ? metadata.version : null;
  if (!result.declaredVersion) warnings.push("The feed does not declare a version at its root.");
  if (typeof metadata.openapi_url !== "string") warnings.push("The feed publishes no openapi_url.");
  if (typeof metadata.profile === "string" && metadata.profile.includes("path/to")) {
    result.profilePlaceholder = true;
    warnings.push("The declared profile is a placeholder rather than a retrievable URL.");
  }

  const page = await readJson(`${base}services?per_page=${sampleSize}`, timeoutMs, fetchImplementation);
  if (!isRecord(page) || !Array.isArray(page.contents)) {
    warnings.push("The services list did not return a paginated ORUK envelope.");
    return result;
  }

  const services = page.contents.filter(isRecord);
  result.totalServices = typeof page.total_items === "number" ? page.total_items : services.length;
  result.sampled = services.length;
  result.coverage = sampledFields.map((field) => ({
    field,
    populated: services.filter((service) => isPopulated(service[field])).length,
    sampled: services.length,
  }));

  result.completenessScore = services.length
    ? Math.round(
        (result.coverage.reduce((total, item) => total + item.populated / item.sampled, 0) /
          result.coverage.length) *
          100,
      )
    : null;

  const stale = countStaleAssurances(services, now());
  if (stale) warnings.push(`${stale} of ${services.length} sampled records were last checked over a year ago.`);

  return result;
}

function countStaleAssurances(services: Record<string, unknown>[], today: Date): number {
  const yearMs = 365 * 24 * 60 * 60 * 1000;

  return services.filter((service) => {
    const value = service.assured_date;
    if (typeof value !== "string") return false;
    const checked = new Date(value);
    return !Number.isNaN(checked.getTime()) && today.getTime() - checked.getTime() > yearMs;
  }).length;
}

async function readJson(
  url: string,
  timeoutMs: number,
  fetchImplementation: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImplementation(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "ORUK-Navigator-feed-probe/1.0" },
      next: { revalidate: 3_600 },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPopulated(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined;
}

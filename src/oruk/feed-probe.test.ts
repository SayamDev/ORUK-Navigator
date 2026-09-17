// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import type { KnownFeed } from "@/oruk/feed-directory";

import { probeFeed } from "./feed-probe";

const feed: KnownFeed = {
  key: "example",
  publisher: "Example Council",
  baseUrl: "https://example.org/feed",
  note: "Test feed",
};

const today = () => new Date("2026-09-17T00:00:00Z");

describe("probeFeed", () => {
  it("reports version, totals and field coverage from a healthy feed", async () => {
    const result = await probeFeed(feed, {
      now: today,
      fetchImplementation: stubFetch({
        "https://example.org/feed/": {
          version: "HSDS-UK-3.0",
          profile: "https://openreferraluk.org",
          openapi_url: "https://example.org/openapi.json",
        },
        "https://example.org/feed/services?per_page=25": {
          total_items: 512,
          contents: [
            service({ email: null }),
            service({ assured_date: "2026-09-01" }),
          ],
        },
      }),
    });

    expect(result.reachable).toBe(true);
    expect(result.declaredVersion).toBe("HSDS-UK-3.0");
    expect(result.totalServices).toBe(512);
    expect(result.sampled).toBe(2);
    expect(result.coverage.find((item) => item.field === "email")).toMatchObject({ populated: 1, sampled: 2 });
    expect(result.completenessScore).toBe(93);
    expect(result.warnings).toEqual([]);
  });

  it("warns about placeholder profiles, missing openapi urls and stale assurance", async () => {
    const result = await probeFeed(feed, {
      now: today,
      fetchImplementation: stubFetch({
        "https://example.org/feed/": { version: "HSDS-UK-3.0", profile: "https://path/to/profile" },
        "https://example.org/feed/services?per_page=25": {
          contents: [service({ assured_date: "2024-01-01" }), service()],
        },
      }),
    });

    expect(result.profilePlaceholder).toBe(true);
    expect(result.warnings).toEqual([
      "The feed publishes no openapi_url.",
      "The declared profile is a placeholder rather than a retrievable URL.",
      "1 of 2 sampled records were last checked over a year ago.",
    ]);
  });

  it("reports an unreachable feed without throwing", async () => {
    const result = await probeFeed(feed, {
      now: today,
      fetchImplementation: vi.fn().mockRejectedValue(new Error("network down")),
    });

    expect(result).toMatchObject({ reachable: false, sampled: 0, completenessScore: null });
    expect(result.warnings).toEqual(["The feed root did not return readable JSON metadata."]);
  });

  it("reports a feed whose services endpoint is not an ORUK envelope", async () => {
    const result = await probeFeed(feed, {
      now: today,
      fetchImplementation: stubFetch({
        "https://example.org/feed/": { version: "HSDS-UK-3.0", openapi_url: "https://example.org/openapi.json" },
        "https://example.org/feed/services?per_page=25": { items: [] },
      }),
    });

    expect(result.reachable).toBe(true);
    expect(result.sampled).toBe(0);
    expect(result.warnings).toContain("The services list did not return a paginated ORUK envelope.");
  });

  it("keeps no service records from the probed feed", async () => {
    const result = await probeFeed(feed, {
      now: today,
      fetchImplementation: stubFetch({
        "https://example.org/feed/": { version: "HSDS-UK-3.0", openapi_url: "https://example.org/openapi.json" },
        "https://example.org/feed/services?per_page=25": { contents: [service({ name: "Confidential Service" })] },
      }),
    });

    expect(JSON.stringify(result)).not.toContain("Confidential Service");
  });
});

function service(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Example service",
    description: "Example description",
    status: "active",
    url: "https://example.org/service",
    email: "service@example.org",
    assured_date: "2026-09-10",
    ...overrides,
  };
}

function stubFetch(responses: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!(url in responses)) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(responses[url]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

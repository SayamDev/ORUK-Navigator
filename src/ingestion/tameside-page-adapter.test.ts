// @vitest-environment node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { FetchedSourcePage } from "@/ingestion/bounded-fetch";
import { tamesideSourceManifest, type SourcePageKey } from "@/ingestion/source-manifest";
import { extractTamesidePage } from "@/ingestion/tameside-page-adapter";

const keys = Object.keys(tamesideSourceManifest) as SourcePageKey[];

describe("Tameside reviewed-page adapter", () => {
  it.each(keys)("extracts %s deterministically with field evidence", async (key) => {
    const fetched = await fixture(key);
    const first = extractTamesidePage(tamesideSourceManifest[key], fetched);
    const replay = extractTamesidePage(tamesideSourceManifest[key], fetched);

    expect(first.outcome).toBe("candidate");
    expect(replay).toEqual(first);
    if (first.outcome !== "candidate") return;
    expect(first.canonicalContentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.normalizedPayload.slug).toBe(key);
    expect(first.normalizedPayload.providerName).toBe("Tameside Metropolitan Borough Council");
    expect(first.evidence.map((item) => item.fieldPath)).toEqual(
      expect.arrayContaining(["name", "description", "area", "access"]),
    );
    expect(JSON.stringify(first.normalizedPayload)).not.toContain("Unrelated navigation");
    expect(JSON.stringify(first.normalizedPayload)).not.toContain("applicant data");
  });

  it("returns unchanged when canonical reviewed content is replayed", async () => {
    const source = tamesideSourceManifest["welfare-rights"];
    const fetched = await fixture("welfare-rights");
    const first = extractTamesidePage(source, fetched);
    if (first.outcome !== "candidate") throw new Error("Expected candidate fixture");

    expect(extractTamesidePage(source, fetched, first.canonicalContentSha256)).toEqual({
      outcome: "unchanged",
      canonicalContentSha256: first.canonicalContentSha256,
    });
  });

  it("rejects a changed page shape without deleting or inventing fields", async () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["debt-advice"],
      fetchedFrom("<main><h1>Debt Advice</h1><p>Layout changed</p></main>"),
    );

    expect(result).toEqual({
      outcome: "rejected",
      code: "missing_required_field",
      reason: "Reviewed selector for description was absent or empty",
    });
  });

  it("fails safely on invalid UTF-8", () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["crisis-payments"],
      { ...fetchedFrom(""), bytes: new Uint8Array([0xc3, 0x28]) },
    );

    expect(result).toMatchObject({ outcome: "failed", code: "invalid_encoding" });
  });

  it("normalizes contacts and excludes marked third-party content", async () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["welfare-rights"],
      await fixture("welfare-rights"),
    );
    if (result.outcome !== "candidate") throw new Error("Expected candidate fixture");

    expect(result.normalizedPayload.contacts).toEqual([
      { kind: "phone", label: "Council advice line", value: "01613423494" },
      { kind: "email", label: "Council email", value: "welfarerights@example.gov.uk" },
    ]);
    expect(JSON.stringify(result)).not.toContain("999");
  });

  it("rejects an unsafe reviewed action URL", () => {
    const html = `<main><h1>Welfare Rights</h1><p id="service-summary">Summary</p><p id="who-it-helps">Area</p><p id="how-to-access">Access</p><a data-reviewed-action="apply" href="javascript:alert(1)">Apply</a></main>`;

    expect(
      extractTamesidePage(tamesideSourceManifest["welfare-rights"], fetchedFrom(html)),
    ).toMatchObject({ outcome: "rejected", code: "invalid_action_url" });
  });
});

async function fixture(key: SourcePageKey): Promise<FetchedSourcePage> {
  const path = fileURLToPath(new URL(`./fixtures/${key}.html`, import.meta.url));
  return fetchedFrom(await readFile(path, "utf8"));
}

function fetchedFrom(html: string): FetchedSourcePage {
  return {
    requestedUrl: "https://www.tameside.gov.uk/fixture",
    finalUrl: "https://www.tameside.gov.uk/fixture",
    status: 200,
    contentType: "text/html",
    bytes: new TextEncoder().encode(html),
    retryCount: 0,
    retrievedAt: new Date("2026-09-16T00:00:00Z"),
  };
}

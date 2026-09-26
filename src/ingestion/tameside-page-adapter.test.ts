// @vitest-environment node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { FetchedSourcePage } from "@/ingestion/bounded-fetch";
import { tamesideSourceManifest, type SourcePageKey } from "@/ingestion/source-manifest";
import { extractTamesidePage } from "@/ingestion/tameside-page-adapter";

const keys = Object.keys(tamesideSourceManifest) as SourcePageKey[];

describe("Tameside reviewed-page adapter", () => {
  it.each(keys)("extracts %s from captured live markup with field evidence", async (key) => {
    const fetched = await fixture(key);
    const first = extractTamesidePage(tamesideSourceManifest[key], fetched);
    const replay = extractTamesidePage(tamesideSourceManifest[key], fetched);

    expect(first.outcome).toBe("candidate");
    expect(replay).toEqual(first);
    if (first.outcome !== "candidate") return;
    expect(first.canonicalContentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.normalizedPayload.slug).toBe(key);
    expect(first.normalizedPayload.providerName).toBe("Tameside Metropolitan Borough Council");
    expect(first.normalizedPayload.actions).toEqual([
      {
        kind: "authoritative_details",
        label: "Check current details on the council website",
        url: tamesideSourceManifest[key].canonicalUrl,
      },
    ]);
    expect(first.evidence.map((item) => item.fieldPath)).toEqual(
      expect.arrayContaining(["name", "description", "area", "access"]),
    );
    for (const item of first.evidence) expect(item.normalizedExcerpt.trim()).not.toBe("");
    expect(JSON.stringify(first.normalizedPayload)).not.toContain("Unrelated navigation");
  });

  it("reads section text from the reviewed heading only", async () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["crisis-payments"],
      await fixture("crisis-payments"),
    );
    if (result.outcome !== "candidate") throw new Error("Expected candidate fixture");

    expect(result.normalizedPayload.name).toBe("Crisis Payments");
    expect(result.normalizedPayload.description).toMatch(/^Crisis Payments are funded by the UK Government/);
    expect(result.normalizedPayload.access).toMatch(/^Online: You can apply online/);
    expect(result.normalizedPayload.access).not.toContain("Evidence you need to provide");
    expect(result.evidence.find((item) => item.fieldPath === "access")?.sourceLocator).toBe(
      'article section "How to apply" (6 line max)',
    );
  });

  it("splits bare text separated by line breaks into lines", async () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["equipment-and-adaptations"],
      await fixture("equipment-and-adaptations"),
    );
    if (result.outcome !== "candidate") throw new Error("Expected candidate fixture");

    expect(result.normalizedPayload.description).toMatch(/^If you’re struggling to live independently/);
    expect(result.normalizedPayload.description).not.toContain("Assessing for care and support");
  });

  it("publishes reviewed wording only while the page still confirms it", async () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["welfare-rights"],
      await fixture("welfare-rights"),
    );
    if (result.outcome !== "candidate") throw new Error("Expected candidate fixture");

    expect(result.normalizedPayload.cost).toBe("Free");
    expect(result.evidence.find((item) => item.fieldPath === "cost")?.normalizedExcerpt).toBe(
      "confidential and free",
    );

    const withoutConfirmation = (await readFixture("welfare-rights")).replace(
      "advise Tameside residents",
      "advise people",
    );
    expect(
      extractTamesidePage(tamesideSourceManifest["welfare-rights"], fetchedFrom(withoutConfirmation)),
    ).toEqual({
      outcome: "rejected",
      code: "missing_required_field",
      reason: "Reviewed locator for area was absent or empty",
    });
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

  it("rejects a changed page shape without deleting or inventing fields", () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["debt-advice"],
      fetchedFrom("<main><h1>Debt Advice</h1><p>Layout changed</p></main>"),
    );

    expect(result).toEqual({
      outcome: "rejected",
      code: "missing_required_field",
      reason: "Reviewed locator for name was absent or empty",
    });
  });

  it("rejects a renamed section heading", async () => {
    const renamed = (await readFixture("housing-payments")).replace(
      "What are Housing Payments?",
      "About this scheme",
    );

    expect(
      extractTamesidePage(tamesideSourceManifest["housing-payments"], fetchedFrom(renamed)),
    ).toMatchObject({ outcome: "rejected", reason: "Reviewed locator for description was absent or empty" });
  });

  it("fails safely on invalid UTF-8", () => {
    const result = extractTamesidePage(
      tamesideSourceManifest["crisis-payments"],
      { ...fetchedFrom(""), bytes: new Uint8Array([0xc3, 0x28]) },
    );

    expect(result).toMatchObject({ outcome: "failed", code: "invalid_encoding" });
  });

  it("never extracts form, script or excluded content", async () => {
    const html = (await readFixture("welfare-rights")).replace(
      "<h2>",
      '<form><input value="never extract applicant data"></form><script>ignore()</script><p data-exclude>Excluded partner text</p><h2>',
    );
    const result = extractTamesidePage(tamesideSourceManifest["welfare-rights"], fetchedFrom(html));

    expect(result.outcome).toBe("candidate");
    expect(JSON.stringify(result)).not.toMatch(/applicant data|ignore\(\)|Excluded partner text/);
  });
});

function readFixture(key: SourcePageKey): Promise<string> {
  return readFile(fileURLToPath(new URL(`./fixtures/${key}.html`, import.meta.url)), "utf8");
}

async function fixture(key: SourcePageKey): Promise<FetchedSourcePage> {
  return fetchedFrom(await readFixture(key));
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

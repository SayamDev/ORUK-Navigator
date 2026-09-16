import { describe, expect, it } from "vitest";

import { normaliseNeed, searchPrototypeServices } from "./search";

describe("normaliseNeed", () => {
  it("normalises Unicode and collapses whitespace", () => {
    expect(normaliseNeed("  debt\u00a0\u00a0advice  ")).toBe("debt advice");
  });

  it("rejects a need longer than 240 characters without truncating it", () => {
    expect(() => normaliseNeed("a".repeat(241))).toThrowError(
      "Describe what you need in 240 characters or fewer.",
    );
  });
});

describe("searchPrototypeServices", () => {
  it("returns reviewed debt services with field-backed reasons", () => {
    const results = searchPrototypeServices("money and debt advice");

    expect(results.map((result) => result.slug)).toEqual([
      "welfare-rights",
      "debt-advice",
      "crisis-payments",
    ]);
    expect(results[0]?.matchReasons).toContain(
      "The service description mentions debt advice.",
    );
  });

  it("does not invent a match when the limited catalogue has none", () => {
    expect(searchPrototypeServices("pet grooming")).toEqual([]);
  });
});

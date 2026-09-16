import { describe, expect, it } from "vitest";

import type { CatalogueService } from "@/domain/catalogue";

import { normaliseNeed, searchCatalogueServices } from "./search";

const services: CatalogueService[] = [
  service("welfare-rights", "Welfare Rights", "Free advice about benefits, debt and related support."),
  service("debt-advice", "Debt Advice", "Council debt advice, including mortgage and rent arrears."),
  service("crisis-payments", "Crisis Payments", "Short-term help during an immediate financial crisis."),
  service("tameside-homelessness-service", "Tameside Homelessness Service", "Help when homeless or at risk of losing a home."),
  service("adult-mental-health-services", "Adult Mental Health Services", "Adult social-care mental-health support."),
];

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

describe("searchCatalogueServices", () => {
  it("returns reviewed debt services with field-backed reasons", () => {
    const results = searchCatalogueServices("money and debt advice", services);

    expect(results.map((result) => result.slug)).toEqual([
      "welfare-rights",
      "debt-advice",
      "crisis-payments",
    ]);
    expect(results[0]?.matchReasons).toContain(
      "The reviewed service information mentions debt support.",
    );
  });

  it("does not invent a match when the limited catalogue has none", () => {
    expect(searchCatalogueServices("pet grooming", services)).toEqual([]);
  });
});

function service(slug: string, name: string, description: string): CatalogueService {
  return {
    publicId: slug,
    slug,
    name,
    description,
    providerName: "Tameside Metropolitan Borough Council",
    sourceStatus: "healthy",
    sourceCheckedAt: "2026-09-15T22:09:00Z",
    costSummary: null,
    accessSummary: "Check the council source.",
    serviceArea: "Tameside",
    completenessBand: "partial",
    contacts: [],
    actions: [],
  };
}

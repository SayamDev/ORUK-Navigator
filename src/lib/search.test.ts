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
  it("leads with the homelessness service for everyday eviction wording", () => {
    const published = [
      ...services,
      service(
        "housing-payments",
        "Housing Payments",
        "Discretionary council payments towards housing costs, such as rent shortfalls, deposits or rent in advance.",
      ),
    ];
    const results = searchCatalogueServices(
      "my landlord is kicking me out and i cant pay rent",
      published,
    );

    expect(results[0]?.slug).toBe("tameside-homelessness-service");
    expect(results[0]?.matchReasons).toContain(
      "The reviewed service information mentions help for people at risk of losing their home.",
    );
    expect(results.map((result) => result.slug)).toContain("housing-payments");
  });

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

  it("matches words at word starts only", () => {
    const current = [service("current-only", "Current Service", "Check current details with the council.")];

    expect(searchCatalogueServices("rent", current)).toEqual([]);
    expect(searchCatalogueServices("mortgage", services).map((result) => result.slug)).toEqual(["debt-advice"]);
  });

  it("ranks a service named for the need above equally relevant services", () => {
    const carers = [
      service("advice-hub", "Advice Hub", "Advice for carers and people who look after someone."),
      service("carers-centre", "Carers Centre", "Support for people who look after someone."),
    ];

    expect(searchCatalogueServices("carer", carers).map((result) => result.slug)).toEqual([
      "carers-centre",
      "advice-hub",
    ]);
  });

  it("does not treat a financial assessment as financial support", () => {
    const equipment = [service("equipment", "Equipment", "Major adaptations may involve a financial assessment.")];

    expect(searchCatalogueServices("money", equipment)).toEqual([]);
  });

  it("ignores filler words such as 'as' that appear in unrelated services", () => {
    const unrelated = [service("equipment", "Equipment", "Adaptations such as grab rails.")];

    expect(searchCatalogueServices("support as a carer", unrelated)).toEqual([]);
  });

  it("explains every reviewed concept in plain language", () => {
    const carers = [service("carers", "Carers Centre", "Support for people who look after someone.")];

    expect(searchCatalogueServices("I look after someone", carers)[0]?.matchReasons).toEqual([
      "The reviewed service information mentions support for carers.",
    ]);
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

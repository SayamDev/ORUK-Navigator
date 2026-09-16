import { describe, expect, it } from "vitest";

import { searchEvaluationCases } from "@/data/search-evaluation";
import { prototypeServices } from "@/data/prototype-services";
import type { CatalogueService } from "@/domain/catalogue";
import { searchCatalogueServices } from "./search";

const reviewedServices: CatalogueService[] = prototypeServices.map((service) => ({
  publicId: service.slug,
  slug: service.slug,
  name: service.name,
  description: `${service.summary} ${service.searchableText}`,
  providerName: service.publisher,
  sourceStatus: "healthy",
  sourceCheckedAt: "2026-09-15T22:09:00Z",
  costSummary: service.cost ?? null,
  accessSummary: service.accessSummary,
  serviceArea: service.serviceArea,
  completenessBand: "partial",
  contacts: [],
  actions: [],
}));

describe("deterministic search evaluation", () => {
  for (const evaluation of searchEvaluationCases) {
    it(`${evaluation.id}: retrieves every expected service within the first three results`, () => {
      const actual = searchCatalogueServices(evaluation.query, reviewedServices)
        .slice(0, 3)
        .map(({ slug }) => slug);
      expect(actual).toEqual(expect.arrayContaining(evaluation.expectedSlugs));
      if (evaluation.expectedSlugs.length === 0) expect(actual).toEqual([]);
    });
  }
});

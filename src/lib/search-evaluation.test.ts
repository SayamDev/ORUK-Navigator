import { describe, expect, it } from "vitest";

import { searchEvaluationCases } from "@/data/search-evaluation";
import { searchPrototypeServices } from "./search";

describe("deterministic search evaluation", () => {
  for (const evaluation of searchEvaluationCases) {
    it(`${evaluation.id}: retrieves every expected service within the first three results`, () => {
      const actual = searchPrototypeServices(evaluation.query).slice(0, 3).map(({ slug }) => slug);
      expect(actual).toEqual(expect.arrayContaining(evaluation.expectedSlugs));
      if (evaluation.expectedSlugs.length === 0) expect(actual).toEqual([]);
    });
  }
});

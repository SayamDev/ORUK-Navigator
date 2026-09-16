import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchExperience } from "./search-experience";
import type { CatalogueService } from "@/domain/catalogue";

const service: CatalogueService = {
  publicId: "fixture",
  slug: "fixture",
  name: "Fixture service",
  description: "Fixture description",
  providerName: "Fixture provider",
  sourceStatus: "healthy",
  sourceCheckedAt: "2026-09-15T22:09:00Z",
  costSummary: null,
  accessSummary: "Check the source.",
  serviceArea: "Tameside",
  completenessBand: "partial",
  contacts: [],
  actions: [],
};

describe("SearchExperience", () => {
  it("explains scope and labels both search fields", () => {
    render(<SearchExperience services={[service]} />);

    expect(screen.getByRole("heading", { name: "Find support in Tameside" })).toBeInTheDocument();
    expect(screen.getByLabelText("What support are you looking for?")).toBeInTheDocument();
    expect(screen.getByLabelText("Where do you need support?")).toBeInTheDocument();
    expect(screen.getByText(/five reviewed Tameside services/i)).toBeInTheDocument();
  });
});

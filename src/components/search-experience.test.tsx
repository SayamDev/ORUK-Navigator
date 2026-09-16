import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchExperience } from "./search-experience";

describe("SearchExperience", () => {
  it("explains scope and labels both search fields", () => {
    render(<SearchExperience />);

    expect(screen.getByRole("heading", { name: "Find support in Tameside" })).toBeInTheDocument();
    expect(screen.getByLabelText("What support are you looking for?")).toBeInTheDocument();
    expect(screen.getByLabelText("Where do you need support?")).toBeInTheDocument();
    expect(screen.getByText(/five reviewed Tameside services/i)).toBeInTheDocument();
  });
});

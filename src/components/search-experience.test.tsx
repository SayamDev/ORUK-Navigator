import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { SearchExperience } from "./search-experience";
import type { CatalogueService } from "@/domain/catalogue";

const service: CatalogueService = {
  publicId: "fixture",
  slug: "fixture",
  name: "Fixture service",
  description: "Reviewed debt and money advice.",
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

afterEach(cleanup);

describe("SearchExperience", () => {
  it("explains scope and labels both search fields", () => {
    const { container } = render(<SearchExperience services={[service]} />);

    expect(screen.getByRole("heading", { name: "Find support in Tameside" })).toBeInTheDocument();
    expect(screen.getByLabelText("What support are you looking for?")).toBeInTheDocument();
    expect(screen.getByLabelText("Town or postcode (optional)")).toBeInTheDocument();
    expect(screen.getByText(/small, reviewed selection of Tameside Council information/i)).toBeInTheDocument();
    expect(screen.getByText(/does not include every Tameside service/i)).toBeInTheDocument();
    expect(container.querySelector(".coverage-panel")).not.toBeInTheDocument();
    expect(container.querySelector(".route-signature")).toBeInTheDocument();
  });

  it("keeps support types out of the default layout and reveals them on request", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    expect(screen.queryByText("Common searches")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Benefits and money advice" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Browse support types" }));

    expect(screen.getByText("Support types in this pilot")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Benefits and money advice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Housing and homelessness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adult mental health" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Benefits and money advice" })).toHaveFocus();
  });

  it("suggests relevant searches while the user types and lets them choose one", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    const need = screen.getByLabelText("What support are you looking for?");
    await user.type(need, "money");

    expect(screen.getByText('Suggestions for "money"')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Benefits and money advice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Debt and arrears" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Emergency financial help" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adult mental health" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Benefits and money advice" }));

    expect(need).toHaveValue("I need help with money and debt advice");
    expect(need).toHaveFocus();
    expect(screen.getByRole("button", { name: "Benefits and money advice" })).toBeInTheDocument();
  });

  it("searches repository records without placing the need or place in the address", async () => {
    const user = userEvent.setup();
    const originalUrl = window.location.href;
    render(<SearchExperience services={[service]} />);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    await user.click(screen.getByRole("button", { name: /find support/i }));

    expect(await screen.findByRole("heading", { name: "Support that may help" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fixture service" })).toBeInTheDocument();
    expect(window.location.href).toBe(originalUrl);
    expect(window.location.href).not.toContain("debt");
    expect(window.location.href).not.toContain("Ashton");
  });

  it("rejects a place outside the pilot and links the error to the place field", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    const place = screen.getByLabelText("Town or postcode (optional)");
    await user.type(place, "Lancaster");
    await user.click(screen.getByRole("button", { name: /find support/i }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("currently covers Tameside");
    expect(screen.getByRole("link", { name: /currently covers Tameside/i })).toHaveAttribute(
      "href",
      "#place",
    );
  });

  it("discloses degraded source health without claiming the service is closed", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[{ ...service, sourceStatus: "unreachable" }]} />);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    await user.click(screen.getByRole("button", { name: /find support/i }));

    expect(await screen.findByText(/source could not be reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/service is closed/i)).not.toBeInTheDocument();
  });
});

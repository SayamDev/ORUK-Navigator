import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    expect(screen.getByLabelText("Where do you need support?")).toBeInTheDocument();
    expect(screen.getByText(/1 reviewed Tameside service is included/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What this pilot can help with" })).toBeInTheDocument();
    expect(screen.getByText(/Limited pilot: 1 reviewed Tameside service/i)).toBeInTheDocument();
    expect(container.querySelector(".search-layout")?.children[0]).toHaveAttribute("id", "find-support");
    expect(container.querySelector(".route-motif")).not.toBeInTheDocument();
  });

  it("shows common searches before the user knows what to type", () => {
    render(<SearchExperience services={[service]} />);

    expect(screen.getByText("Common searches")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Benefits and money advice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Housing and homelessness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adult mental health" })).toBeInTheDocument();
  });

  it("lets narrow-screen visitors reveal the full topic list", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    const toggle = screen.getByRole("button", { name: "See all 8 support topics" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Show fewer topics" })).toHaveAttribute("aria-expanded", "true");
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
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    render(<SearchExperience services={[service]} />);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    await user.click(screen.getByRole("button", { name: /find support/i }));

    expect(await screen.findByRole("heading", { name: "Support that may help" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fixture service" })).toBeInTheDocument();
    expect(window.location.href).toBe(originalUrl);
    expect(window.location.href).not.toContain("debt");
    expect(window.location.href).not.toContain("Ashton");
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });
  });

  it("starts with an empty optional place and accepts a typed Tameside postcode", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    const place = screen.getByLabelText("Where do you need support?");
    expect(place).toHaveValue("");
    expect(place).toHaveAccessibleDescription(/Optional\. Enter a Tameside town or postcode/);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    await user.type(place, "OL6 6AA");
    await user.click(screen.getByRole("button", { name: /find support/i }));

    expect(place).toHaveValue("OL6 6AA");
    expect(await screen.findByRole("heading", { name: "Support that may help" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a place outside the pilot and links the error to the place field", async () => {
    const user = userEvent.setup();
    render(<SearchExperience services={[service]} />);

    await user.type(screen.getByLabelText("What support are you looking for?"), "debt advice");
    const place = screen.getByLabelText("Where do you need support?");
    await user.clear(place);
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

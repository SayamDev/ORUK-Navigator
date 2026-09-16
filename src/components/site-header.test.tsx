import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

afterEach(cleanup);

describe("SiteHeader", () => {
  it("uses the approved text wordmark and section navigation", () => {
    const { container } = render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "ORUK Navigator" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "/#how-it-works",
    );
    expect(screen.getByRole("link", { name: "Data sources" })).toHaveAttribute(
      "href",
      "/about#data-sources",
    );
    expect(screen.getByRole("link", { name: "About this pilot" })).toHaveAttribute(
      "href",
      "/about#about-this-pilot",
    );
    expect(container.querySelector(".wordmark-mark")).not.toBeInTheDocument();
  });
});

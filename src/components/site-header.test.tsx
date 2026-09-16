import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SiteHeader } from "./site-header";

afterEach(cleanup);

describe("SiteHeader", () => {
  it("links Find support directly to the search form", () => {
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: "Find support" })).toHaveAttribute(
      "href",
      "/#find-support",
    );
  });
});

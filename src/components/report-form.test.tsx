import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportForm } from "./report-form";

describe("ReportForm", () => {
  it("offers explicit problem choices and privacy guidance", () => {
    render(<ReportForm serviceName="Welfare Rights" />);

    expect(screen.getByRole("group", { name: "What is wrong?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contact details are wrong")).toBeInTheDocument();
    expect(screen.getByText(/do not include personal or sensitive information/i)).toBeInTheDocument();
  });
});

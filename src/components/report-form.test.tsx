import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportForm } from "./report-form";

describe("ReportForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("offers explicit problem choices and privacy guidance", () => {
    render(<ReportForm serviceName="Welfare Rights" entryPublicId="c4d7032a-9f33-4bcb-9c21-84c952ef82db" />);

    expect(screen.getByRole("group", { name: "What is wrong?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contact details are wrong")).toBeInTheDocument();
    expect(screen.getByText(/do not include personal or sensitive information/i)).toBeInTheDocument();
  });

  it("submits the server-owned entry identifier and shows the random reference", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ reference: "f53b92f6-39d3-4296-8473-aeeb2dd66289" }),
      { status: 201, headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);
    render(<ReportForm serviceName="Welfare Rights" entryPublicId="c4d7032a-9f33-4bcb-9c21-84c952ef82db" />);

    await user.click(screen.getByLabelText("Service information is out of date"));
    await user.type(screen.getByLabelText(/tell us more/i), "Publisher page changed.");
    await user.click(screen.getByRole("button", { name: "Send report" }));

    expect(await screen.findByText(/f53b92f6-39d3-4296-8473-aeeb2dd66289/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/corrections", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("c4d7032a-9f33-4bcb-9c21-84c952ef82db"),
    }));
  });
});

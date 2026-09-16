import { describe, expect, it } from "vitest";

import { validateReport } from "./report";

describe("validateReport", () => {
  it("requires one reviewed problem type", () => {
    expect(validateReport({ problem: "", details: "" })).toEqual({
      problem: "Select what is wrong.",
    });
  });

  it("rejects details over the bounded prototype limit", () => {
    expect(
      validateReport({ problem: "incorrect", details: "a".repeat(1001) }),
    ).toEqual({
      details: "Describe what we should check in 1,000 characters or fewer.",
    });
  });

  it("accepts a report without optional details", () => {
    expect(validateReport({ problem: "outdated", details: "" })).toEqual({});
  });
});

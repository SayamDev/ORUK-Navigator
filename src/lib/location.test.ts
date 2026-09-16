import { describe, expect, it } from "vitest";

import { classifyPilotLocation } from "@/lib/location";

describe("classifyPilotLocation", () => {
  it.each(["Ashton-under-Lyne", "ashton under lyne", "Tameside", "OL6 6BH", "SK15 2AA"])(
    "classifies %s coarsely inside the pilot without retaining the input",
    (value) => {
      expect(classifyPilotLocation(value)).toEqual({
        kind: "tameside",
        label: "Tameside pilot area",
      });
    },
  );

  it("rejects places outside the limited pilot honestly", () => {
    expect(() => classifyPilotLocation("Lancaster")).toThrow("currently covers Tameside");
  });
});

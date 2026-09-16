import { describe, expect, it } from "vitest";

import { publicCorrectionsAreEnabled } from "./corrections-availability";

describe("publicCorrectionsAreEnabled", () => {
  it("keeps corrections disabled unless the launch flag, fallback owner and review hours are all configured", () => {
    expect(publicCorrectionsAreEnabled({})).toBe(false);
    expect(publicCorrectionsAreEnabled({ PUBLIC_CORRECTIONS_ENABLED: "true" })).toBe(false);
    expect(publicCorrectionsAreEnabled({
      PUBLIC_CORRECTIONS_ENABLED: "true",
      CORRECTIONS_FALLBACK_OWNER: "Fallback maintainer",
    })).toBe(false);
  });

  it("enables corrections only for the exact true flag with named operational coverage", () => {
    expect(publicCorrectionsAreEnabled({
      PUBLIC_CORRECTIONS_ENABLED: "true",
      CORRECTIONS_FALLBACK_OWNER: "Fallback maintainer",
      CORRECTIONS_REVIEW_HOURS: "Weekdays 09:00-17:00 Europe/London",
    })).toBe(true);
    expect(publicCorrectionsAreEnabled({
      PUBLIC_CORRECTIONS_ENABLED: "TRUE",
      CORRECTIONS_FALLBACK_OWNER: "Fallback maintainer",
      CORRECTIONS_REVIEW_HOURS: "Weekdays 09:00-17:00 Europe/London",
    })).toBe(false);
  });
});

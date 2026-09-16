import { describe, expect, it } from "vitest";

import { parseCorrectionRequest } from "./validation";

const entryPublicId = "c4d7032a-9f33-4bcb-9c21-84c952ef82db";

describe("parseCorrectionRequest", () => {
  it("normalizes a bounded correction without retaining blank text", () => {
    expect(
      parseCorrectionRequest({ entryPublicId, category: "wrong-service", detail: "  ℌello  " }),
    ).toEqual({ entryPublicId, category: "wrong_service", detail: "Hello", honeypotTriggered: false });
  });

  it("rejects unknown identifiers, categories, and overlong Unicode text", () => {
    expect(parseCorrectionRequest({ entryPublicId: "7", category: "other", detail: "" })).toBeNull();
    expect(parseCorrectionRequest({ entryPublicId, category: "urgent", detail: "" })).toBeNull();
    expect(parseCorrectionRequest({ entryPublicId, category: "other", detail: "😀".repeat(1001) })).toBeNull();
  });

  it("detects the hidden automation field", () => {
    expect(parseCorrectionRequest({ entryPublicId, category: "other", detail: "", website: "bot" })).toMatchObject({ honeypotTriggered: true });
  });
});

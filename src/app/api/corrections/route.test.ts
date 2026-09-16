import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

describe("POST /api/corrections", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed before processing a report when operational coverage is not configured", async () => {
    vi.stubEnv("PUBLIC_CORRECTIONS_ENABLED", "false");
    vi.stubEnv("CORRECTIONS_FALLBACK_OWNER", "");
    vi.stubEnv("CORRECTIONS_REVIEW_HOURS", "");

    const response = await POST(new NextRequest("http://localhost/api/corrections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entryPublicId: "00000000-0000-4000-8000-000000000000",
        category: "other",
        detail: "Synthetic test only",
      }),
    }));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Corrections are not currently available." });
  });
});

// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { resolveApprovedPageForCheck, runTamesideBatch } = vi.hoisted(() => ({
  resolveApprovedPageForCheck: vi.fn(),
  runTamesideBatch: vi.fn(),
}));
vi.mock("@/server/repositories", () => ({
  getIngestionRepository: () => ({ resolveApprovedPageForCheck }),
}));
vi.mock("@/ingestion/run-batch", () => ({ runTamesideBatch }));

import { POST } from "./route";

const secret = "a-valid-operations-secret-of-at-least-32-characters";

describe("scheduled source-check endpoint", () => {
  beforeEach(() => {
    process.env.OPERATIONS_MAINTENANCE_SECRET = secret;
    resolveApprovedPageForCheck.mockReset();
    runTamesideBatch.mockReset();
  });
  afterEach(() => {
    delete process.env.OPERATIONS_MAINTENANCE_SECRET;
  });

  it("rejects an unauthenticated request before accessing the database", async () => {
    const response = await POST(request("crisis-payments", false));
    expect(response.status).toBe(401);
    expect(resolveApprovedPageForCheck).not.toHaveBeenCalled();
  });

  it("rejects a source key outside the approved manifest", async () => {
    const response = await POST(request("unknown-source"));
    expect(response.status).toBe(400);
    expect(resolveApprovedPageForCheck).not.toHaveBeenCalled();
  });

  it("does not fetch a page disabled in the repository", async () => {
    resolveApprovedPageForCheck.mockResolvedValue(null);
    const response = await POST(request("crisis-payments"));
    expect(response.status).toBe(409);
    expect(runTamesideBatch).not.toHaveBeenCalled();
  });

  it("runs one approved source as a scheduled, review-only batch", async () => {
    resolveApprovedPageForCheck.mockResolvedValue({ sourcePageId: "1", previousCanonicalHash: "abc" });
    runTamesideBatch.mockResolvedValue({ runPublicId: "run-1", status: "succeeded" });
    const response = await POST(request("crisis-payments"));
    expect(response.status).toBe(200);
    expect(runTamesideBatch).toHaveBeenCalledWith(expect.objectContaining({
      trigger: "scheduled",
      pages: [expect.objectContaining({ sourcePageId: "1", previousCanonicalHash: "abc" })],
    }));
    expect(await response.json()).toEqual({ runPublicId: "run-1", status: "succeeded" });
  });
});

function request(sourceKey: string, authorized = true): NextRequest {
  return new NextRequest("http://localhost/api/operations/source-check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorized ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({ sourceKey }),
  });
}

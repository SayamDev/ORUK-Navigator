// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { repository } = vi.hoisted(() => ({
  repository: {
    findPendingReviewCandidate: vi.fn(),
    approveCandidate: vi.fn(),
    projectPublication: vi.fn(),
    recordDisposition: vi.fn(),
  },
}));
vi.mock("@/server/repositories", () => ({ getIngestionRepository: () => repository }));

import { POST } from "./route";

const secret = "review-only-secret-with-at-least-thirty-two-characters";
const candidateHash = "a".repeat(64);

describe("private review decision", () => {
  beforeEach(() => {
    process.env.REVIEW_WORKFLOW_SECRET = secret;
    process.env.OPERATIONS_MAINTENANCE_SECRET = "different-maintenance-secret-with-32-characters";
    vi.clearAllMocks();
    repository.findPendingReviewCandidate.mockResolvedValue(candidate());
    repository.approveCandidate.mockResolvedValue({ publicationId: "44", versionNumber: 2 });
  });
  afterEach(() => {
    delete process.env.REVIEW_WORKFLOW_SECRET;
    delete process.env.OPERATIONS_MAINTENANCE_SECRET;
  });

  it("does not accept the maintenance secret or an absent review secret", async () => {
    expect((await POST(request({}, false))).status).toBe(401);
    expect(repository.findPendingReviewCandidate).not.toHaveBeenCalled();
    process.env.REVIEW_WORKFLOW_SECRET = process.env.OPERATIONS_MAINTENANCE_SECRET;
    expect((await POST(request())).status).toBe(401);
  });

  it("rejects an unconfirmed or outdated candidate hash", async () => {
    const response = await POST(request({ expectedHash: "b".repeat(64) }));
    expect(response.status).toBe(409);
    expect(repository.approveCandidate).not.toHaveBeenCalled();
  });

  it("refuses approval when the latest source check is invalid", async () => {
    repository.findPendingReviewCandidate.mockResolvedValue(candidate({ sourceHealth: "invalid" }));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(repository.approveCandidate).not.toHaveBeenCalled();
  });

  it("refuses a candidate without field-level source evidence", async () => {
    repository.findPendingReviewCandidate.mockResolvedValue(candidate({ hasRequiredEvidence: false }));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(repository.approveCandidate).not.toHaveBeenCalled();
  });

  it("approves a matching candidate and projects its new publication", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(repository.approveCandidate).toHaveBeenCalledWith(expect.objectContaining({
      candidateId: "12",
      entrySlug: "crisis-payments",
      reviewer: "GitHub:SayamDev",
      publication: expect.objectContaining({ authoritativeSourceUrl: "https://www.tameside.gov.uk/crisis-payments" }),
    }));
    expect(repository.projectPublication).toHaveBeenCalledWith("44");
  });

  it("records a rejection without publishing", async () => {
    const response = await POST(request({ decision: "rejected" }));
    expect(response.status).toBe(200);
    expect(repository.recordDisposition).toHaveBeenCalledWith(expect.objectContaining({ decision: "rejected" }));
    expect(repository.approveCandidate).not.toHaveBeenCalled();
  });
});

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: "12",
    sourceKey: "crisis-payments",
    canonicalUrl: "https://www.tameside.gov.uk/crisis-payments",
    sourceHealth: "changed",
    candidateHash,
    adapterVersion: "tameside-html-v1",
    rulesVersion: "reviewed-pages-v1",
    normalizedPayload: {
      slug: "crisis-payments",
      name: "Crisis Payments",
      description: "Short-term help after an unexpected financial shock.",
      providerName: "Tameside Metropolitan Borough Council",
      area: "Tameside residents",
      access: "Check the council source page for current details.",
    },
    retrievedAt: "2026-09-24T11:00:00Z",
    isContractValid: true,
    hasRequiredEvidence: true,
    sourceApproved: true,
    isLatestCheck: true,
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}, authorized = true): NextRequest {
  return new NextRequest("http://localhost/api/operations/review", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authorized ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      candidateId: "12",
      decision: "approved",
      expectedHash: candidateHash,
      reviewer: "SayamDev",
      reason: "I checked each field against the current council source page.",
      ...overrides,
    }),
  });
}

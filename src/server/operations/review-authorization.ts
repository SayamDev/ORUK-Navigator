import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function isAuthorizedReviewRequest(request: NextRequest): boolean {
  const expected = process.env.REVIEW_WORKFLOW_SECRET;
  const maintenance = process.env.OPERATIONS_MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 32 || expected.startsWith("replace-with-") || !supplied || expected === maintenance) {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

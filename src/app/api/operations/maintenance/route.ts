import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOperationsRepository } from "@/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Not authorized." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const operations = getOperationsRepository();
  const alerts = await operations.reconcileSourceAlerts(randomUUID());
  const retention = await operations.runRetention(randomUUID());
  return NextResponse.json(
    { status: "completed", alerts, retention },
    { headers: { "cache-control": "no-store" } },
  );
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.OPERATIONS_MAINTENANCE_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 32 || expected.startsWith("replace-with-") || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

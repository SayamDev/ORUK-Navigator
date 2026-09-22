import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOperationsRepository } from "@/server/repositories";
import { isAuthorizedOperationsRequest } from "@/server/operations/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isAuthorizedOperationsRequest(request)) {
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

import { createHmac, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { parseCorrectionRequest } from "@/server/corrections/validation";
import { publicCorrectionsAreEnabled } from "@/server/operations/corrections-availability";
import { getOperationsRepository } from "@/server/repositories";
import {
  CorrectionRateLimitError,
  CorrectionTargetError,
} from "@/server/repositories/postgres-operations-repository";

export const runtime = "nodejs";
const maximumBodyBytes = 8_192;

export async function POST(request: NextRequest) {
  const correlationId = randomUUID();
  if (!publicCorrectionsAreEnabled()) {
    return errorResponse("Corrections are not currently available.", 503, correlationId);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse("Request must be JSON.", 415, correlationId);
  }

  const declaredSize = Number(request.headers.get("content-length") ?? "0");
  if (declaredSize > maximumBodyBytes) return errorResponse("Request is too large.", 413, correlationId);

  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maximumBodyBytes) {
      return errorResponse("Request is too large.", 413, correlationId);
    }
    body = JSON.parse(text);
  } catch {
    return errorResponse("Check the report and try again.", 400, correlationId);
  }

  const input = parseCorrectionRequest(body);
  if (!input) return errorResponse("Check the report and try again.", 400, correlationId);

  if (input.honeypotTriggered) {
    return NextResponse.json(
      { reference: randomUUID() },
      { status: 201, headers: responseHeaders(correlationId) },
    );
  }

  try {
    const receipt = await getOperationsRepository().submitCorrection({
      entryPublicId: input.entryPublicId,
      category: input.category,
      detail: input.detail,
      abuseKeyHash: abuseKey(request),
      correlationId,
    });
    return NextResponse.json(receipt, { status: 201, headers: responseHeaders(correlationId) });
  } catch (error) {
    if (error instanceof CorrectionRateLimitError) {
      return errorResponse("Too many reports. Try again later.", 429, correlationId);
    }
    if (error instanceof CorrectionTargetError) {
      return errorResponse("This service is no longer available to report.", 404, correlationId);
    }
    return errorResponse("The report could not be saved. Try again later.", 503, correlationId);
  }
}

function abuseKey(request: NextRequest): string {
  const configuredSecret = process.env.CORRECTION_RATE_LIMIT_SECRET;
  const secret = configuredSecret ??
    (process.env.NODE_ENV === "production" ? "" : "local-development-only-secret");
  if (secret.length < 32 || secret.startsWith("replace-with-")) {
    throw new Error("CORRECTION_RATE_LIMIT_SECRET must contain at least 32 random characters");
  }

  const proxyAddress = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgentFamily = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return createHmac("sha256", secret).update(`${proxyAddress}\u0000${userAgentFamily}`).digest("hex");
}

function errorResponse(message: string, status: number, correlationId: string) {
  return NextResponse.json({ error: message }, { status, headers: responseHeaders(correlationId) });
}

function responseHeaders(correlationId: string) {
  return { "cache-control": "no-store", "x-correlation-id": correlationId };
}

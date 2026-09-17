import { NextResponse } from "next/server";

/**
 * ORUK compliance asks publishers to allow anonymous cross-origin reads. The feed exposes
 * only reviewed public catalogue facts, so a wildcard origin is appropriate here and nowhere else.
 */
const feedHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, max-age=300, stale-while-revalidate=3600",
};

export function feedJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: feedHeaders });
}

export function feedError(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { ...feedHeaders, "cache-control": "no-store" } },
  );
}

export function feedPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: feedHeaders });
}

export function positiveInteger(value: string | null, fallback: number): number {
  if (value === null || !/^\d{1,6}$/.test(value)) return fallback;
  return Number(value);
}

import { NextRequest, NextResponse } from "next/server";

import { runTamesideBatch } from "@/ingestion/run-batch";
import { tamesideSourceManifest } from "@/ingestion/source-manifest";
import { isAuthorizedOperationsRequest } from "@/server/operations/authorization";
import { getIngestionRepository } from "@/server/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  if (!isAuthorizedOperationsRequest(request)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A source key is required." }, { status: 400, headers });
  }
  const key = typeof body === "object" && body !== null && "sourceKey" in body
    ? body.sourceKey : undefined;
  if (typeof key !== "string" || !Object.hasOwn(tamesideSourceManifest, key)) {
    return NextResponse.json({ error: "Unknown source key." }, { status: 400, headers });
  }
  const source = tamesideSourceManifest[key as keyof typeof tamesideSourceManifest];
  const repository = getIngestionRepository();
  const page = await repository.resolveApprovedPageForCheck(key, source.canonicalUrl);
  if (!page) {
    return NextResponse.json({ error: "Source is not approved for checking." }, { status: 409, headers });
  }

  const result = await runTamesideBatch({
    pages: [{ source, ...page }],
    repository,
    trigger: "scheduled",
  });
  return NextResponse.json(result, { status: result.status === "failed" ? 502 : 200, headers });
}

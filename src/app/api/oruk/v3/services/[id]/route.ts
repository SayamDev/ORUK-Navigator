import type { NextRequest } from "next/server";

import { feedError, feedJson, feedPreflight } from "@/oruk/http";
import { toOrukService } from "@/oruk/service-mapper";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const service = await getCatalogueRepository().findActiveByPublicId(id);
    if (!service) return feedError("Service not found", 404);
    return feedJson(toOrukService(service));
  } catch {
    return feedError("The service feed is temporarily unavailable", 503);
  }
}

export function OPTIONS() {
  return feedPreflight();
}

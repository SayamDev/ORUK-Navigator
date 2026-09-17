import type { NextRequest } from "next/server";

import { feedError, feedJson, feedPreflight } from "@/oruk/http";
import { publisherId, toOrukOrganization } from "@/oruk/service-mapper";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (id !== publisherId) return feedError("Organization not found", 404);

  try {
    return feedJson(toOrukOrganization(await getCatalogueRepository().listActive()));
  } catch {
    return feedError("The service feed is temporarily unavailable", 503);
  }
}

export function OPTIONS() {
  return feedPreflight();
}

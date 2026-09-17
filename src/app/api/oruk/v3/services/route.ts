import type { NextRequest } from "next/server";

import { feedError, feedJson, feedPreflight, positiveInteger } from "@/oruk/http";
import { toOrukPage, toOrukServiceListItem } from "@/oruk/service-mapper";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim().toLocaleLowerCase("en-GB") ?? "";
  if (search.length > 240) return feedError("search must be 240 characters or fewer", 400);

  try {
    const services = await getCatalogueRepository().listActive();
    const matching = search
      ? services.filter((service) =>
          `${service.name} ${service.description}`.toLocaleLowerCase("en-GB").includes(search),
        )
      : services;

    return feedJson(
      toOrukPage(
        matching.map(toOrukServiceListItem),
        positiveInteger(params.get("page"), 1),
        positiveInteger(params.get("per_page"), 50),
      ),
    );
  } catch {
    return feedError("The service feed is temporarily unavailable", 503);
  }
}

export function OPTIONS() {
  return feedPreflight();
}

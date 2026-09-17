import type { NextRequest } from "next/server";

import { feedError, feedJson, feedPreflight, positiveInteger } from "@/oruk/http";
import { publisherOrganization, toOrukPage } from "@/oruk/service-mapper";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const search = params.get("search")?.trim().toLocaleLowerCase("en-GB") ?? "";
  if (search.length > 240) return feedError("search must be 240 characters or fewer", 400);

  const organizations = [publisherOrganization].filter((organization) =>
    organization.name.toLocaleLowerCase("en-GB").includes(search),
  );

  return feedJson(
    toOrukPage(
      organizations,
      positiveInteger(params.get("page"), 1),
      positiveInteger(params.get("per_page"), 50),
    ),
  );
}

export function OPTIONS() {
  return feedPreflight();
}

import { feedJson, feedPreflight } from "@/oruk/http";
import { orukOpenApiUrl, orukProfileUrl, orukVersion } from "@/oruk/service-mapper";

export const dynamic = "force-static";

export function GET() {
  return feedJson({
    version: orukVersion,
    profile: orukProfileUrl,
    openapi_url: orukOpenApiUrl,
  });
}

export function OPTIONS() {
  return feedPreflight();
}

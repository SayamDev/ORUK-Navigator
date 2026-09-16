import { SearchExperience } from "@/components/search-experience";
import { getCatalogueRepository } from "@/server/repositories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const services = await getCatalogueRepository().listActive();
  return <SearchExperience services={services} />;
}

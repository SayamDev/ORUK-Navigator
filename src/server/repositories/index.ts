import "server-only";

import { getDatabase } from "@/server/database/client";
import { PostgresCatalogueRepository } from "@/server/repositories/postgres-catalogue-repository";
import { PostgresIngestionRepository } from "@/server/repositories/postgres-ingestion-repository";

export function getCatalogueRepository(): PostgresCatalogueRepository {
  return new PostgresCatalogueRepository(getDatabase());
}

export function getIngestionRepository(): PostgresIngestionRepository {
  return new PostgresIngestionRepository(getDatabase());
}


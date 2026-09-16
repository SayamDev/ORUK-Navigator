import "server-only";

import { getDatabase } from "@/server/database/client";
import { PostgresCatalogueRepository } from "@/server/repositories/postgres-catalogue-repository";
import { PostgresIngestionRepository } from "@/server/repositories/postgres-ingestion-repository";
import { PostgresOperationsRepository } from "@/server/repositories/postgres-operations-repository";

export function getCatalogueRepository(): PostgresCatalogueRepository {
  return new PostgresCatalogueRepository(getDatabase());
}

export function getIngestionRepository(): PostgresIngestionRepository {
  return new PostgresIngestionRepository(getDatabase());
}

export function getOperationsRepository(): PostgresOperationsRepository {
  return new PostgresOperationsRepository(getDatabase());
}

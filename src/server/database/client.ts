import "server-only";

import postgres, { type Sql } from "postgres";

let client: Sql | undefined;

export function getDatabase(): Sql {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required by the server database boundary");
  }

  const configuredPoolSize = Number(process.env.DATABASE_POOL_SIZE ?? "10");
  if (!Number.isInteger(configuredPoolSize) || configuredPoolSize < 1 || configuredPoolSize > 10) {
    throw new Error("DATABASE_POOL_SIZE must be an integer between 1 and 10");
  }
  const prepareSetting = process.env.DATABASE_PREPARE ?? "true";
  if (prepareSetting !== "true" && prepareSetting !== "false") {
    throw new Error("DATABASE_PREPARE must be either true or false");
  }

  client ??= postgres(databaseUrl, {
    max: configuredPoolSize,
    prepare: prepareSetting === "true",
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });

  return client;
}

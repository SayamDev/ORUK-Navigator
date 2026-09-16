import "server-only";

import postgres, { type Sql } from "postgres";

let client: Sql | undefined;

export function getDatabase(): Sql {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required by the server database boundary");
  }

  client ??= postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: postgres.camel,
  });

  return client;
}


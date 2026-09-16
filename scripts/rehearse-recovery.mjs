import { execFileSync } from "node:child_process";

const recoveryDatabase = "oruk_recovery_rehearsal";
const backupPath = "/tmp/oruk-navigator-recovery.dump";
const container = process.env.SUPABASE_DB_CONTAINER ?? findLocalDatabaseContainer();

assertContainerName(container);

try {
  docker("dropdb", "--if-exists", "-U", "postgres", recoveryDatabase);
  docker("createdb", "-U", "postgres", recoveryDatabase);
  docker(
    "pg_dump",
    "-U", "postgres",
    "-d", "postgres",
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--schema=ingest",
    "--schema=catalogue",
    "--schema=operations",
    `--file=${backupPath}`,
  );
  docker(
    "pg_restore",
    "-U", "postgres",
    "--dbname", recoveryDatabase,
    "--no-owner",
    "--no-privileges",
    backupPath,
  );

  const original = counts("postgres");
  const restored = counts(recoveryDatabase);
  if (original !== restored) {
    throw new Error(`Restore count mismatch: original=${original} restored=${restored}`);
  }
  console.log(`Recovery rehearsal passed with counts ${original}.`);
} finally {
  docker("dropdb", "--if-exists", "-U", "postgres", recoveryDatabase);
  docker("rm", "-f", backupPath);
}

function findLocalDatabaseContainer() {
  const names = execFileSync(
    "docker",
    ["ps", "--format", "{{.Names}}", "--filter", "name=supabase_db_"],
    { encoding: "utf8" },
  ).trim().split("\n").filter(Boolean);
  if (names.length !== 1) {
    throw new Error(`Expected exactly 1 local Supabase database container; found ${names.length}.`);
  }
  return names[0];
}

function assertContainerName(value) {
  if (!/^supabase_db_[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("SUPABASE_DB_CONTAINER is not a safe local Supabase container name.");
  }
}

function docker(...args) {
  return execFileSync("docker", ["exec", container, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function counts(database) {
  return docker(
    "psql",
    "-U", "postgres",
    "-d", database,
    "--tuples-only",
    "--no-align",
    "--command",
    `select json_build_object(
      'entries', (select count(*) from catalogue.entries),
      'publications', (select count(*) from catalogue.publications),
      'candidates', (select count(*) from ingest.extraction_candidates),
      'corrections', (select count(*) from operations.correction_reports)
    )::text`,
  );
}

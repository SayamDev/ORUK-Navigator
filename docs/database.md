# Private PostgreSQL development and migration workflow

**Status:** implemented local foundation
**Last verified:** 16 September 2026
**Related:** GitHub issue #14, ADR 0002, `docs/data-model.md`

## Boundary

The local stack uses PostgreSQL 17 through the pinned Supabase CLI. `ingest`, `catalogue`, and `operations` are private schemas and are not listed in the Supabase Data API schemas. Browser-capable components are lint-blocked from importing `src/server`; Next.js server code reaches the database through repository interfaces in `src/domain`.

Only `DATABASE_URL` configures the application connection. It must remain server-only and must never use the `NEXT_PUBLIC_` prefix. The checked-in `.env.example` contains local-development defaults, not a production credential.

## First local run

Requirements: Node.js, pnpm, and Docker Desktop.

```bash
pnpm install
cp .env.example .env.local
pnpm db:start
pnpm db:reset
```

`db:reset` rebuilds the database from migrations and loads the deterministic reviewed Tameside fixtures. These fixtures demonstrate persistence behaviour; they are not a live availability feed.

## Verification commands

```bash
pnpm db:lint
pnpm db:test
pnpm test:repositories
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

- `db:lint` runs PostgreSQL schema checks at error severity.
- `db:test` runs pgTAP contract and integrity checks.
- `test:repositories` resets/seeds local PostgreSQL, then exercises the real TypeScript repository boundary and its transaction rollback behaviour.

The repository test intentionally owns a fresh local reset. Do not point `TEST_DATABASE_URL` at a shared or production database.

## Add a migration

```bash
pnpm exec supabase migration new concise_change_name
```

Write forward-only SQL in the generated file, add or adjust pgTAP coverage, then run a clean reset and the verification commands. Keep migrations deterministic and avoid environment-specific data. Source fixtures belong in `supabase/seed.sql`.

## Migration boundary and recovery rehearsal

Before release, prove both the prior boundary and the complete forward path:

```bash
pnpm exec supabase db reset --local --version 20260916091326 --no-seed
pnpm db:reset
pnpm db:test
pnpm test:repositories
```

The first command reconstructs the schema only through the named earlier migration. The remaining commands reapply every migration, seed known fixtures, and verify database and repository behaviour. This is a local recovery rehearsal, not a destructive rollback technique for a production database.

For a migration already deployed to a shared environment, prefer a new reviewed corrective migration. Never edit an applied migration or reset a shared database to undo it. Take and verify a managed backup before production schema work; production linking and deployment remain part of the later hosting milestone.

## Roles and exposure

- `navigator_catalogue_reader` receives read access only to reviewed catalogue relations.
- `navigator_ingest_writer` receives the narrow ingest/publication privileges needed by controlled jobs.
- `navigator_operations_writer` receives the correction, retention, and alert privileges needed by server-only operations.
- `anon`, `authenticated`, and `public` receive no access to any private schema.
- direct browser database access is intentionally absent.

Production runtime roles will be granted through secret-managed connections when hosting is selected. Do not use the owner connection for ordinary runtime traffic.

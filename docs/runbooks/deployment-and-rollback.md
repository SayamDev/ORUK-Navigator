# Runbook: deploy, verify, and roll back the pilot

**Status:** deployment-ready; production account setup pending
**Target:** Vercel for the Next.js application and a dedicated Supabase PostgreSQL project in a UK region

## Release authority

| Responsibility | Named owner | Status |
| --- | --- | --- |
| Primary maintainer | SayamDev (`@SayamDev`) | Named |
| Fallback maintainer | Must be supplied by the project owner | Launch blocker |
| Monitored correction channel | GitHub Issues with `needs-triage`; account notifications must be enabled | Configuration check required |
| Private security channel | GitHub private vulnerability reporting | Enablement check required |

Do not launch corrections until the fallback owner and staffed review hours are recorded. Do not put personal information, correction free text, database URLs, or secrets in a GitHub issue.

## Why this delivery path

- Vercel provides native Next.js builds, immutable deployments, previews, TLS, and a quick application rollback.
- Supabase provides portable PostgreSQL and runs the committed migrations without introducing a browser database dependency.
- The runtime uses Supabase’s transaction pooler for serverless traffic. Set `DATABASE_POOL_SIZE=1` and `DATABASE_PREPARE=false`, because transaction mode does not support prepared statements.
- Core search remains deterministic and requires no paid AI service.

References: [Vercel Git deployments](https://vercel.com/docs/deployments/git) and [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

## One-time production setup

1. Create a new Supabase project named **ORUK Navigator**. Do not reuse another application’s database. Select a UK region, generate a unique database password, enable the provider’s available backup controls, and record the project reference in the secret manager.
2. Link and apply the forward migrations from a protected operator workstation:

   ```bash
   pnpm exec supabase link --project-ref <oruk-project-ref>
   pnpm exec supabase db push --linked --include-seed
   ```

   Inspect the migration plan before confirming. The deterministic seed is the reviewed five-entry pilot baseline; never use `db reset` against a shared or production project.
3. Copy the Supabase **transaction pooler** URI into Vercel as `DATABASE_URL`. Add:

   ```text
   DATABASE_POOL_SIZE=1
   DATABASE_PREPARE=false
   CORRECTION_RATE_LIMIT_SECRET=<independent random value, at least 32 characters>
   OPERATIONS_MAINTENANCE_SECRET=<different random value, at least 32 characters>
   ```

4. Import `SayamDev/ORUK-Navigator` into Vercel. Keep `main` as production and allow pull requests to create previews. Do not expose any server value with a `NEXT_PUBLIC_` prefix.
5. Deploy a preview from the release pull request. Run the smoke checks below before promoting the same commit to production.
6. Add GitHub Actions secrets:
   - `OPERATIONS_MAINTENANCE_URL`: the production origin, without a trailing slash;
   - `OPERATIONS_MAINTENANCE_SECRET`: the exact Vercel server secret.
7. Manually run **Operations maintenance** once. Confirm count-only output and no authorization value in logs.

## Release gates

The `Release gates` workflow must pass these required jobs:

- `Code quality & security`;
- `Database contracts & repositories`;
- `Browser, accessibility & headers`; and
- `Dependency review` for pull requests.

Protect `main` after the first successful workflow: require the 3 always-running checks, require the pull-request dependency review where GitHub supports event-specific checks, block force pushes, and require conversation resolution. Keep GitHub Actions restricted to immutable action SHAs.

## Preview and production smoke checks

1. `GET /api/health` returns `200`, `cache-control: no-store`, and only `{ "status": "ok" }`.
2. Search for “money and debt advice”; the URL contains no search or postcode input.
3. Open Welfare Rights, verify publisher/provenance, and follow the authoritative link in a separate check.
4. Submit a non-sensitive test correction, record its UUID, then delete or close it through the approved operator workflow.
5. Open `/status`; verify counts are plausible and degraded source states disclose checking limitations without claiming service closure.
6. Inspect response headers for nonce CSP, HSTS, `nosniff`, frame denial, referrer policy, and permissions policy.
7. Inspect hosting logs. They must not contain search narratives, postcodes, report text, authorization values, database URLs, or full user-input URLs.

## Backup and recovery

`pnpm recovery:rehearse` creates a separate temporary local database, restores a custom-format dump of `ingest`, `catalogue`, and `operations`, compares bounded table counts, then removes only that temporary database. On 16 September 2026 the rehearsal restored 9 entries, 10 publications, 13 candidates, and 13 test corrections. These counts include integration-test records and are evidence of the mechanism, not production content.

Before launch, repeat the exercise against an approved non-production export and record the encrypted backup identifier, operator, start/end time, count comparison, and deletion of the temporary restore. Confirm the managed production backup schedule separately; a local rehearsal is not evidence that cloud backups are enabled.

The derived search index can be rebuilt from immutable active publications:

```bash
DATABASE_URL=<approved-target> pnpm search:rebuild --apply
```

The command intentionally requires `--apply`, deletes only the derived `catalogue.search_documents` projection, rebuilds it transactionally, and reports a count without service text.

## Rollback

Rollback triggers include a failed health check, new client errors, material accessibility regression, data-integrity concern, secret exposure, error rate above twice baseline, or p95 latency more than 50% above baseline.

1. Stop promotion or use Vercel’s deployment rollback to restore the last known-good application commit.
2. If corrections are unsafe, remove the correction link or take the deployment offline; never silently accept and discard reports.
3. Do not reverse or reset production migrations. The application rollback must remain compatible with the forward schema. Ship a reviewed corrective migration when the database must change.
4. Verify `/api/health`, search → detail, source links, `/status`, logs, and the maintenance workflow.
5. Record the incident and recovery commit/run identifiers without user input or secrets.

## First-hour watch

The primary and fallback owners must be available for the first hour. Check health, request error rate, p95 response time, client errors, database connection use, correction acceptance, and source warnings at 0, 15, 30, and 60 minutes. Roll back rather than debugging a harmful production state in place.

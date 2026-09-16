# Runbook: corrections, alerts, and retention

**Audience:** ORUK Navigator maintainer
**Use for:** correction triage, scheduled maintenance, retention, or a failed operations workflow

## Production setup gate

**Current production decision (16 September 2026):** no fallback maintainer is available, so the owner chose to keep public correction intake disabled. The service link, report page, and API remain fail-closed. The maintenance workflow may still run because it reconciles source alerts and retention independently of public intake.

Before enabling public corrections:

1. Name a primary and fallback maintenance owner and record staffed review hours in the private operator contact record.
2. Configure a server-only `CORRECTION_RATE_LIMIT_SECRET` and a separate `OPERATIONS_MAINTENANCE_SECRET`, each generated randomly with at least 32 characters.
3. Add `OPERATIONS_MAINTENANCE_URL` and `OPERATIONS_MAINTENANCE_SECRET` to GitHub Actions secrets. The URL is the deployed origin only; the workflow appends `/api/operations/maintenance`.
4. Use a runtime database role derived from `navigator_operations_writer`; never expose its connection or either secret to browser JavaScript.
5. Test the manual `Operations maintenance` workflow and confirm that its summary contains only counts.

Public corrections remain disabled if owners, the monitored GitHub issue channel, staffed hours, or secrets are missing.

## Correction triage

1. Locate the report by its UUID reference. Do not paste its optional free text into GitHub, chat, logs, or analytics.
2. Check the entry and immutable publication linked when the report was created. A newer publication may now be active.
3. Move `new` → `triaged` and record a bounded reason code and operator identity.
4. For a credible source-backed difference, link an extraction candidate and use the normal evidence/review/publication workflow. Never update catalogue fields from a report.
5. Close as `resolved`, `rejected`, or `duplicate` with an outcome code. Duplicate reports should point to the shared investigation through the operator record, not copied free text.
6. For potentially harmful urgent information, use the reviewed suspension route while evidence is checked.

The public form collects no contact route, so do not promise an individual response.

## Scheduled maintenance

The weekly workflow calls an authenticated server-only endpoint. One transaction reconciles source alerts; a second applies retention. It reports counts only:

- abuse hashes expire after 24 hours;
- closed correction text is redacted after 30 days;
- unresolved correction text is redacted after 90 days and creates one deduplicated operator alert;
- correction metadata is deleted 12 months after closure; and
- structured events expire after 30 days.

Re-running the endpoint is safe. Already-redacted text is not processed again, and open alerts are updated rather than duplicated. A source recovery resolves the existing alert.

## Non-production exercise

Run from a clean local database:

```bash
pnpm db:reset
pnpm db:test
pnpm test:repositories
```

The repository scenarios deliberately exercise:

- a report tied to the active immutable publication;
- five accepted attempts followed by a rate-limit rejection;
- triage and resolution without catalogue mutation;
- an append-only transition-history rejection;
- 90-day text redaction followed by an idempotent replay; and
- a stale-source alert, duplicate reconciliation, and recovery resolution.

On 16 September 2026 this rehearsal passed 63 pgTAP assertions and 14 real-PostgreSQL scenarios. This is implementation evidence, not production evidence. Before launch, separately test the deployed schedule, failure issue route, backup restore, and search-projection rebuild, and record the workflow/run identifiers without secret or user data.

## Failure response

If scheduled maintenance fails, use the deduplicated `[operations] Scheduled maintenance failed` GitHub issue and inspect the linked workflow run. Do not put authorization headers, database URLs, raw report text, search terms, postcodes, or IP addresses in the issue. Restore the job, replay it once, verify count-only output, and close the issue with the run identifier.

For source-health failures, follow [the ingestion health runbook](ingestion-health.md).

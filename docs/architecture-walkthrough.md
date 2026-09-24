# Architecture walkthrough

A guided tour of how ORUK Navigator works, in the order a request travels. Read this before the deeper documents; each section links to the code and to the decision behind it.

## The one-paragraph version

Tameside Council publishes support information as web pages. Navigator admits a small allowlist of those pages through a reviewed ingestion boundary, stores them as immutable publications with provenance in PostgreSQL, searches them deterministically so every match can be explained, and republishes them as an Open Referral UK v3 feed so partners can reuse the data rather than re-key it. Nothing is published that a reviewer has not approved, and nothing is displayed that a source did not state.

## 1. A public search

```
Browser  →  Next.js server component (app/page.tsx)
         →  CatalogueRepository.listActive()
         →  PostgreSQL: active publications only
         →  SearchExperience (client component)
```

- The page is a **server component**: the database is read on the server, and only reviewed catalogue records reach the browser. There is no public database access from the client, which is the boundary recorded in [ADR 0002](adr/0002-private-postgresql-domain-boundary.md).
- Searching happens **in the browser, over the records already delivered**. The query never reaches the server, never enters the URL, and is never logged. That is why the service can promise that what someone types is not recorded anywhere.
- Matching is deterministic: reviewed concept phrases (debt, housing, carers, family, equipment, adult social care) plus word-start matching, with a small boost when a service's name matches. Each result carries a `matchReason` naming the field that caused it. See [`src/lib/search.ts`](../src/lib/search.ts) and [docs/search.md](search.md).
- Semantic search was measured and deferred, not assumed: [ADR 0005](adr/0005-defer-semantic-search.md).

## 2. Where the data comes from

```
Reviewed source manifest  →  bounded fetch  →  deterministic extraction
                          →  candidate + field evidence  →  human review
                          →  immutable publication  →  search projection
```

- **Source manifest** ([`src/ingestion/source-manifest.ts`](../src/ingestion/source-manifest.ts)): configuration plus licence evidence for each admitted page. Admission fails closed: a page without complete licence evidence, an allowlisted host and a defined extractor stays disabled.
- **Bounded fetch** ([`src/ingestion/bounded-fetch.ts`](../src/ingestion/bounded-fetch.ts)): HTTPS only, allowlisted origins, manual redirect validation, size, content-type, timeout and retry limits. Responses are treated as hostile input; HTML is parsed as data and never executed.
- **Extraction** ([`src/ingestion/tameside-page-adapter.ts`](../src/ingestion/tameside-page-adapter.ts)): reviewed selectors produce a normalised candidate plus per-field evidence. Identity is a hash of the *extracted* content, not the raw page, because the council platform emits different markup for identical content — a finding recorded during research.
- **Review and publication**: a changed candidate never overwrites public information automatically. Approval creates an immutable publication and atomically switches the active version ([ADR 0001](adr/0001-reviewed-source-publication.md), [docs/ingestion.md](ingestion.md)).
- **Failure behaviour**: a fetch failure marks the source unhealthy and keeps the last good publication visible with its condition disclosed. A missing page never deletes a service.

## 3. The database

PostgreSQL with three schemas ([`supabase/migrations`](../supabase/migrations)):

| Schema | Holds |
| --- | --- |
| `ingest` | sources, licences, source pages, runs, fetch observations, extraction candidates, field evidence, review decisions |
| `catalogue` | entries, immutable publications, contact points, source actions, search documents, projection jobs |
| `operations` | correction reports and transitions, abuse windows, operational events, alerts |

Constraints carry the rules rather than trusting application code: unique candidate identity for idempotent replay, one active publication per entry enforced by a composite foreign key, and check constraints on lifecycle states. Database behaviour is tested with pgTAP (63 assertions), and the repository boundary with real PostgreSQL integration tests.

## 4. Publishing as ORUK data

The reviewed catalogue is republished as an Open Referral UK v3 feed at [`/api/oruk/v3`](https://oruk-navigator.vercel.app/api/oruk/v3): metadata, services list, service by id, and organisations.

- The mapper ([`src/oruk/service-mapper.ts`](../src/oruk/service-mapper.ts)) is pure and restates only reviewed facts. `assured_date` comes from when the source was checked, which is exactly ORUK's definition. Fields with no evidence are omitted rather than filled.
- Derived records (service areas, cost options, the publisher organisation) get deterministic UUID v5 identifiers, so the same data produces the same identity in every environment.
- Taxonomy and service-at-location endpoints are deliberately absent: the catalogue holds no such data, and publishing empty or invented collections would break the project's own evidence rule.
- It passes the required checks of the [official ORUK validator](https://github.com/OpenReferralUK/oruk-validator). Reproduction steps: [docs/oruk-feed.md](oruk-feed.md).

## 5. Reading other people's feeds

[`/interoperability`](https://oruk-navigator.vercel.app/interoperability) probes the published feeds listed in the official ORUK directory and reports what each declares and how completely its records are populated.

Reading a feed is permitted; storing or republishing another publisher's records is not, until that publisher grants it. The probe therefore keeps counts and summary facts only — bounded anonymous reads, at most 25 sampled records, cached for an hour — and a test asserts that no probed record text survives into the result ([`src/oruk/feed-probe.ts`](../src/oruk/feed-probe.ts)).

`tools/OrukFeedCheck` does the same job from the command line in C#, for any feed, with its own exit codes so it can gate automation ([tools/README.md](../tools/README.md)).

## 6. Corrections and operations

Public correction reporting is implemented but **fails closed**: unless an accountable owner and review hours are configured, the link is hidden and the route returns 404. Accepting reports nobody will read would be worse than not accepting them.

GitHub Actions runs source-health and retention maintenance against an authenticated endpoint; alerts record source failures. The source-fetch schedule is paused after the first live extractor failure, while controlled manual retests remain available. Runbooks cover deployment and rollback, ingestion health, and corrections and retention ([docs/runbooks](runbooks)).

## 7. How a change ships

Five gates run on every pull request:

| Gate | Covers |
| --- | --- |
| Code quality & security | secret scan, lint, types, 98 unit and component tests, production build, dependency audit |
| Database contracts & repositories | migrations, 63 pgTAP assertions, real-PostgreSQL repository tests |
| Browser, accessibility & headers | Playwright journeys and axe-core at desktop, 390px and 320px, plus security headers |
| ORUK feed tools (.NET) | restore, build and 14 xUnit tests for the C# checker |
| Dependency review | new dependency vulnerabilities and licences |

Actions are pinned by commit hash, dependencies install frozen, and `main` is protected.

## 8. Decisions worth knowing

| Decision | Why |
| --- | --- |
| Curated council pages, not a broad crawler | Licence evidence must be checked per page; a crawler cannot make that judgement |
| Human review before publication | A wrong automated update could misdirect somebody seeking help |
| Deterministic search | Every match must be explainable from source fields; the measured baseline already retrieves every expected result within rank three |
| Search in the browser | The query never leaves the device, so it cannot be logged or leaked |
| Publish ORUK data | The council has no feed; reviewed content becomes reusable data instead of being re-keyed |
| Read other feeds without storing them | Licensing permits reading, not redistribution |
| Corrections disabled by default | Reports need someone accountable to read them |

# ORUK v3 publishing feed

**Status:** implemented; base URL `https://oruk-navigator.vercel.app/api/oruk/v3`

## Why

Tameside Council publishes its support information as web pages. It has no Open Referral UK feed, so partners who want to reuse that information must copy it by hand. Navigator already holds a reviewed, provenance-backed catalogue of selected council pages. Publishing that catalogue as an ORUK v3 (HSDS-UK-3.0) feed turns reviewed web content into shared data without anyone re-keying it.

The feed is a demonstration of the route, not an official council feed. It carries the same pilot limits as the website: ten reviewed services, one publisher, and no claim of availability or eligibility.

## Endpoints

| Method and path | Returns |
| --- | --- |
| `GET /api/oruk/v3` | Feed metadata: `version` (`HSDS-UK-3.0`), `profile`, `openapi_url` |
| `GET /api/oruk/v3/services` | Paginated ORUK envelope (`total_items`, `total_pages`, `page_number`, `size`, `first_page`, `last_page`, `empty`, `contents`). Supports `page`, `per_page` (max 200) and `search` |
| `GET /api/oruk/v3/services/{id}` | Fully nested service with `organization`, `service_areas` and `cost_options`; `404` for unknown ids |
| `GET /api/oruk/v3/organizations` | Paginated list containing the reviewed publisher |
| `GET /api/oruk/v3/organizations/{id}` | The publisher with its active services; `404` for unknown ids |

The first three are the endpoints the official ORUK validator treats as pass-critical. The optional taxonomy and service-at-location endpoints are deliberately not published: the reviewed catalogue holds no taxonomy terms or delivery locations, and inventing them would break the project's rule that every published fact has source evidence.

Every response allows anonymous cross-origin reads (`Access-Control-Allow-Origin: *`), as the ORUK compliance guidance asks, and is cached for five minutes at the edge.

## Mapping

| ORUK field | Source in Navigator | Notes |
| --- | --- | --- |
| `id` | `catalogue.entries.public_id` | Stable UUID per catalogue entry |
| `organization_id`, `organization` | Reviewed publisher | Deterministic UUID v5 so it is identical in every environment; `website` is the council home page |
| `name`, `description` | Active publication | Reviewed summary text |
| `status` | Always `active` | Only active publications are exposed; withdrawn or suspended entries disappear from the feed |
| `url` | Authoritative source action | The council page, so consumers can verify details |
| `assured_date` | `source_checked_at` | ORUK defines this as the date the information was last checked. It is never presented as a publisher update date |
| `service_areas[]` | Publication area text | One record, deterministic UUID v5 |
| `cost_options[].amount_description` | Publication cost summary | Only when the reviewed source states a cost |

Fields without reviewed evidence (`email`, `last_modified`, schedules, languages, locations, taxonomy terms) are omitted rather than filled with guesses.

## Validation

The feed was checked with the official [Open Referral UK validator](https://github.com/OpenReferralUK/oruk-validator) (ASP.NET Core, .NET 10), run locally in Docker on 17 September 2026:

| Suite | Result |
| --- | --- |
| Level 1 — basic checks (required) | **Pass**: metadata, services list and service by id all conform to the HSDS-UK-3.0 schema. `isValid: true` |
| Level 2 — extended checks (optional) | Organisations list and organisation by id **pass**. Taxonomies, taxonomy terms and service-at-locations return `404` by design (see above) and are reported as acceptable optional-endpoint warnings |

Reproduce it:

```bash
git clone https://github.com/OpenReferralUK/oruk-validator.git
docker build -t oruk-validator:local oruk-validator
docker run -d --name oruk-validator -p 6969:80 oruk-validator:local
curl -X POST http://localhost:6969/openreferraluk/validate \
  -H "Content-Type: application/json" \
  -d '{"baseUrl":"https://oruk-navigator.vercel.app/api/oruk/v3","options":{"testEndpoints":true}}'
```

To validate a local development server instead, use `http://host.docker.internal:3000/api/oruk/v3` as `baseUrl` and add `--add-host=host.docker.internal:host-gateway` to `docker run`.

## Code

- `src/oruk/service-mapper.ts` — pure service, organisation, paging and UUID v5 functions
- `src/oruk/http.ts` — feed response headers and parameter parsing
- `src/app/api/oruk/v3/**/route.ts` — Next.js route handlers backed by `CatalogueRepository`
- Tests: `src/oruk/service-mapper.test.ts`, `src/app/api/oruk/v3/routes.test.ts`, and the repository integration test for `findActiveByPublicId`

## Reading other feeds

`/interoperability` probes the published ORUK feeds listed in the official directory (Shropshire, Bristol, Dorset) alongside Navigator's own, and reports what each one declares and how completely its records are populated.

The probe is deliberately narrow, because the licensing boundary in `docs/research/licensing.md` allows reading a feed but not storing or republishing another publisher's records without explicit permission:

- anonymous, bounded, read-only requests to the feed's own endpoints;
- a sample of at most 25 records per feed, cached for an hour;
- counts and summary facts only — no service record from another publisher is stored or displayed.

Code: `src/oruk/feed-directory.ts`, `src/oruk/feed-probe.ts`, `src/app/interoperability/page.tsx`. Tests in `src/oruk/feed-probe.test.ts` include a check that no probed record text survives into the result.

Observed on 17 September 2026: Shropshire (5,132 services) and Bristol (874) both declare `HSDS-UK-3.0` with 100% coverage of the sampled fields, but publish the placeholder profile `https://path/to/profile`, and most sampled records were last checked over a year ago. Dorset declares `V3` with 98% coverage.

## Try it

```bash
curl https://oruk-navigator.vercel.app/api/oruk/v3
curl "https://oruk-navigator.vercel.app/api/oruk/v3/services?per_page=5"
```

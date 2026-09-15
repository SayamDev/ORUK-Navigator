# Pilot feed validation

**Decision date:** 15 September 2026  
**Decision:** Use **Shropshire Council** as the v1 technical and product pilot coverage. Keep Pennine Lancashire as the preferred north-west candidate, but do not depend on it until its DNS and official validation status recover. Publisher confirmation that the Shropshire API data is covered by the Open Government Licence is a pre-production redistribution gate.

## Scope and evidence policy

This validation used only first-party publisher material, the official Open Referral UK (ORUK) directory/dashboard, and safe anonymous `GET` requests to directory-listed endpoints. Probes were deliberately bounded: metadata, one-record pages, one detail record per shortlisted feed, a maximum 100-record list sample, and three gentle sequential requests to the selected feed. No load or destructive testing was performed.

The [official feed directory](https://openreferraluk.org/community/directory) is the source for feed identity and base URLs. Its listing on the decision date described Pennine Lancashire, Bristol, Hull and Shropshire as live data; Dorset as assured voluntary, community and statutory service information; and the Cumbria/LocalGov Drupal entry as a sample. Directory registration is not treated as proof of current availability, completeness, licensing or support for every ORUK endpoint.

## Candidate result

| Candidate | Directory-listed base URL | Declared profile/version | Live observations | Decision |
|---|---|---|---|---|
| Pennine Lancashire ICP | `https://penninelancs.openplace.directory/o/ServiceDirectoryService/v2` | Could not be read; the [official report](https://openreferraluk.org/developers/dashboard/67d1781a96f61f8df112a046) identifies schema 1.0 | DNS resolution failed during independent web and `curl` checks. Official report: fail. No Greater Manchester council feed was present in the official directory. | Preferred geography, **not viable now**. Recheck later; do not ship against it. |
| Shropshire Council | `https://shropshire.openplace.directory/o/OpenReferralService/v3` | Root returned `HSDS-UK-3.0`; profile value was the non-actionable placeholder `https://path/to/profile`; OpenAPI pointed to upstream international 3.0 | Root, service list and service detail returned 200. 5,128 services were reported. Official dashboard/report (`688b87d3ce02ed2709c523e9`) records pass/live/valid. | **Selected pilot.** Strongest currently observable v3 council feed, subject to licence confirmation. |
| Community Action Network, Dorset | `https://dorset.localplacedirectory.org.uk/aggregator` | Root returned `V3`, profile `https://openreferraluk.org/`, and a publisher OpenAPI URL | Root/list/detail returned 200; 2,226 services reported. Rich selected detail, but optional collection endpoints returned 404 and official dashboard validity/overall state was fail. | Valuable later community-sector comparison, not primary pilot. |
| Bristol Council | `https://bristol.openplace.directory/o/OpenReferralService/v3` | Root returned `HSDS-UK-3.0` with the same placeholder profile and upstream OpenAPI URL | Root/list/detail returned 200; 874 services reported. Official dashboard was live pass but validity/overall fail. | Viable adapter test fixture, weaker launch evidence than Shropshire. |

Other directory entries were not chosen: the CQC transformation is national regulated-care data on ORUK v1 rather than a regional community-services pilot; Cumbria is explicitly a sample; Hull and Buckinghamshire directory URLs timed out or returned an error during discovery; and the remaining feeds did not improve the fit/evidence balance for this pilot.

## Selected feed contract: Shropshire

### Identity and transport

- Base URL: `https://shropshire.openplace.directory/o/OpenReferralService/v3`
- `GET /`: 200, `application/json`
- Declared version: `HSDS-UK-3.0`
- Declared profile: `https://path/to/profile` (placeholder, so not usable for automated profile retrieval)
- Declared OpenAPI: `https://raw.githubusercontent.com/openreferral/specification/3.0/schema/openapi.json` (international upstream rather than an ORUK-specific artifact)
- CORS: `Access-Control-Allow-Origin: *`
- No `X-RateLimit-*` or `Retry-After` header was observed. Three sequential one-record requests all returned 200 in approximately 0.58–0.67 seconds. This establishes only that gentle anonymous reads worked; it is not permission to load-test and does not prove an unlimited rate.

### Endpoint and query behaviour

| Probe | Result | Integration consequence |
|---|---|---|
| `GET /services?per_page=1` | 200; envelope reported 5,128 total items and returned one record | Paginated ingestion is viable. |
| `GET /services?per_page=1&page=2` | 200; returned a different stable-looking UUID | Page traversal is observable; importer must still checkpoint and deduplicate by source ID. |
| `GET /services/{id}` | 200; selected detail included service areas, contacts and two service-at-location relationships | Detail hydration is required for richer location data. |
| `GET /service_at_locations?per_page=1` | 404 | Do not assume all nine ORUK collection paths exist. Read nested detail relationships. |
| `GET /taxonomies?per_page=1` | 200 with zero items | No feed-level taxonomy catalogue was observable. |
| `GET /taxonomy_terms?per_page=1` | 404 | Taxonomy browsing/expansion cannot depend on this feed. |
| `GET /services?format=ndjson&per_page=1` | 200 but returned the ordinary JSON envelope with `application/json`, not NDJSON | Treat NDJSON as unsupported despite the generic OpenAPI link. |
| `GET /services?modified_after=2099-01-01T00:00:00Z&per_page=1` | 200 and still reported 5,128/returned a record | `modified_after` was ignored; do not use it for incremental sync without publisher confirmation or a future passing contract test. |
| `GET /services?search=mental%20health&per_page=1` | 200 and returned the same unfiltered count/first record | Server-side search was ignored; Navigator must provide its own indexed search. |

The list envelope used `contents`, `total_items`, `total_pages`, `page_number`, `size`, and first/last/empty flags. This differs from assumptions a generic OpenAPI client might make, so the adapter needs fixture-backed decoding rather than blind code generation.

### Size, freshness and coverage observations

The feed reported **5,128 services** at probe time. A bounded first-page sample of 100 list records contained 100 active records, 100 `assured_date` values and 100 `last_modified` values. Sample assurance dates ranged from 29 May 2025 to 4 September 2026; modification timestamps had the same date range. This is a sample, not a claim that all 5,128 records are active, complete or recently assured.

List responses were shallow even when `full=true` was requested: the 100 sampled list records exposed no nested service-at-location, service-area or attribute arrays. The selected detail record did expose one service area and two service-at-location relationships, but no attributes. Accordingly:

- ingestion must fetch service details to acquire locations and coverage;
- taxonomy coverage is not established and lexical search must be the honest default;
- provider addresses, delivery locations and service areas must remain distinct;
- freshness must be shown per record, not inferred from the feed's availability;
- `full=true` must not be treated as a supported optimisation.

### Licensing

[Shropshire Council's open-data licence page](https://next.shropshire.gov.uk/open-data/licence/) states that data published on its open-data webpages is available under the [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/), allowing copying, adaptation and commercial use with attribution. Neither the API root nor the ORUK directory entry declares a licence, and the council page does not explicitly name this API. Therefore this is supporting evidence, **not a conclusive licence grant for the feed**. Obtain written publisher confirmation before public redistribution and record the required attribution in feed configuration.

## Why the pilot geography changed

The requested north-west focus remains product-relevant, but a launch feed must be reachable and testable. Pennine Lancashire failed DNS resolution and its official report failed; no Greater Manchester council feed appeared in the official directory. Selecting it would make the product demo dependent on an unavailable source and would prevent an evidence-based ingestion contract.

Shropshire is the narrowest responsible pivot: one council region, one currently reachable ORUK v3 feed, a passing official validation record, a meaningful service count, observable location relationships, and record-level assurance dates. The change is a technical/product pilot choice, not a claim that Shropshire has greater need or better underlying service data.

## Implementation guardrails

1. Configure exactly one enabled source for v1: the Shropshire base URL above.
2. Persist source URL, source ID, ingestion time, declared version/profile/OpenAPI URL, `last_modified`, `assured_date`, status and raw payload provenance.
3. Paginate `/services`, then hydrate `/services/{id}` with bounded concurrency and retry/backoff. Do not use NDJSON, `full`, `search` or `modified_after` until a contract probe proves support.
4. Cache the last successful snapshot; one failed fetch must never imply deletion.
5. Default search to active records and locally indexed lexical/location fields. Do not imply taxonomy matching when the feed exposes no taxonomy catalogue.
6. Keep publisher licence confirmation and attribution wording as a release gate.
7. Monitor Pennine Lancashire's DNS and official validator state. A recovered feed is a new adapter/coverage decision, not a silent base-URL swap.

## Revalidation triggers

Re-run these probes before production deployment, when the directory URL/profile changes, after sustained ingestion failures, or before adding a second region. Capture timestamps and response-shape fixtures in the connector test suite; never treat this point-in-time report as a permanent service-level guarantee.


# Open Referral UK research for ORUK Navigator

**Status:** Phase 0 technical research

**Access date for every source:** 15 September 2026
**Source policy:** first-party Open Referral UK, official Open Referral, official publisher feeds, and official GitHub repositories only. No contract, field, taxonomy term, or feed capability is inferred where the source does not state it.

## Executive conclusions

- The current UK profile is **ORUK v3.0 / HSDS-UK-3.0**, published in 2023. International HSDS has continued beyond it (3.1, 3.1.1 and, in the upstream repository, 3.2.x), but ORUK deliberately controls when international changes enter the UK profile. ORUK v3.0 remains the current UK contract. [ORUK governance and release cycles](https://openreferraluk.org/about/50-governance)
- ORUK is an interchange profile of the international Human Services Data Specification (HSDS), not a search ranking model, a national service catalogue, or a controlled UK-wide taxonomy. [ORUK developer resources](https://openreferraluk.org/developers)
- The normative integration surface is a REST/JSON API described by OpenAPI 3.0 and JSON Schema 2020-12. There are nine documented `GET` paths: `/`, pairs for services, service-at-location records, taxonomies, and taxonomy terms. [ORUK API reference](https://openreferraluk.org/developers/api), [ORUK OpenAPI specification](https://openreferraluk.org/developers/specifications)
- Basic validator compliance is narrower than complete implementation: the validator treats `/`, `/services`, and `/services/{id}` as pass-critical and warns on the other six paths. A "verified" feed therefore must not be assumed to support every discovery feature or to contain rich, current records. [ORUK compliance criteria](https://openreferraluk.org/developers/compliance)
- For Navigator, ingestion must be defensive and provenance-preserving. Feed-level version, endpoint capability, validator status, publisher, licence, timestamps and per-record source identifiers must be retained. Search must tolerate missing optional data, local taxonomies, stale assurance, pagination differences, throttling, and unavailable endpoints.

## 1. Standard and governance

Open Referral UK is a UK profile: a selected subset of international HSDS fields and web methods intended for community, council and public-sector service information. The current website describes version 3.0 as fully aligned with international HSDS naming and as adding no properties beyond the international specification; there was no UK v2. [Developer resources](https://openreferraluk.org/developers), [v3.0 changelog](https://openreferraluk.org/developers/changelog)

Version 3.0 of the UK profile was published in 2023. International releases do not automatically change the UK profile. This decoupling is important: clients must negotiate or record the feed's declared profile/version rather than treating the latest international HSDS tag as the ORUK contract. [Governance and release cycles](https://openreferraluk.org/about/50-governance)

The official generated specification repository explains the build chain: international HSDS schemas + a UK `profile.json` + UK schema patches are processed by the HSDS Profile Wizard to produce UK JSON Schemas and `openapi.yaml`. Those generated artifacts, rather than examples in prose, should be the source for generated types and validation. [ORUK specification repository](https://github.com/OpenReferralUK/ORUK-specification)

## 2. API contract relevant to Navigator

### Required path family

| Method and path | Role in Navigator |
|---|---|
| `GET /` | Feed metadata. The response requires `version`, `profile`, and `openapi_url`. Persist all three and use the linked OpenAPI document for capability inspection. |
| `GET /services` | Paginated or NDJSON service enumeration and feed synchronisation. |
| `GET /services/{id}` | Fully nested record used for service detail and relationship ingestion. |
| `GET /service_at_locations` | Search/enumerate service-to-location delivery records. |
| `GET /service_at_locations/{id}` | Fully nested service-at-location detail. |
| `GET /taxonomies` | Enumerate taxonomies declared by a publisher. |
| `GET /taxonomies/{id}` | Read one taxonomy with related information. |
| `GET /taxonomy_terms` | Enumerate/search terms, including hierarchy filters. |
| `GET /taxonomy_terms/{id}` | Read one term. |

Source: [ORUK API reference](https://openreferraluk.org/developers/api) and [technical overview](https://openreferraluk.org/developers/overview).

ORUK documents list query parameters including `search`, `page`, `per_page`, and `format`; `format=ndjson` is specified as an unpaginated stream on list paths. Discovery-relevant filters shown in the current reference include `taxonomy_term_id`, `taxonomy_id`, `organization_id`, `modified_after`, `full`, `postcode`, and `proximity` on `/service_at_locations`, plus `taxonomy_id`, `top_only`, and `parent_id` on `/taxonomy_terms`. These are API parameters, not a promise that each verified publisher implements them correctly; capability must be probed and cached per feed. [ORUK API reference](https://openreferraluk.org/developers/api)

Custom publisher endpoints and extra information are explicitly permitted. Navigator should ignore unknown fields safely and must not make extensions part of the cross-feed core without an explicit adapter. [Technical overview](https://openreferraluk.org/developers/overview)

### Compliance and transport

Compliance has two headline requirements: an anonymously accessible open JSON API and conformance to the API specification. The guidance asks publishers to return `Access-Control-Allow-Origin: *`, while allowing throttling. Private/confidential data may only appear outside the open feed with suitable security. [Compliance criteria](https://openreferraluk.org/developers/compliance)

The official validator considers three endpoints pass-critical: `/`, `/services`, and `/services/{id}`. Missing/non-conformant optional endpoints result in warnings rather than failure. A Navigator connector therefore needs an endpoint capability matrix; "verified" cannot be used as a synonym for "complete". The official validator repository supports scheduled validation, v1 and v3 schemas, live endpoint tests, and feed-status/history persistence, but its service routes are validator infrastructure rather than the ORUK publisher contract. [Compliance criteria](https://openreferraluk.org/developers/compliance), [official validator repository](https://github.com/OpenReferralUK/oruk-validator)

## 3. Entities and relationships

The official v3 model lists 29 schema classes, including response/package wrappers. The core discovery graph is:

```text
organization 1 ── * service * ── * location
                         │          through service_at_location
                         ├── schedules
                         ├── service_areas
                         ├── contacts / phones
                         ├── languages
                         ├── cost_options / funding
                         └── attributes * ── 1 taxonomy_term * ── 1 taxonomy
                                                         └── parent_id hierarchy
location ── addresses / accessibility / schedules / contacts / phones
```

Source: [ORUK v3 data model](https://openreferraluk.org/developers/schemata).

Important semantics and fields for service discovery:

- **Service:** required `id`, `organization_id`, `name`, and `status`; status values are `active`, `inactive`, `defunct`, or `temporarily closed`. Useful optional fields include `description`, `url`, `email`, `minimum_age`, `maximum_age`, `assured_date`, `assurer_email`, `alert`, `last_modified`, and nested schedules, service areas, service-at-locations, languages, organization, funding, cost options, contacts and attributes. `fees` is deprecated; structured `cost_options` exists. [Data model](https://openreferraluk.org/developers/schemata), [compliance criteria](https://openreferraluk.org/developers/compliance)
- **Organization:** each service links to its provider. The model includes required `id`, `name`, and `description`, with optional website/email and identifiers/parent relationships. [Data model](https://openreferraluk.org/developers/schemata)
- **Location:** `location_type` may be `physical`, `postal`, or `virtual`. Coordinates use WGS84 decimal degrees; addresses, accessibility, contacts, phones and schedules may be nested. `external_identifier`/`external_identifier_type` can carry a third-party identifier such as a UPRN, but UPRN is an example, not a universal requirement. [Data model](https://openreferraluk.org/developers/schemata)
- **Service at location:** the join object requires its own `id`, `service_id`, and `location_id`; schedules can attach at this level, which matters when hours differ by venue. [Data model](https://openreferraluk.org/developers/schemata)
- **Service area:** can express a named/URI-identified area and an `extent`, with formats including GeoJSON, TopoJSON, KML or text. Presence and geometric quality are optional, so postcode coverage cannot be universally derived. [Data model](https://openreferraluk.org/developers/schemata)
- **Schedule:** uses RFC 5545 recurrence concepts (`freq`, `interval`, `byday`, `bymonthday`) with validity dates, opening/closing times, descriptions and optional schedule links. Consumers must preserve timezone-bearing values when supplied and treat free text as potentially necessary. [Data model](https://openreferraluk.org/developers/schemata)
- **Taxonomy and term:** a taxonomy has `id`, `name`, `description`, URI/version and terms. A term has an identifier, name/term, taxonomy linkage, optional URI and optional `parent_id` hierarchy. `attribute` links a taxonomy term to another entity by `link_id` and carries a `link_type` explaining what the classification describes. [Data model](https://openreferraluk.org/developers/schemata)

Optional properties without values should be omitted, not returned as null/empty. Parsers must therefore model absence as normal and must not turn absence into a negative fact. [Compliance criteria](https://openreferraluk.org/developers/compliance)

## 4. Taxonomy implications

The technical overview recommends three Local Government Association taxonomies—**Community Services**, **Needs**, and **Circumstances**—and says local terms may be used alongside shared terms. These names are recommendations, not proof that every feed uses the same version, URI, hierarchy, mappings or coverage. Navigator must ingest the taxonomy and term records supplied by each feed and preserve their identifiers and URIs; it must not manufacture a universal term list. [Technical overview](https://openreferraluk.org/developers/overview)

An official steering-group record notes a real interoperability limitation: not all feeds supply taxonomy terms, preventing inclusion in an aggregate feed, and the longer-term cross-government taxonomy direction was still unclear. This supports a two-lane search design: taxonomy-aware matching when reliable terms exist, plus transparent lexical/geographic fallback when they do not. [ORUK Steering Group minutes, 2 December 2024](https://openreferraluk.org/steering/ORUK%20Steering%20Group%2003%20-%20Minutes%20from%20%202%20December%202024.pdf)

## 5. Location and proximity capabilities

The API exposes `postcode` and `proximity` filtering on `/service_at_locations`: postcode may test service-area coverage, and proximity is expressed in metres from the postcode centroid. These are publisher-side capabilities, not guaranteed geocoding primitives for Navigator. Feed records may instead contain physical coordinates, postal addresses, virtual locations, free-text service areas, or structured polygons. [API reference](https://openreferraluk.org/developers/api), [data model](https://openreferraluk.org/developers/schemata)

Implementation consequence: distinguish **delivery venue**, **eligibility/coverage area**, and **user proximity**. Do not equate a provider address with service availability. Any external postcode lookup or geocoder is a separate dependency with its own licence, availability and privacy assessment; ORUK itself does not supply one.

## 6. Verified feeds available for controlled ingestion

The official directory showed 11 results on the access date and reported daily test timestamps. Its first page listed ten feeds: Bristol Council, Buckinghamshire Council, Care Quality Commission transformation, Community Action Network (Dorset), a Cumbria/LocalGov Drupal sample, Hull City Council, North Lincolnshire Council, Open Sessions, Pennine Lancashire ICP, and Shropshire Council. The directory explicitly mixes live, transformed and sample feeds, so registration/verification does not by itself establish production suitability. [Verified feed directory](https://openreferraluk.org/community/directory)

For an MVP, use only URLs obtained from this directory and store the directory listing metadata alongside the connector configuration. Start with a small, diverse set after live contract checks rather than silently aggregating all feeds. Candidate diversity should include a council feed, a voluntary/community feed, and a transformed national dataset; the LocalGov Drupal entry is explicitly described as a sample and should not be represented as live coverage. No feed should be treated as nationwide based only on its name.

Registration requires a feed to be checked for compliance first and states that accepted feed and publisher/developer details will be public. The registration form requests service name/description/URL and publisher/developer identity. [Register a feed](https://openreferraluk.org/developers/register)

## 7. Data freshness, assurance and quality

ORUK distinguishes schema compliance from data quality. The guidance recommends `assured_date` less than three months old and describes richer ongoing checks for completeness, accuracy, verification and taxonomy application. This is guidance, not a guarantee and not a field-level confidence score. `last_modified` records a content change; it is not equivalent to assurance. [Compliance criteria](https://openreferraluk.org/developers/compliance), [technical overview](https://openreferraluk.org/developers/overview)

Navigator should expose source and freshness rather than an opaque "trusted" badge. Suggested evidence retained per result: feed, publisher, source URL, source record ID, ingestion time, declared `last_modified`, `assured_date`, service status, validator state/time, and which important fields were absent. Do not expose `assurer_email` by default; although part of the schema, the privacy guidance warns against publishing personal update contacts.

## 8. Licensing, attribution and privacy

The data-sharing guidance says most council-directory data should be reusable under the Open Government Licence or an equivalent allowing legal commercial and non-commercial reuse. That is a recommendation, not a licence grant for every feed. Navigator must obtain and persist each feed's actual licence/attribution terms before redistribution. [Understanding data sharing and privacy](https://openreferraluk.org/developers/data-sharing)

The official website repository gives the preferred attribution: **"Human Services Data Specification UK: an Open Referral UK resource (https://openreferraluk.org/)"** and acknowledges international HSDS. However, first-party licensing statements are currently inconsistent: the repository `LICENSE` presents HSDS-UK/docs under BSD-3-Clause, while the validator README and website footer describe CC BY-SA 4.0 for schema/docs, and the code has separate BSD terms. This report does not resolve that conflict. Before copying schemas/docs into distributed artifacts, verify the specific artifact's current licence or ask ORUK. Linking/fetching normative artifacts and including the preferred attribution is safer than re-licensing them by assumption. [Website repository README](https://github.com/OpenReferralUK/oruk-standard-and-website), [website repository LICENSE](https://github.com/OpenReferralUK/oruk-standard-and-website/blob/main/LICENSE), [validator repository](https://github.com/OpenReferralUK/oruk-validator)

Do not ingest or expose internal services, archived/non-live records without clear inactive marking, sensitive locations such as refuges, or personal contact information intended only for partners. Open search queries may reveal sensitive user intent; minimise query/location logs, set retention deliberately, and never send identifiable narratives to an AI service by default. [Understanding data sharing and privacy](https://openreferraluk.org/developers/data-sharing)

## 9. Architecture dependencies and recommendations

1. **Specification adapter:** pin generated client/schema validation to ORUK v3.0 artifacts; keep a versioned adapter boundary for v1 or future UK profiles.
2. **Feed registry:** configuration must include official directory URL, base URL, publisher, declared version/profile/OpenAPI URL, licence, enabled endpoints, request limits and last verification.
3. **Raw + normalized storage:** retain source payload/provenance, then normalize core searchable fields. Avoid flattening away schedules, service areas, taxonomy origin, virtual locations or service-at-location identity.
4. **Incremental ingestion:** prefer `modified_after` where proven by feed tests; otherwise paginate/stream with stable source IDs and tombstone rules. Never infer deletions from one failed fetch.
5. **Validation layers:** transport/OpenAPI/JSON Schema validation, referential-integrity checks, then quality indicators. Keep validator compliance distinct from Navigator ingestion success and record quality.
6. **Search:** deterministic lexical filters and geographic constraints first. Taxonomy expansion must cite the source taxonomy/mapping. Any AI enrichment should be optional, explainable, non-authoritative and unable to invent eligibility, availability or categories.
7. **Result safety:** default to active services, but surface temporary closure and alerts prominently; show missing/old assurance neutrally. Users should verify critical details with the provider.
8. **Observability:** measure feed availability, latency, pagination, schema failures, records ingested/rejected, taxonomy coverage, geospatial coverage and freshness. Feed failure must not erase the last known data without an explicit retention policy.

## 10. Explicit unknowns and Phase 0 validation tasks

- The directory UI reported 11 entries but exposed only ten on the crawled first page. The eleventh feed was not asserted here; inspect the live second page or registry source before creating a complete inventory.
- The prose reference and generated artifacts can drift. Confirm exact required arrays, parameter types/defaults, response envelopes and schema `$id` values from a pinned official ORUK-specification commit before generating production types.
- Verification proves the three pass-critical endpoints at a point in time; it does not prove licence, nationwide coverage, completeness, taxonomy consistency, geospatial precision, current assurance, or service suitability.
- The official sources do not define relevance scoring, deduplication across feeds, a canonical cross-feed taxonomy mapping, postcode geocoding, safeguarding rules, or an AI contract. These must be explicit Navigator product/architecture decisions and must not be labelled ORUK requirements.
- Before selecting MVP feeds, run read-only contract probes against each candidate for CORS, version/profile, pagination/NDJSON, rate limits, stable IDs, `modified_after`, licence, taxonomy coverage, locations/service areas, schedules and assurance dates.
- Clarify the schema/documentation licence inconsistency with the ORUK maintainers before embedding or redistributing substantial normative material.

## Primary-source index

- [Open Referral UK developer resources](https://openreferraluk.org/developers)
- [Technical overview](https://openreferraluk.org/developers/overview)
- [API reference v3.0](https://openreferraluk.org/developers/api)
- [OpenAPI specification v3.0](https://openreferraluk.org/developers/specifications)
- [Data model v3.0](https://openreferraluk.org/developers/schemata)
- [Compliance criteria](https://openreferraluk.org/developers/compliance)
- [Data sharing and privacy](https://openreferraluk.org/developers/data-sharing)
- [Version 3.0 changelog](https://openreferraluk.org/developers/changelog)
- [Governance and release cycles](https://openreferraluk.org/about/50-governance)
- [Verified feed directory](https://openreferraluk.org/community/directory)
- [Feed registration](https://openreferraluk.org/developers/register)
- [Official ORUK specification repository](https://github.com/OpenReferralUK/ORUK-specification)
- [Official ORUK validator repository](https://github.com/OpenReferralUK/oruk-validator)
- [Official ORUK website/standard repository](https://github.com/OpenReferralUK/oruk-standard-and-website)
- [International HSDS specification repository](https://github.com/openreferral/specification)

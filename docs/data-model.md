# Domain model and PostgreSQL persistence boundary

**Status:** accepted v1 decision

## Decision summary

Use PostgreSQL as the system of record, deployed initially on Supabase, while keeping the schema portable to ordinary PostgreSQL. Separate untrusted ingestion state from reviewed catalogue state:

- `ingest` owns source manifests, fetch observations, extraction candidates, evidence, reviews, and run history.
- `catalogue` owns stable catalogue identities, immutable reviewed publications, repeatable public facts, and search projections.
- no internal table is directly exposed to browser clients;
- application repositories are the only boundary used by Next.js routes and server components;
- a future `api` schema may contain narrowly designed security-invoker views or functions, but v1 starts with none.

This design supports curated council pages now and a native ORUK feed later without making either external shape the application’s domain model.

## Architectural boundary

```text
Tameside page adapter       Future ORUK feed adapter
          |                           |
          +-------- untrusted --------+
                       |
                       v
              ingest schema
  source -> page -> fetch -> candidate -> evidence -> review
                                            |
                                      approved transaction
                                            |
                                            v
             catalogue schema
        stable entry -> immutable publication
                         |    |    |    |
                   contacts places areas actions
                         |
                   search document
                         |
                         v
             application repositories
                         |
               Next.js application API
                         |
                      browser
```

Raw HTML and ORUK response objects stop at their adapters. The application domain receives validated candidates and reviewed publications only.

## Identifier strategy

- Use `bigint generated always as identity` primary keys for internal relational identity and index locality.
- Give publicly addressable catalogue entries a separate random UUID `public_id` with a unique constraint. It is an opaque identifier, not an authorization mechanism.
- Use human-readable slugs for URLs, with an immutable slug history or redirect record added only when renaming becomes a real requirement.
- Retain publisher/source identifiers in namespaced source-record columns; never promote them to application primary keys.

The project avoids a UUIDv7 extension in v1. The data volume is small, portability matters, and the 2026 Supabase platform now ignores pinned extension-version clauses. Internal sequential keys plus a separate public UUID keep that concern out of table clustering.

## Ingestion schema

### `ingest.sources`

One configured publisher/technical source.

Key columns:

- `id bigint identity primary key`
- `key text unique not null` — stable repository-owned key such as `tmbc-web`
- `name text not null`
- `publisher_name text not null`
- `source_type text not null` — constrained values such as `curated_html` or `oruk_api`
- `base_url text not null`
- `adapter_key text not null`
- `adapter_version text not null`
- `admission_status text not null`
- `is_enabled boolean not null default false`
- `created_at`, `updated_at timestamptz not null`

`admission_status` is constrained to `draft`, `approved`, `suspended`, or `revoked`. Enabling requires approved licence evidence at the application/service boundary.

### `ingest.source_licences`

Licence and attribution evidence for a source.

Key columns:

- `source_id` foreign key
- licence identifier and canonical terms URL
- attribution text
- evidence URL, evidence hash, checked time, reviewer, and next-review time
- booleans recording whether extraction, normalization, storage, indexing, display, and redistribution are evidenced
- exclusions and review notes

Retain versions rather than overwriting evidence. One partial unique index identifies the current approved licence record for each source.

### `ingest.source_pages`

The explicit allowlist; scheduled ingestion never accepts an arbitrary caller-supplied URL.

Key columns:

- `source_id` foreign key
- stable `key`, canonical URL, allowed redirect hosts, and expected content type
- adapter/rules version
- geographic scope and source ownership evidence
- refresh interval, freshness window, timeout, retry, and response-size limits
- admission status and review metadata
- `last_successful_fetch_at` and current operational health

Unique constraints cover `(source_id, key)` and `(source_id, canonical_url)`.

### `ingest.ingestion_runs`

One manual or scheduled orchestration attempt.

Key columns:

- trigger, adapter/rules version, `started_at`, `finished_at`, and constrained status
- structured count columns for considered, skipped, unchanged, changed, rejected, and failed pages
- warning/failure summaries containing codes and identifiers, never raw page bodies

Statuses are `running`, `succeeded`, `succeeded_with_warnings`, or `failed`.

### `ingest.fetch_observations`

One bounded fetch result for one source page and run.

Key columns:

- run and source-page foreign keys
- requested/final URL, HTTP status, safe response metadata, byte count, duration, retrieval time
- raw response SHA-256, transport outcome, and structured error code
- `is_contract_valid boolean`

The raw response body is not retained indefinitely. The raw hash is diagnostic evidence and is not used for candidate idempotency because Tameside markup varies between equivalent requests.

### `ingest.extraction_candidates`

A normalized proposal produced from a fetch observation.

Key columns:

- source-page and fetch-observation foreign keys
- adapter and extraction-rules versions
- canonical extracted-content SHA-256
- validated normalized payload (`jsonb`)
- constrained outcome/review status and warnings
- creation time

The unique candidate identity is `(source_page_id, canonical_content_hash, adapter_version, rules_version)`. JSONB is appropriate here because candidate payloads are boundary artifacts under active review, not the public query model. Application validation owns their exact shape.

### `ingest.candidate_field_evidence`

One or more evidence items for a candidate field.

Key columns:

- candidate foreign key
- domain field path
- evidence kind and source locator
- minimal normalized excerpt or value hash
- transformation note and exclusion/safety flags

Evidence supports review and match/provenance explanation. It does not store full pages by default.

### `ingest.review_decisions`

An append-only decision for a candidate.

Key columns:

- candidate foreign key
- decision (`approved`, `rejected`, `changes_requested`, `withdrawn`)
- reason, reviewer identity, and decision time
- resulting publication ID when approval completes

Only the application’s review service writes decisions. A database transaction creates the publication and records the approval together.

## Catalogue schema

### `catalogue.entries`

The stable application identity users bookmark and feedback references.

Key columns:

- internal identity primary key and unique public UUID
- stable slug
- constrained lifecycle (`draft`, `active`, `withdrawn`, `suspended`)
- `active_publication_id`
- creation/update timestamps

The mutable active-publication pointer is the only current-state switch. Publication rows remain immutable.

### `catalogue.publications`

One immutable reviewed version of a catalogue entry.

Typed query/display columns:

- entry and approved-candidate foreign keys;
- version number and publication time;
- name, description, provider name, source status, and alert text;
- eligibility, cost, access, opening, language, and accessibility summaries where explicitly supplied;
- minimum/maximum age where explicitly supplied;
- source checked time and publisher-updated/assured times when present;
- completeness band and documented completeness inputs;
- constrained publication state.

A `document jsonb` column may retain validated, less frequently queried structured details, but core list/filter/sort fields stay typed. JSONB does not replace relational identity, constraints, provenance, or search columns.

Unique constraints cover `(entry_id, version_number)` and `approved_candidate_id`. An application/database guard prevents update or ordinary delete after insertion.

The active pointer must reference a publication belonging to the same entry. Implement this with a composite unique key on publication `(id, entry_id)` and a composite foreign key from entry `(active_publication_id, id)`.

### `catalogue.contact_points`

Repeatable, immutable contact methods attached to a publication.

- kind (`phone`, `email`, `website`, `textphone`, or `other`)
- label, display value, normalized value where appropriate, and opening/access notes
- evidence foreign key
- display order

Do not place telephone/email arrays in JSONB because detail rendering, safety review, and future contact validation need row-level evidence.

### `catalogue.delivery_locations`

Physical or virtual places where support is explicitly delivered.

- type (`physical` or `virtual`)
- name, address lines, locality, town, postcode, and optional WGS84 coordinates
- accessibility/opening notes and evidence foreign key

Administrative provider addresses are not inserted as delivery locations unless the source explicitly says support is delivered there.

### `catalogue.coverage_areas`

Areas a publication explicitly says it serves.

- type (`town`, `local_authority`, `named_area`, `remote`, or `other`)
- canonical code/URI when available, name, free-text extent, and evidence foreign key

V1 does not require PostGIS. Add geometry only when an admitted source provides meaningful polygons or a proven query needs them.

### `catalogue.source_actions`

Source-backed actions such as apply, request support, referral, authoritative details, or emergency guidance.

- kind, label, HTTPS URL or non-link instruction, safety prominence, and evidence foreign key

Actions remain distinct from general contact points so the interface can make the correct next step obvious.

### `catalogue.classifications`

Reviewed classification assignments attached to a publication.

- scheme key, term key/name, optional authoritative URI/version
- assignment origin (`source` or `editorial`)
- evidence/review reference

This avoids presenting editorial concepts as ORUK taxonomy terms. A later search decision defines the initial scheme and mappings.

### `catalogue.search_documents`

A replaceable projection of the active publication for deterministic search.

- one row per active publication
- weighted searchable text inputs and generated/stored `tsvector`
- normalized place terms and reviewed synonym/classification inputs
- projection version and build time

Use a GIN index on the `tsvector`. Search weighting, ranking, and explanation rules are defined in `docs/search.md`. The projection can be rebuilt without changing catalogue truth.

## Referential and transactional invariants

1. Every candidate belongs to one admitted source page and one fetch observation.
2. Every approved publication traces to exactly one approved candidate and review decision.
3. Every public fact has field evidence or is an explicitly versioned application calculation.
4. A catalogue entry has zero or one active publication.
5. The active publication belongs to that entry.
6. Publication content and child rows are immutable after activation.
7. Failed fetches and runs cannot update the active-publication pointer.
8. Candidate replay is idempotent through its unique canonical identity.
9. Publication approval and active-pointer switching are atomic.
10. Search projection failure cannot roll back or duplicate a publication.

Foreign-key columns receive indexes because PostgreSQL does not create them automatically. Composite and partial indexes must follow observed queries, with the first planned examples:

- active catalogue entries by lifecycle and updated time;
- pending candidates by review status and creation time;
- latest fetch observations by source page and retrieval time;
- unresolved source-health states;
- GIN index for active search documents.

Do not add indexes speculatively beyond the documented access paths; verify later with `EXPLAIN (ANALYZE, BUFFERS)` and production-shaped data.

## Security boundary on Supabase

V1 does not use Supabase Auth or direct browser access to the Data API.

- Keep `ingest` and `catalogue` outside the list of exposed Data API schemas.
- Revoke default object privileges and grant the server runtime only the operations its repositories require.
- Disable the Data API if no Supabase client features need it; otherwise expose only a dedicated `api` schema.
- If any object is exposed later, grant access explicitly and enable RLS with policies matching the actual public/read or reviewer/write model.
- Never place the Supabase secret/service-role key in browser code or a `NEXT_PUBLIC_` variable.
- Avoid `security definer` functions unless a separately reviewed use case requires them; keep them outside exposed schemas and revoke default `PUBLIC` execution.

Current Supabase guidance distinguishes grants (object reachability) from RLS (row visibility) and recommends a dedicated API schema for an auditable surface. The May 2026 platform change also made new Data/GraphQL API exposure opt-in by default, but migrations still revoke defaults explicitly so behaviour is consistent across project vintages. See [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api) and [Tables and data](https://supabase.com/docs/guides/database/tables).

## PostgreSQL choices

- Use lowercase snake-case identifiers.
- Use `text` unless a real length constraint exists.
- Use `timestamptz` for all instants.
- Use text plus check constraints for workflow values that may evolve; avoid database enums in v1.
- Use `numeric` only for explicitly structured money; source cost prose remains text.
- Use `jsonb` only for validated boundary/detail payloads that are not relational query keys.
- Use built-in PostgreSQL full-text search and GIN before adding an external search service or vector extension.
- Do not enable PostGIS, pgvector, Realtime, Storage, or Auth until a resolved requirement needs them.

The model follows current official guidance for [identity columns](https://www.postgresql.org/docs/current/ddl-default.html#DDL-DEFAULT-GENERATED), [constraints and foreign keys](https://www.postgresql.org/docs/current/ddl-constraints.html), [multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html), [partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html), and [PostgreSQL full-text search on Supabase](https://supabase.com/docs/guides/database/full-text-search).

## Repository interfaces

Framework code depends on purpose-specific interfaces rather than a database client:

```ts
interface SourceIngestionRepository {
  beginRun(input: BeginRunInput): Promise<IngestionRun>;
  recordFetch(input: RecordFetchInput): Promise<FetchObservation>;
  findOrCreateCandidate(input: CandidateInput): Promise<CandidateResult>;
  completeRun(input: CompleteRunInput): Promise<IngestionRun>;
}

interface CatalogueReviewRepository {
  getReviewItem(candidateId: CandidateId): Promise<ReviewItem | null>;
  approve(input: ApproveCandidateInput): Promise<Publication>;
  reject(input: RejectCandidateInput): Promise<ReviewDecision>;
}

interface ServiceDiscoveryRepository {
  search(input: SearchRequest): Promise<PaginatedResult<SearchResult>>;
  getByPublicId(id: CatalogueEntryPublicId): Promise<ServiceDetails | null>;
}
```

Input/output types belong to the application/domain boundary. SQL row types remain inside repository adapters. External ORUK/Tameside DTOs remain inside source adapters.

## Deferred decisions

- Exact SQL/migration syntax is implementation work and will be tested against the chosen local Supabase/Postgres version.
- Search weights, synonym rules, classification schemes, explanations, and evaluation thresholds are defined in `docs/search.md`.
- Feedback-report storage and reviewer authorization belong to the operations decision.
- Postcode lookup and the v1 prohibition on distance/spatial claims are defined in `docs/research/location-postcode.md`.
- Embeddings/vector columns remain absent unless the separately evaluated semantic-search decision proves a v1 need.

## Verification plan

- Migration tests create a clean database and apply every migration in order.
- Schema tests verify primary/foreign/unique/check constraints and indexes on foreign keys.
- Transaction tests prove approval creates one immutable publication and atomically switches the active pointer.
- Concurrency tests prove duplicate candidate creation collapses under the unique constraint.
- Permission tests show anonymous/authenticated Data API roles cannot access private schemas.
- Repository contract tests run against PostgreSQL, not mocks alone.
- Query-plan tests/inspection cover the eventual search and review access paths with production-shaped fixtures.

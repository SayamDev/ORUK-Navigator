# Source admission and ingestion contract

**Status:** accepted v1 decision

## Purpose

ORUK Navigator ingests untrusted external information into a public discovery product. The ingestion boundary must preserve provenance, enforce licensing and safety constraints, tolerate source failures, and prevent automated fetches from silently changing or deleting reviewed public facts.

V1 uses a small allowlist of Tameside Council pages. The same contract also supports future machine-readable feeds through separate adapters.

## Pipeline

```text
Reviewed source manifest
        |
        v
Bounded fetch --> transport checks --> transient response
        |                                  |
        | failure                          v
        +--> health event          source-specific extraction
                                           |
                                           v
                                  boundary validation
                                           |
                         +-----------------+-----------------+
                         |                                   |
                    unchanged                         candidate change
                         |                                   |
                  refresh health                     reviewable diff
                                                             |
                                                    approve / reject
                                                             |
                                                             v
                                                   immutable publication
                                                             |
                                                             v
                                                        search index
```

The last approved publication remains visible until a reviewer approves a replacement or withdrawal. A failed fetch, missing page, parser failure, or changed page shape never means “delete the public entry.”

## Source admission

Every source page must have a reviewed source-manifest entry before any scheduled fetch. The manifest is configuration plus evidence, not a list of URLs discovered by crawling.

Required fields:

- stable internal source and source-page identifiers;
- publisher and dataset/content owner;
- canonical HTTPS URL and explicitly allowed redirect hosts;
- source type and adapter version;
- geographic scope and why it is relevant to Tameside;
- licence identifier, canonical terms URL, required attribution, and evidence-check date;
- confirmation that extraction, normalization, storage, indexing, public display, and redistribution are permitted;
- excluded content such as images, logos, maps, attachments, or third-party contributions;
- expected content type and maximum response size;
- refresh interval, timeout, retry ceiling, and contact/escalation route;
- review status, reviewer, approval timestamp, and next licence-review date.

Admission fails closed. A source without complete licence evidence, a supported access route, or a defined extractor remains disabled.

## Fetch boundary

Fetchers treat every response as untrusted.

- Only manifest-approved HTTPS origins and redirect targets are reachable.
- Hostnames and resolved addresses must be checked to prevent requests to private, loopback, link-local, metadata, or otherwise non-public networks.
- Requests use an identifiable user agent, timeouts, bounded retries with backoff, response-size limits, and a narrow accepted content-type list.
- Redirects, authentication challenges, status codes, content type, byte count, timing, and a raw response hash are recorded. The raw hash is diagnostic evidence, not the candidate identity, because publisher markup may contain request-varying content.
- HTML is parsed as data. Scripts, embedded instructions, forms, images, maps, downloads, and active content are never executed or copied.
- Raw responses are transient processing material. V1 retains the content hash and minimum field evidence required for review, not an indefinite copy of the entire page.
- Secrets, personal search text, and unnecessary response headers are never logged.

One source failure is one observation. It does not establish that a catalogue entry has closed or should be withdrawn.

## Adapter contract

Each source type implements the same conceptual boundary:

```ts
interface SourceAdapter {
  probe(manifest: AdmittedSource): Promise<SourceCapabilityReport>;
  fetchPage(input: FetchPageInput): Promise<FetchedSourcePage>;
  extract(input: FetchedSourcePage): Promise<ExtractionResult>;
}
```

`FetchedSourcePage` is a validated transport result. `ExtractionResult` is a discriminated outcome:

- `candidate`: a normalized candidate plus field evidence and warnings;
- `unchanged`: the content and extractor identity match the latest reviewed candidate;
- `rejected`: content was fetched but violates the expected contract;
- `failed`: a transport or processing failure prevented a trustworthy result.

External shapes stop at the adapter. Downstream review and publication consume normalized candidates, never arbitrary HTML or raw ORUK response objects.

## Candidate identity and idempotency

A candidate is uniquely identified by:

```text
source page ID + canonical extracted-content hash + adapter version + extraction-rules version
```

The canonical extracted-content hash is computed from a deterministic serialization of selected source evidence, normalized fields, and source actions after navigation chrome, scripts, styling, session values, and excluded content have been removed. The raw response hash remains attached to the fetch observation.

The database must enforce uniqueness for the candidate identity. Replaying equivalent extracted content through the same rules returns the existing candidate rather than creating another publication or duplicate review task.

A changed adapter or extraction-rules version intentionally produces a new candidate, even when the source response is unchanged, because the transformation itself may change public facts.

## Evidence and normalization

Every candidate contains:

- the source-page identity, fetch-observation identity, raw response hash, and canonical extracted-content hash;
- adapter and rules versions;
- extracted fields in the internal candidate schema;
- per-field evidence identifying the source section or minimal text fragment used;
- normalization operations applied to each field;
- omissions, warnings, and unsupported source content;
- extraction and retrieval timestamps.

Normalization may clean presentation, parse explicitly stated values, and map reviewed terms. It may not infer eligibility, availability, geography, opening times, cost, accessibility, or affiliation.

Provider address, delivery location, and coverage area remain separate. A Tameside page or Ashton-under-Lyne address does not automatically establish borough-wide availability.

## Review and publication

The workflow separates machine detection from public truth:

1. A new or materially changed candidate enters `pending_review`.
2. The reviewer sees field-level additions, changes, removals, warnings, source evidence, and the currently published values.
3. The reviewer may approve, reject, or request a source-manifest/extractor correction.
4. Approval creates an immutable publication version and atomically updates the catalogue entry’s active version.
5. Rejection records a reason and leaves the current publication unchanged.

An unchanged response may update `last_checked_at` and source health automatically. A changed hash never updates public catalogue fields automatically in v1.

Public records show both:

- **source checked:** when Navigator most recently fetched and evaluated the page successfully; and
- **publisher updated:** only when the publisher explicitly supplies an update date.

The two dates are never substituted for one another.

## Withdrawal and deletion

- `404`, `410`, timeout, DNS failure, redirect, empty content, or missing extraction target creates a health/review event; it does not delete the entry.
- An explicitly source-stated closure becomes a candidate change and requires review.
- A reviewer may publish a withdrawn version with a reason and effective time. The entry leaves default search but its provenance and publication history remain available for audit.
- Source revocation or licence withdrawal suspends public display immediately while preserving restricted audit metadata needed to explain the action.
- Physical deletion is reserved for unlawful retention, accidental secret/personal-data ingestion, or an approved retention operation. It is not a normal synchronization outcome.

V1 does not infer deletions by comparing one run’s observed URL set with a prior run because the source set is a curated manifest, not a complete feed snapshot.

## Staleness and source health

Source health and catalogue lifecycle are different dimensions.

Source health states:

- `healthy`: the latest scheduled check succeeded and matched the expected contract;
- `changed`: a candidate is awaiting review;
- `stale`: no successful contract-valid check has occurred within the manifest’s freshness window;
- `unreachable`: the latest bounded fetch failed;
- `invalid`: content was reachable but failed transport, structure, or extraction validation;
- `suspended`: fetching or publication is disabled by an operational, safety, or licensing decision.

A catalogue entry may remain active while its source is stale or unreachable, but the public interface must disclose the condition. V1 search ranking does not use freshness as a relevance signal and may not hide a result solely because of one failed check; see `docs/search.md`.

## Run state and observability

Every scheduled or manual ingestion run records:

- run ID, trigger, adapter version, and rules version;
- start/end time, duration, and final state;
- manifests considered, skipped, fetched, unchanged, changed, rejected, and failed;
- candidates created, review items opened, publications activated, and withdrawals approved;
- response and validation failure categories;
- bounded retry counts and source-health transitions.

Run states are `running`, `succeeded`, `succeeded_with_warnings`, or `failed`. A run can succeed with warnings when some independent pages fail but every failure is recorded and prior publications remain safe.

Logs use identifiers and structured error codes. Raw page bodies, secrets, personal contact names that are excluded from publication, and user search text are not logged.

## Transaction boundary

Candidate creation, review decisions, and publication activation are distinct transactions.

- Candidate creation atomically claims its idempotency identity and stores evidence/warnings.
- Approval atomically creates the immutable publication and switches the active version.
- Search-index updates consume committed publication events and are retryable. A failed index update must not roll back or duplicate the approved publication; it remains observable and repairable.

The exact PostgreSQL tables and event mechanism are chosen in the persistence decision. This contract requires unique constraints, immutable version history, and an atomic active-version switch.

## Failure behaviour

| Failure | Required behaviour |
| --- | --- |
| Timeout, DNS, or connection failure | Record `unreachable`; preserve the last publication; retry only within configured bounds. |
| Unexpected redirect or host | Stop before following an unapproved destination; mark invalid/review required. |
| Oversized or wrong content type | Abort processing; record invalid response without persisting the raw body. |
| Page structure changed | Produce a rejected/changed candidate with evidence; keep the last publication active. |
| One field disappears | Show it in the review diff; never silently replace it with an assumption. |
| Licence evidence expires or is revoked | Suspend the source/publication according to the legal review; do not continue scheduled ingestion. |
| Database write fails | Mark the run failed; do not acknowledge candidate/publication success. |
| Search indexing fails | Keep the committed publication, expose degraded health, and retry index projection idempotently. |
| Process crashes mid-run | A later run may safely replay because candidate identity and publication activation are idempotent. |

## Security and privacy constraints

- Source manifests are controlled repository/database configuration, never supplied by public API callers.
- Extracted text is rendered as text; source HTML is never injected into the interface.
- Contact data is admitted only when the council page clearly presents it as a public service contact. Personal update contacts and unrelated page content are excluded.
- Correction reports cannot mutate catalogue data automatically.
- Review tools must not expose full raw source responses when the minimum evidence is sufficient.

## Verification requirements

Tests must cover:

- source admission fails closed when required evidence is absent;
- SSRF/redirect, size, content-type, timeout, and retry boundaries;
- deterministic extraction from pinned, independently authored fixtures;
- candidate idempotency and replay after interruption;
- unchanged, changed, rejected, and failed outcomes;
- review approval/rejection and atomic active-version switching;
- failure and missing pages preserving the last publication;
- withdrawal and licence suspension behaviour;
- structured run metrics without raw-body or secret leakage;
- search-index projection retry without duplicate publications.

## Consequences

This model is deliberately slower than unattended scraping. It is appropriate because v1 has a small curated catalogue, source pages lack stable machine contracts, and a wrong automated update could misdirect somebody seeking support. The review boundary can be relaxed for a future licensed feed only after its stable identifiers, deletion semantics, validation, and contract tests justify a new recorded decision.

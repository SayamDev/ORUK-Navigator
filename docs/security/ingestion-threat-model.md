# Ingestion trust boundary and threat model

**Status:** implemented for the five-page Tameside pilot
**Last reviewed:** 16 September 2026
**Related:** GitHub issue #15, `docs/ingestion.md`, `docs/research/initial-source-manifest.md`

## Boundary and assets

Council responses cross from an external network into a process that can create review candidates. They are untrusted even though the hostname is controlled by a public authority. The protected assets are the private network, database credentials, reviewed publication history, public catalogue integrity, operational availability, and source/licence evidence.

The browser cannot choose a fetch URL. Scheduled and manual checks receive one of five repository-controlled manifests; each manifest fixes the canonical HTTPS URL, permitted redirect host, parser/rules version, timeout, retry ceiling, response-size ceiling, content types, licence evidence, and approval state.

## Principal abuse cases and controls

| Threat | Abuse case | Implemented control |
| --- | --- | --- |
| Spoofing | DNS or redirects move a reviewed URL to another service | Resolve every requested/redirected host; reject any private, loopback, link-local, metadata, reserved, documentation, multicast, or otherwise blocked address; allow only HTTPS and the reviewed hostname |
| Tampering | Changed markup silently overwrites public facts | Deterministic field selectors and canonical hashes produce a pending candidate; only a reviewer can activate an immutable publication |
| Repudiation | A change cannot be traced to its source or reviewer | Persist fetch observation, raw-response hash, canonical content hash, field evidence, adapter/rules versions, append-only review decision, and immutable publication version |
| Information disclosure | Raw pages, transport internals, or unrelated contacts enter logs/database | Never store raw bodies; redact underlying network errors; remove active/excluded content; store minimal reviewed excerpts; restrict run summaries to bounded counts/booleans |
| Denial of service | Slow, oversized, retrying, or redirecting responses exhaust workers | Timeout, streamed byte ceiling, three-redirect ceiling, bounded retries/backoff, narrow content types, and no page discovery/crawling |
| Elevation of privilege | Source HTML or browser code reaches privileged database operations | HTML is parsed as inert data; scripts/forms/iframes are removed; actions require safe HTTPS URLs; private schemas and server-only repositories retain least privilege |

## Failure safety

- A timeout, unreachable page, rejected response, or parser failure records source health but never changes the active publication.
- Candidate replay is idempotent across process interruption.
- Approval and active-version switching are atomic.
- Search projection happens after approval through a durable, idempotent job. Projection failure leaves the approved publication committed and visible through the catalogue repository; retry creates one search document.
- Reviewed withdrawal creates another immutable publication version. Licence/source suspension disables ingestion and suspends related active entries without deleting evidence or history.

## Residual risks and launch gates

DNS validation followed by the platform fetch has a time-of-check/time-of-use gap. The risk is constrained because URLs and hosts are repository-controlled council infrastructure rather than caller-supplied domains. Before broadening source admission to public/user-controlled hosts, use a connection agent that resolves once and pins the validated address or an outbound filtering proxy.

The fixtures are independently authored contract fixtures, not archived council HTML. A maintainer must compare each selector and extracted field with the live reviewed page immediately before first production ingestion. Licence evidence must be re-reviewed by its configured date, and the documented commercial-reuse clarification remains unresolved.


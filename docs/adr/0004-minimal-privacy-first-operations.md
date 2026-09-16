# ADR 0004: Use a minimal privacy-first operating model

- **Status:** accepted
- **Date:** 2026-09-16
- **Decision owners:** ORUK Navigator maintainers
- **Related:** GitHub issue #10, `docs/operations.md`, `docs/ingestion.md`

## Context

ORUK Navigator publishes reviewed support information derived from external sources. Source failure, stale data, and incorrect contact/access facts can affect people seeking help. The project therefore needs an actionable correction and health loop. It also has a free-first constraint, no 24/7 support organisation, and no user need to surrender identity or case details.

A generic feedback inbox would make changes hard to audit. A full administration/case-management product would expand cost, access-control, privacy, and support obligations far beyond v1. Capturing search narratives or reporter contact details would create risk without being required to correct catalogue facts.

## Decision

V1 will use a small, structured, privacy-first operating model:

- anonymous catalogue correction reports with a fixed reason, optional bounded text, and no contact field or attachments;
- server-side validation, rate limiting, short abuse-key retention, and no automatic catalogue mutation;
- an explicit triage/review state machine linked to the existing evidence-backed publication workflow;
- source-health states separate from service availability and catalogue lifecycle;
- structured allowlisted events, bounded metrics, PostgreSQL health/run history, hosting metrics, and GitHub Actions summaries;
- symptom/action-based notifications with a runbook, not a 24/7 paging promise;
- no storage or logging of search narratives or submitted postcodes;
- time-bounded correction text/log/run retention and durable minimal decision evidence; and
- a launch gate requiring named primary/fallback owners, a monitored role channel, tested restore, and exercised alerts.

V1 does not add a paid observability platform, reporter account, publisher portal, behavioural analytics, session replay, CAPTCHA, or distributed tracing. Those require measured evidence and a separate decision.

## Alternatives considered

### Email-only feedback

Simple to publish, but it collects identities by default, invites sensitive case details, has weak linkage to publication versions, and produces no reliable queue/retention state. Rejected as the primary correction workflow. The role inbox remains an operator notification destination, not the public data model.

### Full reviewer/publisher administration application

Would support rich assignment and communication, but adds authentication, authorization, audit, privacy, and maintenance work before the five-source pilot proves the need. Deferred.

### Store search analytics and reporter contact details

Could make follow-up and query tuning easier, but the same goals can begin with a versioned evaluation set, result-count bands, and source-linked corrections. The privacy cost is disproportionate. Rejected for v1.

### Paid APM and session replay

Could speed some diagnosis, but adds cost and risks capturing sensitive public-service searches. The initial single-application topology can answer its on-call questions with structured events, platform metrics, PostgreSQL records, and scheduled-job summaries. Deferred until a measured gap exists.

## Consequences

- The correction journey can launch without creating user accounts or storing reporter identities.
- Maintainers can trace a public fact to its source, correction, review, and immutable publication decision.
- People cannot receive a personal outcome update in v1; the product must state this honestly.
- The project must implement and test retention deletion, abuse protection, degraded health rendering, notification deduplication, and restore/rebuild procedures before launch.
- Public launch depends on real human ownership; automation does not substitute for a named maintainer.
- Operating targets are not presented as SLAs until staffing and production evidence support that claim.

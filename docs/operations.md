# Feedback, data health, and operational support boundary

**Status:** accepted v1 operating model  
**Last reviewed:** 16 September 2026  
**Related:** GitHub issue #10, `docs/ingestion.md`, `docs/data-model.md`, ADR 0004

## Purpose

ORUK Navigator can only be public when a maintainer can tell whether its reviewed information is still trustworthy, respond to corrections, and explain degraded source health. V1 needs a small operable loop, not a publisher administration suite or a store of personal casework.

## Service boundary

V1 operates three public capabilities:

1. search the latest approved catalogue publications;
2. follow an authoritative publisher source; and
3. flag a possible data problem for human review.

Navigator does not accept support applications, determine eligibility, contact services on a user’s behalf, or provide an emergency response. The public correction route is about catalogue facts only.

Public launch is blocked until the repository names:

- one primary maintenance owner and one fallback owner;
- one monitored, role-based correction channel;
- the days/hours in which corrections are reviewed; and
- an incident contact available to the hosting and source owners.

There is no 24/7 on-call promise in v1. If those owners are unavailable, the correction form is disabled and users are directed to the authoritative source; search may remain available only while source-health disclosures are current.

## Correction workflow

```text
Public report
    |
    v
validate + rate limit + create reference
    |
    v
triage: data issue / source issue / safety issue / spam
    |
    +--> no catalogue change: explain and close
    |
    +--> source differs: create or link extraction candidate
    |                       |
    |                       v
    |                  normal review and publication
    |
    +--> urgent harmful information: suspend entry or add reviewed warning
```

### Public input

The form accepts only:

- catalogue entry and active-publication identifiers supplied by the server;
- one fixed reason: incorrect, outdated, closed, wrong service, or other; and
- optional plain text, maximum 1,000 Unicode characters.

The form tells people not to include names, contact details, health details, benefits information, case numbers, or other sensitive data. It has no attachment field and does not require an account, email address, or postcode.

Client validation improves usability; the server repeats allowlist, length, normalization, and identifier checks. React renders report text as text. Submissions are rate limited by a coarse abuse-control key; the raw key is not stored with the report. A hidden honeypot and bounded request size may reject obvious automation. CAPTCHA is deferred unless measured abuse justifies its accessibility and privacy cost.

### Review states

Reports move through `new`, `triaged`, `investigating`, `resolved`, `rejected`, or `duplicate`. Every transition records time, actor, reason code, and related candidate/publication when applicable.

A report never edits public data automatically. A source-backed change follows the candidate, evidence, review, and immutable-publication process in `docs/ingestion.md`. When information may cause immediate material harm—such as an incorrect urgent contact route—a reviewer can suspend the catalogue entry while evidence is checked.

Targets are operating objectives, not public SLAs:

- acknowledge creation immediately with a non-sequential reference;
- triage on the next two staffed working days;
- review a credible harmful-information report on the next staffed working day; and
- link or close duplicates instead of creating parallel investigations.

V1 does not send reporters an outcome because it collects no contact channel. The reference can support a future privacy-reviewed status lookup, but that lookup is not in v1.

## Source-health model

Source health describes Navigator’s ability to check a source, not whether the service is open or available.

| State | Meaning | Public behaviour | Operator action |
| --- | --- | --- | --- |
| `healthy` | Latest scheduled check met the source contract | Show checked date | None |
| `changed` | Reviewed fields differ and await a decision | Keep last approved publication; show checked date | Review diff |
| `stale` | No contract-valid success inside the configured freshness window | Keep publication with a visible stale warning | Investigate during staffed hours |
| `unreachable` | Latest bounded fetch failed | Preserve publication; disclose that the source could not be checked | Retry on schedule; inspect repeated failure |
| `invalid` | Response violated transport/extraction expectations | Preserve publication; disclose degraded checking | Inspect source/adapter before retrying |
| `suspended` | Fetching or publication stopped for safety, licence, or operational reasons | Remove from default search or show a reviewed suspension message | Resolve the named gate |

One failed run does not page a person or imply closure. A ticket is created when a source has two consecutive scheduled failures, becomes stale, or produces a material candidate. Immediate maintainer notification is reserved for licence/safety suspension, all-source ingestion failure, search unavailability, or public exposure of information that should not have been stored.

## On-call questions and signals

Instrumentation must answer these questions without capturing user search text:

1. Did each admitted source receive a contract-valid check inside its freshness window?
2. Which stage failed—fetch, validation, extraction, persistence, review projection, or search indexing?
3. Is the public search/detail journey failing or materially slower than its baseline?
4. Are correction reports being accepted, abused, or left untriaged?

### Structured events

Use stable JSON events with a generated correlation ID and allowlisted fields:

- `ingestion_run_started`, `ingestion_run_finished`;
- `source_check_finished`, `source_health_changed`;
- `candidate_created`, `review_decision_recorded`, `publication_activated`;
- `search_request_finished` with result-count band and duration only;
- `correction_report_created`, `correction_report_state_changed`; and
- `security_input_rejected` with a bounded reason code.

Allowed fields include internal non-personal identifiers, adapter/rules version, route template, duration, outcome code, retry count, source-health transition, and correlation ID. Never log raw search narratives, postcodes, report free text, source response bodies, email/telephone values, IP addresses, cookies, authorization headers, or full URLs containing user input.

### Metrics

Keep label sets bounded:

- scheduled source checks by outcome and source key;
- age of last successful check;
- ingestion duration and failure stage;
- pending review/correction counts and oldest age;
- public request rate, error rate, and duration by route template/status class; and
- search result-count bands (`0`, `1–5`, `6+`), never query terms.

V1 does not require a paid telemetry vendor or distributed tracing platform. Hosting request/error metrics, structured application events, PostgreSQL run/health records, and GitHub Actions summaries are sufficient for the small single-application topology. OpenTelemetry is reconsidered when a second deployed service or measured diagnostic gap appears.

## Automation and alerts

- The `source-freshness` GitHub Action checks each of the ten approved pages through the authenticated, single-source production endpoint. It uses the existing maintenance URL and secret; the database credential stays server-only in Vercel. Its weekly schedule is temporarily paused after the 24 September 2026 live extraction failure; maintainers can dispatch controlled retests. A changed source creates a review candidate, never an automatic publication.
- The `operations-maintenance` action runs afterward to reconcile source alerts and retention. Both workflows share a concurrency group so they cannot overlap.
- Concurrency prevents overlapping runs for the same environment.
- Every run produces a machine-readable summary and a human-readable job summary without source bodies or user input.
- A deduplicated GitHub issue is opened or updated for actionable ticket conditions; recovery closes or annotates the same issue.
- A public health page reads bounded, non-sensitive state from the catalogue/health projection. It never exposes stack traces, internal hosts, retry schedules, or security details.
- Every alert links to `docs/runbooks/ingestion-health.md` and names the affected source/state.

Alert thresholds are initial operating hypotheses and must be reviewed after four weeks of real runs. No alert is called an SLA until staffing and observed baselines justify it.

## Retention and deletion

| Data | Retention | Reason |
| --- | --- | --- |
| Search narrative and submitted postcode | Not stored or logged | Not required after a response |
| Correction free text | Delete 30 days after closure, or after 90 days if still open and escalate the unresolved record | Minimise accidental personal data |
| Correction category, timestamps, outcome code, referenced publication | 12 months after closure | Detect repeated data-quality problems and audit decisions |
| Rate-limit/abuse key | Rolling maximum 24 hours | Prevent short-lived automated abuse |
| Raw fetched body | Transient processing only; delete after extraction or failed bounded processing | Hash/evidence is sufficient for normal review |
| Minimal field evidence, candidate, review decision, immutable publication | For the life of the project/licence unless deletion is legally required | Explain published facts and decisions |
| Structured application logs | 30 days | Incident diagnosis with low privacy exposure |
| Ingestion runs and source-health transitions | 12 months | Seasonal/repeated-failure analysis |
| CI job logs/artifacts | 30 days where configurable | Reproduce recent automation failures |

Deletion jobs are idempotent and report counts, not deleted content. A suspected personal-data or secret ingestion bypasses ordinary retention: suspend access, preserve only evidence required for the incident/legal decision, and execute an approved targeted deletion.

## Public technical status

The public product shows:

- that coverage is a limited independent pilot;
- the publisher and authoritative source for every entry;
- when Navigator last checked the source;
- stale, unreachable, invalid, or suspended checking states in plain language;
- the current catalogue build/publication time; and
- a link to a public technical status page and repository incident history when those exist.

It does not show an “official”, “verified”, availability, eligibility, confidence, or uptime badge. Internal health details are not repackaged as service quality claims.

## Backup and recovery minimum

- Managed PostgreSQL backups must be enabled before production data is accepted.
- Source manifests, adapters, schemas, migrations, and fixtures remain reproducible from Git.
- Immutable publications, review decisions, licence evidence, corrections, and source-health history are included in backup scope.
- Restore is rehearsed before launch and every six months; the result and recovery time are recorded.
- A failed search projection can be rebuilt from active immutable publications.
- Recovery never promotes an unreviewed candidate.

V1 recovery objectives are provisional until a hosting plan is selected: target RPO 24 hours and target RTO one staffed working day. These are engineering targets, not public commitments.

## Launch acceptance

- Named primary/fallback owners and monitored correction channel exist.
- Correction submission, validation, rate limiting, retention, and review state transitions are tested.
- Search text and postcode are absent from application, hosting, analytics, and error logs.
- Each health transition and an all-source failure have been induced in a non-production environment and found through documented signals.
- Ticket and immediate-notification routes have been test-fired.
- The public interface accurately renders every degraded health state.
- Backup restore and search-projection rebuild have been rehearsed.
- The runbook can be followed by someone other than its author.

## Deferred

- reporter accounts, contact capture, attachments, messaging, and case management;
- a publisher self-service administration portal;
- 24/7 on-call or public uptime SLA;
- paid observability, behavioural analytics, session replay, and raw-query analytics;
- CAPTCHA without measured abuse; and
- cross-service distributed tracing before the topology requires it.

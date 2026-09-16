# Runbook: ingestion and source health

**Audience:** ORUK Navigator maintainer  
**Use for:** stale, unreachable, invalid, suspended, all-source failure, or search-projection failure

## First checks

1. Record the correlation/run ID and affected source key from the alert. Do not copy raw response bodies, search text, postcodes, or report free text into an issue.
2. Check the latest ingestion-run summary and source-health transition.
3. Confirm whether the last approved publication remains available. A failed fetch must not delete or replace it.
4. Classify the failure stage: schedule, fetch, transport contract, extraction, persistence, review projection, or search indexing.

## Safe response

- **One transient fetch failure:** leave the last publication active and allow the next bounded retry/schedule.
- **Two consecutive failures or stale source:** keep the deduplicated ticket open, verify the canonical source manually, and check for a publisher change.
- **Unexpected redirect, wrong content type, oversized response, or page-shape change:** do not loosen the allowlist automatically. Suspend fetching if necessary and update the manifest/adapter only through review.
- **Material source change:** create/review a candidate. Never edit public catalogue fields directly.
- **Search projection failure:** keep the committed publication, retry the idempotent projection, and verify result/detail parity.
- **Licence, harmful information, secret, or personal-data exposure:** suspend affected publication/access, notify the primary and fallback owner immediately, preserve minimum incident evidence, and use an approved targeted deletion if required.

## Recovery evidence

Close or downgrade the alert only after recording:

- a new contract-valid source check or an explicit suspension decision;
- the final health transition;
- whether a candidate/review/publication changed;
- search/detail verification when a projection changed; and
- follow-up work with an owner and due date.

Never mark a service closed, unavailable, eligible, or safe based solely on technical source health.

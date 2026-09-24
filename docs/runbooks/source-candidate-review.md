# Runbook: private source-candidate review

**Status:** reviewer decision path implemented; not a substitute for the council-page comparison. The first production check on 24 September 2026 created no candidates because live markup failed the extraction contract. Resolve [the source-check incident](https://github.com/SayamDev/ORUK-Navigator/issues/47) before expecting a live queue.

## Access boundary

Only a repository maintainer with GitHub Actions write access can dispatch **Review source candidate**. Its Vercel endpoint accepts a separate `REVIEW_WORKFLOW_SECRET`, never the maintenance secret. The database and candidate payload remain server-side. GitHub Actions stores the decision, candidate ID and reason; never enter private user details in the reason. The public repository must not contain candidate payloads or source-page copies.

Configure a unique random value of at least 32 characters as `REVIEW_WORKFLOW_SECRET` in Vercel Production and GitHub Actions. It must differ from `OPERATIONS_MAINTENANCE_SECRET`. The workflow reuses the approved production origin in `OPERATIONS_MAINTENANCE_URL`. Redeploy Production after adding the Vercel variable. If either secret is absent, the decision route fails closed.

## Inspect before deciding

In the **private Supabase SQL Editor**, use this read-only query. It shows a candidate alongside the currently published facts; do not paste raw results into a public issue or workflow log.

```sql
select candidate.id as candidate_id,
       page.key as source_key,
       page.canonical_url,
       page.health,
       observation.retrieved_at,
       observation.is_contract_valid,
       candidate.canonical_content_sha256 as expected_hash,
       candidate.adapter_version,
       candidate.rules_version,
       candidate.warnings,
       candidate.normalized_payload as proposed_facts,
       publication.name as published_name,
       publication.description as published_description,
       publication.document ->> 'area' as published_area,
       publication.access_summary as published_access,
       publication.cost_summary as published_cost
from ingest.extraction_candidates candidate
join ingest.source_pages page on page.id = candidate.source_page_id
join ingest.fetch_observations observation on observation.id = candidate.fetch_observation_id
left join catalogue.entries entry on entry.slug = page.key
left join catalogue.publications publication on publication.id = entry.active_publication_id
where candidate.review_status = 'pending_review'
order by observation.retrieved_at desc, candidate.id desc
limit 25;
```

Open the canonical council page separately. Compare every proposed field, including eligibility-sensitive wording, access route, cost and urgent guidance, with the original source. Check the evidence and exclusions documented in `docs/ingestion.md`. A candidate hash is an identity/optimistic-lock value, not proof of correctness.

## Record a decision

Run **Review source candidate** from GitHub Actions. Enter the candidate ID, a decision, an evidence-based reason of 20–500 characters, and the 64-character expected hash when approving. `changes_requested` or `rejected` records the disposition and does not publish. `approved` is accepted only when the candidate is from the current reviewed extractor, the latest check was valid, the source and licence are approved, all required facts are present, and the hash still matches. Approval creates a new immutable publication and search projection. It does not use the maintenance credential.

After approval, verify the service detail, council source link, ORUK feed record and search result; confirm the warning state is consistent. If the workflow fails, inspect the private database decision/projection records rather than repeating the action blindly. A failed projection may leave an approved publication active and require the idempotent projection recovery procedure.

Do not approve the first live candidate merely to clear a warning. The seeded catalogue and live council pages must be compared by a human; if the proposed facts are incomplete or misleading, request changes and fix the extractor. The source-check schedule is paused until the live extractor is repaired. Keep public corrections disabled until the separately documented fallback-owner requirement is met.

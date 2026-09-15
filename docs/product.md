# ORUK Navigator product definition

**Status:** v1 product decision

**Launch area:** Ashton-under-Lyne and the wider Tameside borough

## Problem statement

People looking for local support must often translate a real-life need into the language and structure of several disconnected directories. Information can be incomplete, stale, difficult to compare, or unclear about whether a service is physically nearby, available borough-wide, or only linked from a local page.

ORUK Navigator will provide a small, transparent discovery experience for a reviewed selection of Tameside Council-published support information. It will use an ORUK-aligned internal model and retain evidence for every displayed fact. The pilot is intentionally partial: it must help with a bounded catalogue without implying that it represents every service in Tameside.

## Product proposition

> Find local support that fits your needs.

People can describe what they need in ordinary language, optionally refine the search, understand why results matched, and verify important details at the original source.

The product is an independent open-source project. It is not produced, endorsed, or maintained by Tameside Council, iStandUK, iNetwork, or Open Referral UK.

## Primary users

### Person looking for support

The v1 priority. They may be searching for themselves or somebody else, may not know the formal name of a service, and may be using a phone under stressful circumstances.

**Job to be done:** When I need practical support in Ashton-under-Lyne or Tameside, help me find a plausible next step and verify how to access it without making me understand council or taxonomy language.

### Service-data consumer

A developer, analyst, or public-sector practitioner assessing how source information was transformed and how the search reached its result.

**Job to be done:** Help me inspect provenance, coverage, limitations, and implementation decisions so I can judge whether the data and software are reusable.

### Technical or data publisher

A person responsible for publishing service information or maintaining a directory.

**Job to be done:** Show me how source data is admitted, normalized, attributed, monitored, and corrected without presenting Navigator as the authoritative publisher.

## Primary public journey

1. **Understand the scope.** The homepage states that Navigator searches a limited selection of Tameside Council-published information and links to the full data-sources explanation.
2. **Describe the need.** The person answers “What support are you looking for?” in plain language. They may optionally select or confirm Ashton-under-Lyne/Tameside as the area.
3. **Search without an AI dependency.** Navigator interprets text through deterministic lexical matching, reviewed synonyms, structured attributes, and source-backed geography. Optional semantic ranking may improve ordering but cannot create facts or be required to complete the task.
4. **Review calm, comparable results.** Each result shows the service name, concise source-derived description, location or coverage wording, relevant match reasons, source, freshness, and completeness status.
5. **Refine when necessary.** The person can change their words, remove a filter, broaden from Ashton-under-Lyne to Tameside, or browse reviewed needs/support types. Empty states suggest concrete changes.
6. **Inspect one result.** The detail view separates what the support provides, who it helps, where it is delivered, the area served, how to access it, contact details, cost, opening information, accessibility, source, freshness, and missing information.
7. **Verify and act.** The primary action opens the authoritative source or uses a source-provided contact method. The interface reminds the person to confirm time-sensitive details with the provider.
8. **Report a problem.** The person can report an incorrect, outdated, closed, misplaced, or otherwise problematic listing without creating an account or supplying unnecessary personal information.

## Information principles

- A source page is evidence, not proof that a service is currently available.
- “Located in Ashton-under-Lyne,” “serves Tameside,” and “available remotely” are different facts.
- Missing information remains missing. Navigator must not replace it with an assumption.
- Match explanations cite fields and reviewed rules that actually affected retrieval or ranking.
- “Data confidence” describes application-level completeness only. It is not ORUK validation, council approval, service quality, or availability.
- Every entry exposes its publisher, canonical source URL, retrieval/check date, licence, and any publisher-supplied update date.
- Coverage limitations remain visible near search and results, not hidden only in legal or technical documentation.

## User pain points addressed

- Not knowing the formal category or service name.
- Search interfaces that require directory-specific terminology.
- Confusing a provider address with the place where support is delivered.
- Results that do not explain why they appeared.
- Missing contact, cost, eligibility, opening, or accessibility information being presented as if known.
- Stale or copied information with no visible source.
- Dead-end “no results” pages.
- AI answers that sound authoritative but cannot be traced to source data.

## V1 scope

- A reviewed allowlist of clearly council-authored Tameside support pages admitted under documented OGL evidence.
- Ashton-under-Lyne as the default geographic centre, with borough-wide Tameside coverage represented only when the source states it.
- A source manifest, bounded extraction/normalization, content hashes, review diffs, and last-successful snapshots.
- Homepage search, results, deterministic ranking, filters supported by admitted data, service details, provenance, completeness, and correction reporting.
- A technical data-health view showing real ingestion outcomes and coverage gaps.
- Responsive, keyboard-operable, screen-reader-compatible interfaces.
- Automated tests for transformation, search, ranking evidence, completeness, API behaviour, source failure, and the core browser journey.
- Public documentation covering research, architecture, product/UX, ORUK alignment, search, automation, accessibility, security, testing, limitations, and ADRs.

## Non-goals for V1

- Claiming a comprehensive Tameside or UK service directory.
- Presenting Shropshire, Pennine Lancashire, or other regions as local Ashton/Tameside coverage.
- Scraping Action Together, Tameside SEND, NHS pages, or third-party documents without a supported contract and explicit reuse terms.
- Requiring paid AI, embeddings, mapping, analytics, or observability services.
- Providing emergency triage, clinical advice, eligibility decisions, or guaranteed availability.
- User accounts, profiles, saved sensitive narratives, case management, referrals, bookings, or a large publisher administration system.
- Claiming formal GDS compliance, official ORUK validation, or endorsement by a public body.

## V1 acceptance criteria

### Truth and provenance

- Every public catalogue entry has an admitted source-manifest record with publisher, canonical URL, retrieval date, licence evidence, required attribution, content hash, and reviewer status.
- Every displayed factual field maps to retained source evidence or an explicitly documented application calculation.
- Missing fields are labelled “Information not provided” or omitted where omission is clearer; they are never inferred.
- Coverage is described as a limited pilot on the homepage, results page, and data-sources page.
- No source failure deletes the last successful public snapshot.

### Search usefulness

- The core journey works when all semantic/AI providers are disabled.
- A versioned evaluation set covers exact needs, plain-language synonyms, vague requests, Ashton/Tameside place language, mixed needs, filters, and no-result cases.
- For every evaluation query, expected relevant entries and reasons are reviewed against admitted source content before becoming a test expectation.
- Each result exposes field-backed “Why this matched” evidence; an opaque model score is never the only reason.
- Search does not return inactive, rejected, unreviewed, or unlicensed entries.

### Public journey

- A person can complete search → results → detail → source/contact → correction report using only a keyboard.
- The same journey works at a 320 CSS-pixel viewport without horizontal scrolling or obscured controls.
- Search, validation, loading, no-result, source-unavailable, stale-data, and unexpected-error states provide a useful next action.
- Primary controls have visible labels, focus indication, status announcements, and touch targets of at least 44 by 44 CSS pixels.
- Automated accessibility checks report no serious or critical violations on the core pages, supplemented by documented manual checks.

### Reliability and operation

- Ingestion is idempotent for the same source version and records each run’s timing, counts, warnings, failures, and final status.
- Fetches use timeouts and bounded retries; failure preserves prior data and produces a stale/source-health state.
- Health output does not expose secrets, raw database errors, or personal information.
- Production uses HTTPS, contains no committed secrets, and requires no paid API for the core journey.

### Engineering evidence

- A clean checkout can install, migrate, seed with clearly fictional development fixtures, test, and build using documented commands.
- Continuous integration runs formatting/linting, strict type checking, unit tests, integration tests, a production build, and the practical accessibility/E2E checks.
- Architecture documentation and ADRs explain source admission, normalization, persistence, search, optional AI, provenance, deployment, accessibility, and failure handling.
- The README links to the live product and the evidence areas requested for architecture, product/UX, ORUK integration, search/AI, automation, accessibility, security, testing, and ADRs.

## Product success indicators

V1 defines measurements before adding analytics. It should collect only aggregate operational events that do not retain free-text searches or user circumstances.

- Search attempts that lead to at least one result.
- Zero-result rate by reviewed query category, not raw narrative.
- Result-to-detail and detail-to-authoritative-source action rates.
- Correction-report rate and resolution time.
- Catalogue entries by completeness band and source freshness.
- Successful ingestion rate, duration, and records requiring review.
- Search-evaluation pass rate across the versioned local test set.

## Stakeholder tensions

- **Public user vs publisher:** people need concise comparable information; publishers remain authoritative and may express information differently.
- **Discovery vs privacy:** natural-language input is useful, but it may reveal sensitive circumstances and should not be retained by default.
- **Breadth vs trust:** more scraped sources could increase result count while weakening licensing, freshness, and explainability.
- **Automation vs editorial control:** repeatable ingestion reduces maintenance, but HTML changes and third-party content require human review gates.
- **Innovation vs reliability:** semantic techniques may improve recall, but deterministic search must remain sufficient and inspectable.
- **Portfolio evidence vs user value:** technical features are included only when they improve discovery, trust, operation, or maintainability.

## Future opportunities

- Admit an Action Together export after written licensing and API/export guarantees.
- Add NHS Directory of Healthcare Services v3 as a separately labelled source after onboarding and terms review.
- Adopt a future licensed Tameside/Greater Manchester ORUK feed through the provider adapter without silently replacing existing provenance.
- Expand reviewed taxonomy mappings and semantic ranking only after evaluation shows a measurable retrieval problem.
- Add broader regional coverage one source at a time through the same admission and quality gates.

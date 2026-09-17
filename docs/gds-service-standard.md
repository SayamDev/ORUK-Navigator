# GDS Service Standard self-assessment

**Status:** honest self-assessment of a personal pilot, not an assessed service

This maps ORUK Navigator against the 14 points of the [GDS Service Standard](https://www.gov.uk/service-manual/service-standard). It is written the way a service assessment expects: evidence for what is done, and a plain statement of what is not.

A pilot built by one person cannot meet every point. Several points below are recorded as **not met**. That is the honest position, and pretending otherwise would fail the first principle of the standard.

| # | Point | Position |
| --- | --- | --- |
| 1 | Understand users and their needs | Partly met |
| 2 | Solve a whole problem for users | Partly met |
| 3 | Provide a joined-up experience across all channels | Partly met |
| 4 | Make the service simple to use | Met |
| 5 | Make sure everyone can use the service | Met |
| 6 | Have a multidisciplinary team | Not met |
| 7 | Use agile ways of working | Met |
| 8 | Iterate and improve frequently | Met |
| 9 | Create a secure service which protects users' privacy | Met |
| 10 | Define what success looks like and publish performance data | Partly met |
| 11 | Choose the right tools and technology | Met |
| 12 | Make new source code open | Met |
| 13 | Use and contribute to open standards, common components and patterns | Met |
| 14 | Operate a reliable service | Partly met |

## 1. Understand users and their needs — partly met

Three user groups and their jobs to be done are defined in [docs/product.md](product.md): a person looking for support, a service-data consumer, and a technical or data publisher. The primary journey is written from the first group's position, in their words rather than council or taxonomy language.

**Not met:** no research with real users has taken place. The needs are reasoned from the problem and from published council content, not observed. Before this became a real service it would need discovery research with people seeking support in Tameside, including people in crisis, people with low digital confidence, and assisted-digital routes.

## 2. Solve a whole problem for users — partly met

The journey runs from describing a need in ordinary language through to a verified next step at the publisher: search, match explanation, service detail with provenance, and a link to the authoritative council page. The service deliberately hands people to the publisher to act, rather than pretending to own referral.

**Not met:** coverage is ten reviewed services from one publisher, so most real needs end in no result. The interface says this plainly rather than implying completeness.

## 3. Provide a joined-up experience across all channels — partly met

Every result links back to the publisher's own page, so the online journey joins up with the council's telephone and in-person routes rather than competing with them. Source-checked dates are shown so people know how current the information is.

**Not met:** no work has been done with council contact-centre or front-door staff, and there is no offline or assisted route.

## 4. Make the service simple to use — met

One question in plain language ("What support are you looking for?"), with an optional place. Common searches are visible before typing, because people often do not know what exists; suggestions narrow as they type. After a search, focus and the viewport move to the results heading. Match explanations cite the field that caused the match, so a result is never unexplained. Empty states suggest concrete next words rather than dead-ending.

Evidence: [src/components/search-experience.tsx](../src/components/search-experience.tsx), [docs/search.md](search.md).

## 5. Make sure everyone can use the service — met

- WCAG 2.2 AA checks run automatically on every pull request, with axe-core through Playwright at desktop, 390px and 320px widths, and the build fails on any violation.
- Semantic HTML, labelled fields, visible focus, skip link, and keyboard journeys covered by tests.
- Atkinson Hyperlegible, a typeface designed for low-vision readers, for body text.
- Motion respects `prefers-reduced-motion`, and hover styling is limited to devices with a fine pointer so touch users do not get stuck hover states.

Evidence: [e2e/accessibility.spec.ts](../e2e/accessibility.spec.ts), [docs/accessibility-review.md](accessibility-review.md).

**Gap:** no testing with real assistive-technology users or a professional audit. Automated checks catch a minority of accessibility problems.

## 6. Have a multidisciplinary team — not met

One developer, with AI assistants used for implementation under review. No designer, user researcher, content designer, performance analyst or service owner. In a real service this is the point that matters most, and the work above is not a substitute for it.

## 7. Use agile ways of working — met

Work is planned and tracked as GitHub issues with a five-role triage vocabulary, delivered in small pull requests behind release gates, with decisions recorded as ADRs at the point they were made ([docs/adr](adr)). Scope was cut deliberately and repeatedly: semantic search deferred, correction intake disabled until someone could review reports, sources rejected when licence evidence was missing.

## 8. Iterate and improve frequently — met

Small, frequent, reviewed changes. Recent examples: the homepage rebuilt against the approved design after a fidelity review found it had drifted; the catalogue expanded from five to ten reviewed services; search matching fixed after live searching showed short words matching inside longer ones.

Each change ships only when quality, database, browser, accessibility and dependency gates pass.

## 9. Create a secure service which protects users' privacy — met

- Search text and location never enter the URL, logs or analytics; there is no analytics or tracking at all, and no cookies beyond what the platform requires.
- Per-request nonce Content Security Policy, plus hardened response headers, verified by browser tests.
- The database sits behind a private server-only boundary; no browser-exposed database credentials.
- Ingestion treats every fetched page as untrusted: allowlisted HTTPS origins, manual redirect validation, size, type, timeout and retry limits, and HTML parsed as data with scripts and forms never executed.
- Correction reports fail closed until an accountable owner and review hours are configured, and are rate-limited by a keyed hash rather than a stored address.
- Secret scanning, pinned GitHub Actions by commit hash, frozen dependency installation, and dependency review on every pull request.

Evidence: [docs/security/ingestion-threat-model.md](security/ingestion-threat-model.md), [src/proxy.ts](../src/proxy.ts).

## 10. Define what success looks like and publish performance data — partly met

Success is defined as source-backed retrieval quality: a versioned evaluation set of 18 source-backed cases, each asserting the reviewed services a query must retrieve within the first three results, run on every change. A public [technical status page](https://oruk-navigator.vercel.app/status) publishes source-checking health, and [feed interoperability](https://oruk-navigator.vercel.app/interoperability) publishes what Navigator and other ORUK feeds actually contain.

**Not met:** no usage or outcome data is published, because nothing about users is collected. A real service would need a privacy-preserving way to know whether people found help, agreed with the publisher and an analyst.

## 11. Choose the right tools and technology — met

Next.js on Vercel with PostgreSQL through Supabase, chosen for a small public service that must be cheap, portable and quick to deploy. Decisions were made against alternatives and recorded: a private PostgreSQL domain boundary ([ADR 0002](adr/0002-private-postgresql-domain-boundary.md)), deterministic search rather than embeddings ([ADR 0003](adr/0003-deterministic-search-baseline.md)), and semantic search deferred on measured evidence ([ADR 0005](adr/0005-defer-semantic-search.md)).

The measured position on AI: the deterministic baseline retrieves every expected result within rank three, so adding a model would add cost, latency and unexplainability without improving the measure. That is a decision about user need, not a rejection of the technology.

## 12. Make new source code open — met

The whole repository is public under an open licence, including research, decisions, runbooks and this assessment. Secrets are kept out by an automated scan over every tracked file, and configuration is supplied through environment variables.

## 13. Use and contribute to open standards, common components and patterns — met

- The internal domain model follows Open Referral UK v3.0 (HSDS-UK-3.0) concepts: service, organisation, service area, cost option, provenance.
- Navigator **publishes** an ORUK v3 feed at `/api/oruk/v3`, so reviewed council content becomes reusable data instead of pages other people re-key. It passes the required checks of the official ORUK validator.
- Navigator **reads** other published ORUK feeds and reports what they contain, without storing another publisher's records.
- `tools/OrukFeedCheck` is an open .NET checker any publisher can run against their own feed.

Evidence: [docs/oruk-feed.md](oruk-feed.md), [tools/README.md](../tools/README.md).

## 14. Operate a reliable service — partly met

A health endpoint, scheduled source-health and retention maintenance through GitHub Actions, alerting on source failures, a deployment and rollback runbook, and a rehearsed backup restore. Failure behaviour is defined so that a fetch failure never deletes reviewed public information; the last good publication stays visible with its condition disclosed.

**Not met:** no on-call rota, no uptime monitoring or error budget, and one person in the recovery path. The service states its limits rather than implying an operational guarantee.

## Summary

The strongest points are accessibility, privacy and security, open code, and open standards. The weakest are the human ones: no user research, no multidisciplinary team, and no operational rota. Those gaps are recorded here rather than papered over, because a service that overstates its readiness is the failure mode this project is built to avoid.

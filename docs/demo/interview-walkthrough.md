# Five-minute ORUK Navigator walkthrough

**Purpose:** demonstrate a small, honest public-service product and explain what is implemented versus still under review. Open the [live pilot](https://oruk-navigator.vercel.app/) before the interview and check [Technical status](https://oruk-navigator.vercel.app/status) for any source warnings.

## 0:00–1:00: The user task

“This is an independent Tameside pilot. It helps people find a reviewed selection of council information, not every service and not an eligibility decision.” Type a fictional need such as “money and debt advice”; use the suggestions if helpful. Show that the need and location are not copied into the URL.

## 1:00–2:00: Explainable results

Open a result and expand “Why this matched.” Explain that retrieval uses reviewed service fields, not a confidence score or an AI-generated eligibility claim. Follow the service detail link and point to the “Before you act” warning.

## 2:00–3:00: Traceable source and reusable data

On the detail page, show “Trace this entry”: the council source, the date the displayed information was reviewed, the separate technical-check date, and the matching [ORUK v3 feed record](https://oruk-navigator.vercel.app/api/oruk/v3). Explain that the feed is a publication of reviewed facts, not certification by ORUK or iStandUK.

## 3:00–4:00: Engineering boundary

Show the [architecture walkthrough](../architecture-walkthrough.md): allowlisted fetch, extraction evidence, human review, immutable publication and deterministic search. A changed or invalid source does not silently overwrite the public record. Point to the [first-run exercise](../operations/source-check-exercise-2026-09-24.md) as an honest example of a production integration check revealing a real issue.

## 4:00–5:00: Quality and next step

Mention the CI database, browser/accessibility, security and ORUK-feed gates. Be explicit that real participant testing, a human screen-reader pass, and source-extractor remediation are unfinished. Invite discussion about how a standards-based service directory can balance interoperability with editorial accountability.

Do not demonstrate a live source fetch or approval during an interview. Do not type a real person's sensitive circumstances into the search. Do not claim the pilot has complete coverage, real-time availability, official endorsement, or a completed human accessibility audit.

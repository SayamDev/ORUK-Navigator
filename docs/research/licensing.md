# ORUK licensing boundary for the regional pilot

**Decision status:** resolved with a safe boundary  
**Checked:** 15 September 2026  
**Scope:** ORUK specification artifacts and the proposed Pennine Lancashire pilot feed  
**Method:** first-party ORUK, Open Referral, publisher, and repository sources only. This is an engineering risk decision, not legal advice.

## Decision

ORUK Navigator may implement the ORUK interface and link to the official specification, but it must not vendor or redistribute ORUK schemas, OpenAPI documents, or documentation until the licence of the exact artifact and revision is recorded. The project should include ORUK's preferred attribution whether or not attribution is strictly required for a particular use.

Pennine Lancashire feed data must not be fetched into persistent storage, indexed, displayed, or redistributed in a public deployment until the publisher supplies an explicit licence or terms that cover those acts. Directory verification is not a licence grant. Until that evidence exists, development must use original synthetic fixtures; a live connection may only perform the minimum transient contract probe needed to identify the feed and its declared terms, without retaining service records.

## Specification and documentation

The current `LICENSE` in the official website/standard repository says that HSDS-UK and its associated documentation are licensed under BSD-3-Clause. Its conditions require preservation of the copyright notice, conditions, and disclaimer in source redistributions; binary redistributions must reproduce them in accompanying documentation/materials; and Open Referral UK/contributor names may not be used for endorsement without permission. It also gives this preferred attribution:

> Human Services Data Specification UK: an Open Referral UK resource (https://openreferraluk.org/)

Source: [current repository `LICENSE`](https://github.com/OpenReferralUK/oruk-standard-and-website/blob/main/LICENSE).

This is an intentional recent change, not merely GitHub's licence classifier: the merged ["License changes" pull request](https://github.com/OpenReferralUK/oruk-standard-and-website/pull/226) replaced CC BY-SA 4.0 with BSD-3-Clause for HSDS-UK and documentation on 27 January 2026. The [change commit](https://github.com/OpenReferralUK/oruk-standard-and-website/commit/e84e281fbe0641329d0b497bc423fca2cba146a1) also added a separate BSD file for website/application source code.

However, first-party statements remain inconsistent:

- the same repository's [README](https://github.com/OpenReferralUK/oruk-standard-and-website#license), the [official website footer](https://openreferraluk.org/), and the [validator README](https://github.com/OpenReferralUK/oruk-validator#license) still say HSDS-UK schemas/documentation use CC BY-SA 4.0;
- the standalone [ORUK specification repository](https://github.com/OpenReferralUK/ORUK-specification) contains generated UK schemas and OpenAPI output but, when checked, had no root licence file or GitHub-detected repository licence;
- that generation repository says its inputs include the international HSDS schemas. The international [HSDS specification licence](https://github.com/openreferral/specification/blob/3.2/LICENSE) is CC BY-SA 4.0, with attribution and ShareAlike obligations for shared copies/adaptations.

The January 2026 commit is strong evidence that the ORUK maintainers intended to relicense material in the website/standard repository. It does **not** conclusively establish that every generated artifact in the separate unlicensed repository is covered, that upstream rights were available for relicensing, or that the stale CC BY-SA statements were intentionally retained. The inconsistency is therefore only partially resolved.

### Safe implementation boundary

1. Implement request/response adapters from the public interface description; do not copy explanatory prose or schema bodies into Navigator.
2. Link to normative artifacts. If build-time validation needs them, download a pinned URL transiently and verify a recorded commit/hash; do not commit or redistribute the downloaded file.
3. If an exact artifact is copied later, record its source URL, commit/hash, retrieval date, licence file, copyright notice, required disclaimer, and whether Navigator modified it.
4. Pending clarification, treat copied/adapted schema or documentation material as CC BY-SA 4.0 where that is the more restrictive first-party statement, while also retaining the BSD notice associated with the exact source repository. Keep this material separate from application code so any ShareAlike obligation does not create ambiguity about the codebase licence.
5. Use the preferred ORUK attribution in product credits and developer documentation, link to the source artifact and its licence, state modifications, and do not imply ORUK endorsement.

### Exact maintainer follow-up

Open an issue in [OpenReferralUK/ORUK-specification](https://github.com/OpenReferralUK/ORUK-specification/issues) asking:

> Which licence applies to each current ORUK v3 generated JSON Schema and OpenAPI artifact in this repository? Does the 27 January 2026 BSD-3-Clause change in `oruk-standard-and-website` cover these generated artifacts, including portions derived from international HSDS licensed CC BY-SA 4.0? Please add an artifact-level `LICENSE`/`NOTICE` and update the website footer, website README, and validator README so the first-party statements agree.

No copied ORUK artifact should cross the boundary above until the answer is recorded.

## Pennine Lancashire pilot feed

The official [verified feed directory](https://openreferraluk.org/community/directory) identifies Pennine Lancashire ICP as publisher, Placecube as developer, and the feed as live Pennine Lancashire services data. The listed endpoint resolves to `https://penninelancs.openplace.directory/o/ServiceDirectoryService/v2`. The directory entry does not state a data licence or attribution requirement.

ORUK's [data-sharing guidance](https://openreferraluk.org/developers/data-sharing) says most service-directory data *should* be available under the Open Government Licence or an equivalent permitting legal commercial and non-commercial reuse. This is publisher guidance, not a grant over the Pennine Lancashire dataset. Likewise, [feed registration](https://openreferraluk.org/developers/register) checks standard compliance and publishes feed/publisher details; it does not require or expose a licence grant. Verification therefore establishes neither copyright/database reuse permission nor attribution terms.

The endpoint's hostname did not resolve during this investigation, so its current root metadata, headers, OpenAPI document, and any feed-specific terms could not be inspected. No first-party publisher page or ORUK registration record found in this investigation supplied a licence for the dataset. Consequently, there is presently no evidenced permission for Navigator to copy, normalize, retain, index, display, or redistribute it.

### Feed admission gate

Before enabling Pennine Lancashire—or any replacement feed—the connector registry must contain:

- the legal publisher and dataset owner;
- the exact feed base URL and dataset title;
- an explicit licence identifier and canonical licence/terms URL supplied by the publisher;
- confirmation that the licence covers extraction, normalization, persistent storage, search indexing, public display, and redistribution (including substantial portions/database rights where relevant);
- the required attribution statement, source link, modification notice, and licence link;
- any downstream restrictions, excluded fields, sensitive-data rules, retention/deletion duties, and a publisher contact;
- the date checked and evidence snapshot/hash.

Ingestion must fail closed when these fields are absent. Store the licence evidence with the feed configuration and render per-record source attribution plus a dataset-level credits/licensing page. Do not combine differently licensed feeds into a downloadable or redistributable aggregate until compatibility has been reviewed.

### Exact publisher follow-up

Ask the publisher, using a current organisational contact confirmed through the official ORUK directory or publisher site:

> Please identify the licence and canonical terms URL for the Pennine Lancashire ORUK feed at `https://penninelancs.openplace.directory/o/ServiceDirectoryService/v2`. Does it permit a third party to fetch, normalize, persist, index, publicly display, and redistribute the service records, including a substantial portion of the database? Please provide the required attribution wording, modification notice, source link, any field or sensitive-data exclusions, and any retention/deletion conditions.

If the publisher does not provide an explicit grant, select another verified regional feed only after it passes the same admission gate; do not relax the gate to meet the launch schedule.

## Build consequences

- Product and repository code can proceed using synthetic fixtures and independently authored adapters.
- No production data import, public search result, screenshot containing real records, cached raw payload, or downloadable dataset may use the Pennine Lancashire feed yet.
- A feed's `verified` status must never be presented as `licensed`, and a standard licence must never be presented as the data publisher's licence.
- The public product must expose source, publisher, licence, and last-checked information for every enabled feed.


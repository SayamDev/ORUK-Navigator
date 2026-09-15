# Tameside and Ashton-under-Lyne data route

**Decision date:** 15 September 2026

**Decision:** Launch with a small, explicitly curated catalogue of Tameside Council service pages that are covered by the council's Open Government Licence statement. Centre discovery on Ashton-under-Lyne and Tameside, preserve links and attribution to the source page, and label the catalogue as a limited pilot rather than a complete directory. Add NHS directory data only after obtaining an API key and satisfying the NHS syndication terms. Do not ingest Action Together, the Tameside SEND site, or Pennine Lancashire records until the relevant publisher supplies explicit reuse terms and a dependable export/API.

## Scope and method

This investigation used only first-party publisher material and bounded anonymous `GET` requests. It looked for a lawful, repeatable source of real services for Ashton-under-Lyne and the wider Tameside borough; Lancashire is secondary context, not substitute coverage. It did not copy or invent service records.

The checks distinguish four different facts which must not be conflated:

1. a page is publicly readable;
2. a machine-readable export exists;
3. the publisher grants reuse rights; and
4. the source is operationally dependable enough for scheduled ingestion.

Only a source that meets the relevant four tests should be enabled in a public product.

## Source decision matrix

| Source | Classification | Coverage and fields | Freshness/access | Licence and attribution | v1 decision |
|---|---|---|---|---|---|
| Open Referral UK verified-feed directory | **No native local feed** | The official directory had no Tameside or Greater Manchester feed at the prior project check. Pennine Lancashire is a different geography and its listed host did not resolve. | Pennine Lancashire was unreachable and failed the official validator; see the project's [feed validation](./feed-validation.md). | Directory listing/verification is not a data licence. The project's [licensing boundary](./licensing.md) requires explicit publisher permission before persistence or redistribution. | Do not use as Tameside coverage. Keep the ORUK adapter architecture and synthetic fixtures, and re-evaluate if a licensed local feed appears. |
| [Tameside Service Information Directory (SID)](https://www.tameside.gov.uk/tameside-service-information-directory) and selected council service pages | **Transformable OGL web content; no public data API/export found** | SID covers children, young people, parents and carers, with categories including activities, benefits, early help, family hubs, support and SEND. Individual pages expose useful service-like fields such as name, description, location/address, contact details, opening information, referral method, age range and cost; the [financial-support page](https://www.tameside.gov.uk/tameside-service-information-directory/financial-support) is an example. Coverage is thematic rather than a complete all-age directory. | Public HTML returned `200`. The SID itself warns that referral routes, phone numbers and opening times may have changed if services have not told the council. No record-level update date, stable bulk identifier, CSV, documented API or change feed was found. Standard anonymous Liferay discovery probes returned `403` for `/o/api`, `403` for the headless OpenAPI path and `404` for the sites collection on 15 September 2026. | Tameside's [copyright and reuse notice](https://www.tameside.gov.uk/webteam/disclaimer-and-copyright-notice) places all council-site text under OGL v3 unless excluded or otherwise marked. It requires: `© Tameside Metropolitan Borough Council retains the sole intellectual property rights to [name and date of publication], licensed under the Open Government Licence`. Images, logos, maps and third-party-owned material are excluded. | Use a small allowlist of council-authored textual pages. Transform only the minimum service fields, retain source URL/title and retrieval date, exclude images/logos/maps, and review possible third-party rights before admitting each page. Do not run a broad crawler. |
| [Tameside care-home list](https://www.tameside.gov.uk/adults/what-support-is-available/care-homes/tameside-care-homes) and similar council lists | **Transformable OGL web content; bounded supplementary dataset** | The page explicitly lists registered care homes by Tameside town, including Ashton-under-Lyne, with name, address, telephone number and nursing-care status. | Public HTML is accessible, but no page-level update date or machine-readable export was found. It should not be represented as live availability, vacancies, quality or eligibility. | The same Tameside OGL statement applies to council-owned text, subject to its exclusions and required attribution. | Eligible for a small separately labelled collection after manual verification. Map it as provider/location facts, not as a promise that a placement is available. |
| [Action Together Community Activities Directory](https://www.actiontogether.org.uk/community-activities/community-activity-directory?where_do_you_operate__1279=3) | **Promising export, but not yet admissible** | Action Together says the directory contains hundreds of activities and groups across Oldham, Rochdale and Tameside. Tameside records observed on the public site expose title, description, day/time/frequency, cost, place/postcode, self-referral and access flags, contact details and host organisation. Members maintain their own listings through the member dashboard. | The directory HTML returned `200` and is current enough to include active local entries. Its page advertises a Tameside-filtered CSV endpoint at `/community-activities/community-activity-directory/csv?...&_format=csv`, but two bounded anonymous downloads produced no response body, including a 55-second page-bounded attempt. No API contract, stable-record guarantees, update timestamps or rate limits were found. | No open-data licence or directory-specific reuse terms were found on the publisher site. A downloadable link is not itself permission to persist, adapt and republish the database. | Do not scrape or ingest it now. Ask Action Together for a supported export/API, stable IDs, update/deletion semantics, licence, attribution and permitted refresh rate. If granted, this is the best candidate for broad community-activity coverage and should become its own source adapter. |
| [Tameside SEND Local Offer](https://tamesidelocaloffer.co.uk/) | **Crawl-only pages; do not ingest** | Children and young people aged 0–25 with SEND; pages cover education, health, social care, activities, support and referrals. | Public HTML is available and carries current news, but there is no observed bulk export/API, record contract, stable freshness field or machine-readable service boundary. It links onward to council and third-party providers. | The site footer asserts Tameside Council copyright but does not itself present an OGL reuse grant. The council's general notice cannot safely be assumed to cover every item and third-party contribution on this separate host. | Link users to the Local Offer where appropriate; do not ingest its content without written scope/licence confirmation and an agreed export. |
| [NHS Directory of Healthcare Services API v3](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services) | **Transformable official API, conditional on onboarding and terms** | National NHS organisations and healthcare services; the official catalogue says it supports organisation types and organisation search. NHS pages demonstrate current Ashton records for GPs, pharmacies and specific services. This is healthcare coverage, not a general community-support directory. | Version 3 is listed as in production. The [v3 specification](https://digital.nhs.uk/developer/api-catalogue/directory-of-healthcare-services/version-3) publishes an OAS download, while access requires an API key/onboarding. Older v1/v2 routes are not a new-integration option. | NHS syndicated-content terms require subscription, NHS attribution, accurate subscriber contact details and compliant cache refresh; the legacy portal states a normal refresh of at least every seven days and published usage caps. Exact current v3 terms must be captured at onboarding. | A useful phase-two source for health services near Ashton. Do not scrape `nhs.uk` result pages. Add only through the supported v3 API after approval, terms review, attribution implementation and contract tests. |
| [GMCA open-data and transparency page](https://www.greatermanchester-ca.gov.uk/what-we-do/research/open-data/Open-Data-and-Transparency/) | **Unavailable for service-directory ingestion** | The GMCA page routes users to borough transparency sources and transport/statistical data. Its Tameside entry points back to the council's transparency page; it does not publish a Greater Manchester human-services directory. | Public catalogue page only; no relevant service-record API/export was identified. | Dataset-specific terms would govern any linked data. | Use for regional context only, not as the service catalogue. |
| [GDS local-authority-services dataset](https://www.data.gov.uk/dataset/a0abdb2c-f210-4f07-bb36-9ff553bf4a23/local-authority-services) | **Open but wrong data model** | OGL CSV of council-service names and links used by GOV.UK across England and Wales. It describes local-authority transactions/pages, not local support organisations, eligibility, schedules or service delivery locations. | GDS owns and maintains the current subset; the historical dataset is a 6 March 2024 snapshot, while the post-2024 scope is limited to services present on GOV.UK. | OGL on the data.gov.uk publisher page. | It may help link to generic council tasks, but must not be presented as ORUK/community-service coverage and is not needed for the smallest pilot. |
| Pennine Lancashire ORUK endpoint | **Unavailable and unlicensed** | Lancashire context only; it does not establish Tameside/Ashton coverage. | DNS failed during the prior validation and the official ORUK report failed. | No feed-specific licence was found. | Disabled. Monitor separately; never substitute its records for Tameside or imply local coverage. |

## Smallest viable source strategy

### 1. Ship a deliberately small Tameside Council catalogue

Create an allowlisted source manifest for a limited number of council-authored support pages, starting with high-value public tasks in SID and other clearly council-owned lists. The pilot can honestly say it helps people find a **selection of Tameside Council-published services and support**, not "all services near you".

For each admitted item, record:

- source publisher, canonical URL and page title;
- retrieved/checked timestamp and a content hash;
- the exact OGL attribution and licence URL;
- why the page is believed to be council-authored and whether third-party content was excluded;
- service name and plain-text description;
- contact methods, direct source/action URL and referral method;
- cost, eligibility/age information and opening information where explicitly stated;
- delivery place and service area as separate concepts;
- a warning when no publisher update date is present.

The transformation should be an explicit per-page extractor or reviewed editorial mapping, not a domain-wide crawler. Changes should create a review diff; a fetch failure must preserve the last successful record and mark it stale rather than delete it. Recheck admitted pages on a modest schedule and display both "source checked" and any publisher-provided update date. Always link back to the council page for confirmation.

### 2. Keep Ashton-under-Lyne as the product centre

Use Ashton-under-Lyne as the default place filter and include borough-wide Tameside services when the source says they cover Tameside. Do not infer that an Ashton address equals Ashton-only coverage, or that a Tameside-wide service has a physical Ashton venue. Search should distinguish:

- **located in Ashton-under-Lyne**;
- **serves Ashton-under-Lyne/Tameside**; and
- **remote or borough-wide with no local venue stated**.

Lancashire can appear only in explanatory regional context or future-source status. Although some postal addresses still contain "Lancashire", Tameside is the operative launch geography and a postal county string must not drive coverage logic.

### 3. Add sources only through admission gates

The next best source is Action Together because its subject matter and fields fit community discovery. Before enabling it, obtain written answers covering:

- who owns the directory/database rights and contributor text;
- permission to fetch, normalise, store, index, display and redistribute records;
- required attribution and modification wording;
- supported CSV/API URL, authentication and rate/refresh limits;
- stable IDs, last-modified fields, withdrawals/deletions and correction route;
- whether contact names/emails may be publicly republished; and
- whether a Tameside-only export can be supplied independently of web-page pagination.

NHS DoHS v3 can then add a clearly separated "NHS healthcare services" collection after developer onboarding. Preserve its source identity and do not merge NHS and community records solely because names or postcodes resemble one another.

## Transparent fallback

If the project cannot confidently establish that individual SID text is council-owned under the published OGL, ship **link-first discovery**, not copied records:

- an editorially written set of broad needs/categories;
- direct links to the Tameside SID, Tameside SEND Local Offer, Action Together and NHS service search;
- no third-party descriptions, schedules, contacts or addresses stored locally;
- a visible statement that ORUK Navigator does not yet have a licensed local feed; and
- original synthetic ORUK fixtures only in demonstrations and tests, clearly marked as fictional.

This fallback is less capable, but it remains truthful, useful and geographically correct. It is preferable to presenting Shropshire data as local, scraping an unlicensed directory, or fabricating Ashton service records.

## Release gates

1. Review the first allowlist against Tameside's OGL exclusions and store the required attribution verbatim.
2. Test every source/action link and manually compare every transformed field before publication.
3. Exclude images, logos, maps and third-party documents from the Tameside extraction.
4. Label coverage as partial and show source/freshness on every result and detail view.
5. Provide a correction/report route and a global data-sources/licensing page.
6. Add Action Together or NHS only as independently configured adapters after their own legal and technical admission gates pass.
7. Re-check the ORUK verified directory periodically for a licensed Tameside/Greater Manchester feed; adopting one is a new source decision, not a silent swap.

## Conclusion

There is no verified native ORUK feed for Tameside that can support launch today. There is, however, a lawful narrow path: carefully transform a small number of council-owned textual service pages under Tameside's published OGL terms, with strict source attribution, exclusions, freshness disclosure and editorial review. That provides real Ashton/Tameside utility without claiming comprehensiveness. Action Together is the strongest potential expansion source, but its visible CSV link does not overcome the missing licence and failed export probe. NHS DoHS v3 is an official conditional source for healthcare only. Until those gates pass, the product should be small and candid rather than broad and legally uncertain.

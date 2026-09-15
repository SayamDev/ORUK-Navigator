# Initial Tameside source-manifest proposal

**Status:** evidence proposal for the persistence-model decision; not production ingestion configuration

**Checked:** 15 September 2026 at 22:09 UTC

## Decision

Admit five council-operated support pages provisionally for fixture-backed extractor design and editorial review:

1. Crisis Payments
2. Welfare Rights
3. Debt Advice
4. Tameside Homelessness Service
5. Adult Mental Health Services

Do not yet admit the Children with Disabilities page because the observed content does not provide a sufficiently clear public access route. Reject broad mixed directories and third-party lists from the initial manifest. Every provisional admission remains blocked from public publication until a reviewer confirms the extracted fields, required attribution, exclusions, and the council’s internally inconsistent statement about commercial reuse.

## Shared publisher and licence evidence

- **Publisher:** Tameside Metropolitan Borough Council
- **Allowed origin:** `https://www.tameside.gov.uk`
- **Licence evidence:** [Disclaimer and copyright notice](https://www.tameside.gov.uk/webteam/disclaimer-and-copyright-notice)
- **Licence page observation SHA-256:** `eede30879833549c5d3a2f3ecf9c5bb5d729558fe5016720d25601c067bddec9`
- **Stated licence:** Open Government Licence v3.0 for council-site text unless excluded or otherwise marked
- **Required attribution template:** `© Tameside Metropolitan Borough Council retains the sole intellectual property rights to [name and date of publication], licensed under the Open Government Licence.`
- **Excluded:** images, logos, maps/Ordnance Survey material, third-party-owned documents and text, and anything separately licensed

The same council page says commercial reuse would contravene OGL conditions, even though [OGL v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) generally permits commercial and non-commercial reuse. Navigator must not silently resolve that conflict. The public non-commercial pilot can proceed with attribution and the exclusions above, but commercial reuse remains a publisher-clarification gate.

No selected page returned a meaningful `Last-Modified` header or embedded publication/modified metadata. Each returned HTTP 200 and `text/html;charset=UTF-8`. Navigator can report when it checked a page; it cannot claim when the publisher updated it.

## Provisional admissions

### TMBC-CRISIS-PAYMENTS

- **Canonical URL:** [Crisis Payments](https://www.tameside.gov.uk/crisis-payments)
- **Observed page title:** `Crisis Payments - Tameside Metropolitan Borough Council`
- **Raw response observation SHA-256:** `30b8a8466561d44939df1f4e3a850ee38c6fe49d0737110bf5fff44858d45ddc`
- **Geographic scope:** Tameside residents or people about to become Tameside residents, as explicitly stated by the page
- **Observable fields:** service name, purpose, explicit eligibility, crisis circumstances, types of help, online/professional access routes, council attribution, canonical URL
- **Exclude:** header artwork, government/council logos, linked documents or form content, and any applicant data
- **Freshness limitation:** no publisher update date; scheme funding and eligibility can change
- **Recommendation:** **provisionally admit**. High-value, council-operated, source-explicit support. Require manual comparison immediately before first publication and prominent source-check date.

### TMBC-WELFARE-RIGHTS

- **Canonical URL:** [Welfare Rights](https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights)
- **Observed page title:** `Welfare Rights - Tameside Metropolitan Borough Council`
- **Raw response observation SHA-256:** `f90a08379edaf1313b55ff3cf62485242f9eaea6239e6622bd9b04dc066264a4`
- **Geographic scope:** Tameside residents
- **Observable fields:** service name, description, support types, cost (`free`), benefit/debt subject areas, council email, advice-line telephone/hours, interpreter and home-visit accessibility information, online request action
- **Exclude:** external benefit-calculator content and Citizens Advice contact information from the normalized council entry; external links may remain source actions only when clearly labelled
- **Freshness limitation:** no publisher update date; telephone hours and benefit scope can change
- **Recommendation:** **provisionally admit**. Strong council-service identity and practical access details.

### TMBC-DEBT-ADVICE

- **Canonical URL:** [Debt Advice](https://www.tameside.gov.uk/counciltaxandbenefits/welfarerights/debt-advice)
- **Observed page title:** `Debt advice - Tameside Metropolitan Borough Council`
- **Raw response observation SHA-256:** `23088261355e758e16a21e688a33ad6d26399d2ee1a746486aa2346ad475d738`
- **Geographic scope:** Tameside council service; do not infer eligibility beyond statements on the page
- **Observable fields:** service name, description, cost (`free`), mortgage/rent-arrears circumstances, forms of help, council telephone, online referral action, council location
- **Exclude:** copied descriptions and contact details for Jigsaw Homes, Shelter, Citizens Advice, National Debtline, and other third parties; retain only clearly council-authored routing text where necessary
- **Freshness limitation:** no publisher update date; court-support routes and contact details are time-sensitive
- **Recommendation:** **provisionally admit with a narrow extractor** limited to the council Welfare Rights/Debt Advice service.

### TMBC-HOMELESSNESS

- **Canonical URL:** [Tameside Homelessness Service](https://www.tameside.gov.uk/housing/housing-and-homelessness/tameside-homeless-service)
- **Observed page title:** `Tameside homelessness service - Tameside Metropolitan Borough Council`
- **Raw response observation SHA-256:** `f5d6b4cbe774204d50e5e2bce4dbd9d05c51fca83ddf0dbc278dd66ceb99ced8`
- **Geographic scope:** people seeking homelessness help from Tameside Council; the page states specific requirements for professional duty-to-refer cases
- **Observable fields:** service name, description, who it helps, prevention/referral steps, portal action, council email, telephone/out-of-hours telephone, office hours, emergency guidance
- **Exclude:** copied GMCA portal content, external guidance text, form submissions, and user data; store external portal URLs only as labelled source actions
- **Freshness limitation:** no publisher update date; severe-weather notices and emergency routes are especially time-sensitive
- **Recommendation:** **provisionally admit** with an emergency-content review and clear instruction to verify current details on the council page.

### TMBC-ADULT-MENTAL-HEALTH

- **Canonical URL:** [Adult Mental Health Services](https://www.tameside.gov.uk/adults/care-and-support/types-of-support/adult-mental-health-services)
- **Observed page title:** `Adult mental health services - Tameside Metropolitan Borough Council`
- **Raw response observation SHA-256:** `5acee79886a63038aed464f14a83860166a0d32714ed1bd65a20549e03207710`
- **Geographic scope:** adult social-care mental-health support in Tameside
- **Observable fields:** service name, description, assessed-needs context, council adult-social-care telephone, Approved Mental Health Professional referral telephone/hours, out-of-hours telephone, emergency guidance
- **Exclude:** clinical interpretation, eligibility inference, detention advice, and any information not explicitly supplied by the council page
- **Freshness limitation:** no publisher update date; crisis/referral details require heightened review
- **Recommendation:** **provisionally admit with safety review**. Keep urgent/emergency wording source-faithful and visually separate from ordinary discovery content.

## Deferred or rejected candidates

| Candidate | Decision | Reason |
| --- | --- | --- |
| [Children with Disabilities](https://www.tameside.gov.uk/socialcareservices/cwd) | Defer | Clearly council-authored and relevant, but the observed page does not expose a sufficiently complete public contact/referral route for a useful standalone catalogue entry. Revisit with a linked access page. Raw observation SHA-256: `3849f509570d352acb95a0a30ac02d910de8e56579b92bee22da62da597307e0`. |
| [Financial Support directory](https://www.tameside.gov.uk/tameside-service-information-directory/financial-support) | Reject from initial manifest | Mixes council and third-party services, national organisations, historic-looking contact channels, and embedded descriptions with uncertain third-party rights. A broad extractor would violate the narrow admission model. Raw observation SHA-256: `4e27f7fafbd0b2ad12cb109f312dd4e3e7864233951ee2f38805441a11ceecf8`. |
| [Tameside care-home list](https://www.tameside.gov.uk/adults/what-support-is-available/care-homes/tameside-care-homes) | Reject from initial manifest | Lists third-party providers and contact details and must not imply vacancies, availability, quality, or eligibility. Rights and freshness need a separate dataset decision. Raw observation SHA-256: `7ff1489de6ac8b9eec5cd04ffb65b9e04c4c3aeea3ddf23ca8d5ad8509f197d9`. |
| [Mental Health Support](https://www.tameside.gov.uk/policy/a-helping-hand-financial-wellbeing-and-benefit-su/mental-health-support) | Reject from initial manifest | Aggregates third-party and NHS services, including crisis information. Prefer the council-operated adult-social-care entry and admit other publishers only through their own licences/contracts. Raw observation SHA-256: `fa9002792690c132609436a89873f4b79dbdd3347e0b4ff520448cc46fe360b1`. |
| [Adult portal: Carers](https://adultportal.tameside.gov.uk/web/portal/pages/carers/) | Defer | Different council subdomain, mixed local/national resources, an old Census 2011 statistic, inconsistent centre-location wording, and no observed update metadata. It needs a separate ownership/freshness review. Raw observation SHA-256: `7c4acba249c2456b648b2c7f20bb1ad936ccdedeb9754c00913765df696ada6c`. |

## Hashing finding

Raw HTML is not stable enough to drive idempotency. Back-to-back requests to the unchanged Crisis Payments page produced different hashes (`a1beed45…` then `4adcc19d…`); Welfare Rights likewise produced `a0a13c2…` then `d9dad6bc…`. The platform appears to emit request-varying markup.

The adapter must therefore retain a raw response hash only as fetch evidence, then compute the candidate identity from a deterministic serialization of:

- selected, whitespace-normalized source evidence;
- normalized extracted fields;
- explicit source-action URLs;
- adapter version; and
- extraction-rules version.

Navigation chrome, session values, scripts, styling, images, unrelated page components, and ordering that carries no meaning must not affect the canonical content hash.

## Proposed manifest defaults

- **Adapter:** explicit Tameside council-page extractor, one reviewed rule set per page
- **Refresh check:** weekly
- **Freshness window:** 14 days without a contract-valid successful check before showing `stale`
- **Publication:** manual approval for every first publication and every material candidate change
- **Response policy:** HTTPS only, `www.tameside.gov.uk` only, approved redirects only, HTML only, bounded response size and timeout
- **Attribution:** render the required council attribution and OGL link on the data-sources page; expose publisher and canonical source on every detail page
- **Commercial-use gate:** obtain written clarification before representing the dataset or application as cleared for commercial reuse

These intervals are operational starting points for a small pilot, not publisher guarantees. They should remain configurable per manifest entry and be revisited after observed change frequency is available.

## Consequence for the domain model

The persistence model must support one source page producing one reviewed catalogue entry initially, while keeping the relationship extensible. It needs separate identities for source, source page, fetch observation, extraction candidate, field evidence, review decision, immutable publication, catalogue entry, and source action. It also needs an exclusion/warning record because a page can contain admissible council facts alongside third-party material that must not enter the public record.

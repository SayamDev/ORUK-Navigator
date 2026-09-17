# Tameside source-manifest expansion, September 2026

**Status:** admitted for the public non-commercial pilot, on the same terms as `initial-source-manifest.md`

**Checked:** 17 September 2026 at 13:20 UTC

## Decision

Admit five more council-operated support pages, bringing the pilot to ten:

1. Housing Payments
2. Tameside Carers Centre
3. Family Hubs
4. Equipment and Adaptations
5. Early Support and Advice Hub (adult social care)

Defer Rough Sleeping and reject the Domestic Abuse page from this expansion (see below). Publisher, licence, attribution, exclusions and the commercial-reuse gate are unchanged from `initial-source-manifest.md`; every page is on `https://www.tameside.gov.uk`, returned HTTP 200 with `text/html;charset=UTF-8`, and exposed no publisher update date.

The public records are short, source-faithful summaries. They do not copy contact details, opening hours, grant values or eligibility rules; each record sends people to the council page for current details.

## Admissions

### TMBC-HOUSING-PAYMENTS

- **Canonical URL:** [Housing Payments](https://www.tameside.gov.uk/council-tax-and-benefits/benefits/housing-payments) (the council's `/Benefits/Discretionary-Housing-Payments` link redirects here)
- **Raw response observation SHA-256:** `00f69e184137132965aba8ffa8a8ee0b70e993f04d689d874b33c9e269930322`
- **Geographic scope:** applicants entitled to Housing Benefit or Universal Credit housing costs with a rental liability, as stated by the page
- **Observable fields:** service name, purpose (rent shortfalls, deposits, rent in advance, benefit-cap and under-occupation reductions), exclusions, online application route
- **Exclude:** the self-service portal content, application data, and award amounts (discretionary, not stated)
- **Freshness limitation:** funded through the Crisis and Resilience Fund for 1 April 2026 to 31 March 2029; the page says funding is limited
- **Recommendation:** **admit**. Council-administered, distinct from Crisis Payments, and fills a housing-costs gap.

### TMBC-CARERS-CENTRE

- **Canonical URL:** [Caring for someone](https://www.tameside.gov.uk/adults/what-support-is-available/carers)
- **Raw response observation SHA-256:** `cb9403ec22dac8d0788a2466e6fe8e3de9769b708b343df9a0483be86d1e8b2d`
- **Geographic scope:** people in Tameside who look after someone
- **Observable fields:** Tameside Carers Centre name, wellbeing advice, carer's conversations, drop-in sessions, centre location in Ashton-under-Lyne, council telephone and email
- **Exclude:** newsletter issues, event photographs, Facebook content, and the Carers Trust, Citizens Advice, fire-service and advocacy links
- **Freshness limitation:** drop-in and coffee-morning times can change
- **Recommendation:** **admit**. Council-run centre with a clear public access route.

### TMBC-FAMILY-HUBS

- **Canonical URL:** [Family Hubs](https://www.tameside.gov.uk/children-and-families/family-hubs)
- **Raw response observation SHA-256:** `0e5a940452f045e7ec65ec3fd2df94d3d8f665b8196c3ab297a8b86f8394a57a`
- **Geographic scope:** families in Tameside's four neighbourhood areas, children aged 0 to 19 or up to 25 with SEND
- **Observable fields:** service name, early-help description, four neighbourhood hubs with addresses and telephones, opening times
- **Exclude:** partner-organisation descriptions, the external Best Start for Life site, and Parent and Carer Panel sign-up content
- **Freshness limitation:** hub venues and opening times can change; the record does not copy them
- **Recommendation:** **admit**. Council-run with explicit locations and contacts.

### TMBC-EQUIPMENT-ADAPTATIONS

- **Canonical URL:** [Equipment and adaptations](https://www.tameside.gov.uk/adults/equipment-and-adaptations) (the `/adults/equipment` link redirects here)
- **Raw response observation SHA-256:** `7826e67416ab7f82d3e03950a03f408e7b61b3ff5ca3bb112823461b165d26fa`
- **Geographic scope:** adults in Tameside, subject to an assessment for care and support
- **Observable fields:** service name, equipment and minor/major adaptation types, no-cost statement for day-to-day equipment and minor adaptations after assessment, referral route through the Early Support and Advice Hub
- **Exclude:** grant amounts (discretionary grant and Disabled Facilities Grant limits), financial-assessment detail, and the external Adapt my Home tool
- **Freshness limitation:** grant values and thresholds change; the record states only that major adaptations may involve a financial assessment
- **Recommendation:** **admit with heightened review** of cost wording.

### TMBC-ADULT-SOCIAL-CARE-EARLY-SUPPORT

- **Canonical URL:** [Adult services: Contact us](https://www.tameside.gov.uk/adultservices/contact-us) (the `/adults/contact-us` link redirects here)
- **Raw response observation SHA-256:** `bacb741acdb821cd601202bcaa1ea13b1d039bb3f563c07846a2ce00ea37dd2f`
- **Geographic scope:** adult social-care information and advice in Tameside
- **Observable fields:** Early Support and Advice Hub name, who should get in touch, telephone and hours, out-of-hours service
- **Exclude:** safeguarding interpretation and anything not stated by the page
- **Freshness limitation:** telephone hours and out-of-hours arrangements are time-sensitive
- **Recommendation:** **admit with safety review**. It is the council's stated first point of contact for adult social care; urgent wording must stay source-faithful.

## Deferred or rejected candidates

| Candidate | Decision | Reason |
| --- | --- | --- |
| [Rough sleeping](https://www.tameside.gov.uk/safetyandhygiene/rough-sleeping) | Defer | Council housing-advice routes are already covered by the homelessness entry; the page mixes in A Bed Every Night, StreetLink, CGL and food-provision content from other organisations. Revisit with a narrow extractor and emergency-content review. |
| [Domestic abuse](https://www.tameside.gov.uk/public-health/domestic-abuse) | Reject from this expansion | The support route is a third-party helpline (Bridges) plus police guidance. Admit the provider only through its own source and licence, with a dedicated safety review. |
| [Household Support Fund](https://www.tameside.gov.uk/counciltaxandbenefits/benefits/tameside-resettlement-scheme/household-support-fund) | Reject | The page states the 2025–26 fund has closed and points to the Crisis and Resilience Fund. |
| [Cost of living support](https://www.tameside.gov.uk/policy/helping-hand-tameside-cost-of-living-support) | Reject | A navigation hub linking to mixed council and third-party topics, not a service. |
| [Homeless sources of support](https://www.tameside.gov.uk/housing/homeless-sources-of-support) | Reject | Lists Shelter, Citizens Advice and other third-party organisations. |
| [Council tax discounts and exemptions](https://www.tameside.gov.uk/counciltaxandbenefits/revenues/council-tax-discounts) | Defer | The page is a link list with too little service content to summarise. |

## Search coverage

Four reviewed concept groups were added to `src/lib/search.ts`: carer support, family support, independent-living equipment and adaptations, and adult social care. Seven source-backed evaluation cases were added to `src/data/search-evaluation.ts`; all 17 cases retrieve their expected services within the first three results.

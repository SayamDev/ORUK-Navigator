# Tameside location and postcode discovery strategy

**Decision date:** 15 September 2026  
**Status:** recommended v1 contract for issues #13 and #8

## Decision

Use a **versioned local projection of the Office for National Statistics Postcode Directory (ONSPD)** to normalise postcodes and classify postcode centroids against official statistical geographies. Make the postcode optional and keep deterministic text discovery usable without it.

For v1:

- classify **Tameside** only when the current ONSPD local-authority code is `E08000008`;
- classify **Ashton-under-Lyne** only as `postcode centroid assigned to the Ashton-under-Lyne built-up area`, using the current ONSPD built-up-area code and name verified during each import;
- never use the similarly named parliamentary constituency, postal town, outward code, ward name or a radius as a substitute for the Ashton built-up area;
- never turn a user's postcode into service coverage, eligibility, availability or a claim that a service is nearby;
- do not calculate or display distance in v1;
- do not require Postcodes.io, a map, browser geolocation or any paid service for search;
- retain no submitted postcode or free-text support need after the request, including in application, analytics, error or tracing logs.

The first local projection should contain current postcodes in Tameside and all current postcodes in every outward-code district that intersects the Tameside set. The neighbouring records are necessary to distinguish an actual boundary/outside result from a missing row without importing a UK-wide table. A well-formed postcode outside that bounded projection is **outside the local reference**, not “invalid”. UK-wide validity is not a v1 product requirement and must not be claimed.

Postcodes.io remains a documented replacement adapter and operational comparison source, not a runtime fallback. Calling it only when the local lookup misses would disclose exactly the unusual postcodes and make privacy and behaviour depend on a third party. The no-lookup path is the runtime fallback.

## Why this boundary is appropriate

The product has five reviewed council pages, sparse delivery-location evidence and no source geometry. A precise geocoder would not make that service evidence more precise. The postcode feature can responsibly answer a narrow question—“which coarse official geography is this postcode centroid assigned to?”—while the catalogue can answer a separate source-backed question—“where is this service delivered and what area does the publisher say it serves?”

Those facts must remain separate:

```text
optional user postcode
        |
        v
official postcode reference ----> user-area classification
                                  (Ashton / Tameside / outside / unknown)

reviewed source publication ----> service geography evidence
                                  (venue / coverage / remote / unknown)

user-area classification + service geography evidence
        |
        v
explainable coarse match signals, never inferred eligibility or distance
```

ONS describes postcodes as postal-delivery geographies which do not reliably align with administrative boundaries. ONSPD assigns a postcode to a single geography by matching one postcode centroid to boundaries; an address in a postcode that straddles a boundary can therefore be on the other side. ONS also warns that postcodes change and can be reused. The result is suitable for coarse discovery, not address-level proof or proximity.

Sources: [ONS postal-geography limitations](https://www.ons.gov.uk/methodology/geography/ukgeographies/postalgeography), [ONS postcode products](https://www.ons.gov.uk/methodology/geography/geographicalproducts/postcodeproducts), and [ONS response on boundary-straddling postcodes](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/listofpostcodesandcorrespondinglocalauthorities).

## Current official reference and identifiers

The current official user guide at the decision date is the [ONSPD August 2026 User Guide](https://www.data.gov.uk/dataset/7db631f2-d9bb-4579-91ec-77e2f5154685/ons-postcode-directory-august-2026-user-guide). ONS releases postcode products quarterly in February, May, August and November. The prior [May 2026 dataset record](https://www.data.gov.uk/dataset/d416ce0f-8c63-4ab8-9a43-2908242391a3/ons-postcode-directory-may-2026) illustrates the full collection's operational size—235 MB—and confirms that it includes current and terminated postcodes and multiple geography assignments. The importer must discover fields from the accompanying guide rather than freeze column positions across releases.

The authoritative borough identity is:

- name: `Tameside`;
- geography: metropolitan district in Greater Manchester;
- GSS code: `E08000008`.

Source: [ONS Tameside area profile](https://www.ons.gov.uk/explore-local-statistics/areas/E08000008-tameside).

“Ashton-under-Lyne” is ambiguous without a geography type. It names, among other things, a parliamentary constituency whose boundary changed in 2024. That constituency must not be treated as the town. ONS describes built-up areas as settlement geographies representing villages, towns and cities, so the ONSPD built-up-area assignment is the least misleading available postcode-level proxy for the product's Ashton centre. It must still be labelled as a postcode-centroid assignment, not an address-level fact.

Sources: [ONS Census 2021 geographies: built-up areas](https://www.ons.gov.uk/methodology/geography/ukgeographies/censusgeographies/census2021geographies), [ONS Ashton-under-Lyne constituency profile](https://www.ons.gov.uk/explore-local-statistics/areas/E14001070-ashton-under-lyne), and [ONS on the absence of a fixed general “town” definition](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/ukpostcodestownsandcounties).

The import must resolve the current built-up-area code for the exact ONS name `Ashton-under-Lyne` from the same release's names-and-codes material and fail closed if the code is absent, duplicated or changed without review. At the decision date, Postcodes.io's live August 2026 ONSPD response for the Tameside Council postcode `OL6 6BH` returned Tameside code `E08000008` and Ashton-under-Lyne built-up-area code `E63008370`. This is corroborating integration evidence, not a hard-coded permanent truth.

## Options compared

| Option | Authority and licence | Privacy and availability | Precision and maintenance | V1 decision |
| --- | --- | --- | --- | --- |
| Direct server-side [Postcodes.io lookup](https://postcodes.io/docs/api/lookup-postcode/) | Free, open-source API using ONSPD; current docs say no authentication. GB data is under the OS OpenData licence with required notices. | The browser need not call the provider, but Navigator would disclose each full postcode to a third party. The inspected public documentation gives response codes but no service-level commitment. An outage would need fail-open behaviour. | Convenient normalisation and official codes. Still uses postcode-centroid assignments and quarterly upstream data. Public API was on ONSPD August 2026 at the decision date. | Credible future adapter or comparison source; **not the v1 runtime dependency or fallback**. |
| Self-hosted Postcodes.io | Same upstream data; service code is MIT-licensed. Published Docker application/database images exist. | Keeps request data inside Navigator and removes public-API availability dependency. | Adds PostGIS images, database release upgrades and a much larger operational surface than the pilot needs. The September 2026 changelog includes PostgreSQL/PostGIS and schema breaking changes. | Do not adopt for v1. Reconsider only if UK-wide lookup becomes a proved requirement. |
| Local ONSPD projection | ONS primary product, quarterly, GB postcode products reusable under OGL with attribution. | No user postcode leaves Navigator. Lookup survives external outages. | Requires a controlled quarterly import, release metadata, schema validation and boundary tests. A bounded regional projection is much smaller than the 235 MB full release. | **Selected.** |
| Local [OS Code-Point Open](https://www.ordnancesurvey.co.uk/products/code-point-open) | OS primary open product, free under OGL, all current GB postcode units, quarterly. | Same local privacy/resilience benefits. | Provides notional postcode positions and administrative codes, but Ashton membership would require another boundary product/spatial join. ONSPD already supplies the required geography assignments and termination status. | Valid alternative, but unnecessary extra spatial machinery for v1. |
| No lookup | No data licence, network or disclosure. | Maximum resilience and privacy. | Cannot classify or normalise a postcode. The catalogue can still search by need and display reviewed coverage/venue evidence. | **Required fallback and valid user choice**, but not the only implementation. |

### Postcodes.io evidence

[Postcodes.io's overview](https://postcodes.io/docs/overview/) says it serves ONSPD, OS Open Names and the Scottish Postcode Directory, and identifies ONSPD's quarterly update cycle. Its [licence page](https://postcodes.io/docs/licences/) says GB postcode data is under the OS OpenData licence and lists OS, Royal Mail and National Statistics rights. Its official [changelog](https://github.com/ideal-postcodes/postcodes.io/blob/master/CHANGELOG.md) records the ONSPD August 2026 update in version 20.0.0 on 11 September 2026.

The lookup endpoint returns `404` for a postcode it cannot find. A not-found response cannot safely distinguish a mistyped current postcode, a newly introduced postcode not yet in the quarterly release, and other lifecycle/data conditions for the product's user message. It must not become a definitive statement that an address does not exist.

### ONSPD and Code-Point limitations

Code-Point Open is an official, free dataset of current GB postcode units, updated every three months. OS calls each location “notional”; postcode location is not a building or user location. ONSPD additionally contains terminated postcodes and geographic assignments, which better supports lifecycle-aware messages. Both are still postcode-level reference data rather than an address product.

Sources: [OS Code-Point Open product page](https://www.ordnancesurvey.co.uk/products/code-point-open), [Code-Point Open user guide](https://www.ordnancesurvey.co.uk/documents/product-support/user-guide/code-point-open-user-guide.pdf), and [ONSPD August 2026 User Guide](https://www.data.gov.uk/dataset/7db631f2-d9bb-4579-91ec-77e2f5154685/ons-postcode-directory-august-2026-user-guide).

## Licensing and attribution

ONS states that GB postcode products derived from Code-Point Open are subject to the Open Government Licence. Reuse must show all three current-year notices:

> Contains OS data © Crown copyright and database right 2026  
> Contains Royal Mail data © Royal Mail copyright and database right 2026  
> Source: Office for National Statistics licensed under the Open Government Licence v.3.0

The year must come from the imported release/official guidance rather than remain permanently hard coded. Store the source URL, release month, retrieval time, content checksum, importer version, selected column names and rendered attribution with every imported reference version. Do not copy ONS, Royal Mail or OS logos.

The Tameside-only launch does not need Northern Ireland postcodes. If coverage later includes `BT` postcodes, review the separate Land and Property Services conditions before import or commercial reuse; neither this decision nor the GB OGL statement clears that expansion.

Source: [ONS geography licences, “Postcode products”](https://www.ons.gov.uk/methodology/geography/licences).

## V1 reference-data contract

### Import boundary

The importer is an operational build/release task, not a public request path.

1. Download one named ONSPD release and its matching user guide from the ONS Open Geography publication.
2. Verify HTTPS origin, expected archive type, a configured maximum size and an operator-reviewed checksum.
3. Parse by header names from the matching guide; never depend on column order.
4. Resolve `Tameside` to `E08000008` and the exact `Ashton-under-Lyne` built-up-area name to its code from that release.
5. Select current Tameside postcodes, derive the set of outward codes they occupy, then include all current postcodes in those outward codes. Keep any matching terminated record only if needed to distinguish an explicitly terminated input; do not make it searchable as current.
6. Project only the fields needed for lookup and audit: normalised postcode, outward code, termination marker, local-authority code, built-up-area code, positional-quality indicator where available, release ID and source checksum.
7. Validate uniqueness, known test postcodes, counts and geography-code invariants.
8. Publish the new reference version atomically; keep the last validated version active if any step fails.

Do not commit the raw national archive to Git. A small generated local projection may be stored as a versioned seed artifact only after its size, attribution and update process are documented. Prefer loading it into a private PostgreSQL reference table accessed through the application repository boundary in `docs/data-model.md`.

### Normalisation

Normalisation is presentation cleanup, not proof of existence:

1. Unicode-normalise the submitted value and trim surrounding whitespace.
2. Remove spaces and the punctuation explicitly accepted by the form policy.
3. Convert ASCII letters to uppercase.
4. Reject control characters and values that cannot match a complete UK postcode grammar.
5. If structurally valid, insert one space before the final three characters for lookup/display.

Accept upper/lower case and common spacing/punctuation variations. Do not use an HTML `maxlength` that silently truncates input; apply a generous request-size bound server-side and validate after normalisation. Never pass the postcode in the URL path/query, page title, browser history, referrer or analytics event; submit it in the request body.

GOV.UK's address pattern explicitly recommends accepting case and spacing variations, preserving a recognisable error state and using `autocomplete="postal-code"`. Source: [GOV.UK Design System, addresses](https://design-system.service.gov.uk/patterns/addresses/).

### Lookup result

The application repository returns a discriminated result, not raw ONSPD rows:

```ts
type UserAreaResolution =
  | { kind: "omitted" }
  | { kind: "invalid_format" }
  | { kind: "ashton"; referenceRelease: string }
  | { kind: "tameside"; referenceRelease: string }
  | { kind: "outside_tameside"; referenceRelease: string }
  | { kind: "terminated"; referenceRelease: string }
  | { kind: "not_in_local_reference"; referenceRelease: string }
  | { kind: "temporarily_unavailable" };
```

Interpretation:

- `ashton`: current postcode; local-authority code is `E08000008`; built-up-area code is the release-resolved Ashton-under-Lyne code;
- `tameside`: current postcode; local-authority code is `E08000008`; built-up-area is another or missing settlement;
- `outside_tameside`: postcode is present in the neighbouring outward-code projection and its local-authority code is not `E08000008`;
- `terminated`: an explicitly retained terminated record; invite correction or postcode removal;
- `not_in_local_reference`: structurally plausible but absent from the bounded projection; do not call it invalid or outside Tameside;
- `temporarily_unavailable`: database/reference lookup failed; continue without the postcode.

The public response may return the coarse label and reference release. It should not echo the full submitted postcode unless the current form needs to preserve it for correction, and it must not persist it.

## Service-geography and ranking contract

The service side uses only reviewed publication evidence already separated by the domain model:

- `coverage_tameside`: source explicitly says Tameside residents/area;
- `coverage_ashton`: source explicitly says Ashton-under-Lyne;
- `delivery_ashton`: reviewed physical delivery location whose postcode centroid is assigned to the Ashton built-up area;
- `delivery_tameside`: reviewed physical delivery location elsewhere in Tameside;
- `remote`: source explicitly supports remote/telephone/online delivery;
- `unknown`: the source does not establish coverage or a delivery location.

The postcode resolver may enrich a reviewed service delivery-location postcode during ingestion/review using the same versioned reference. That derived fact must retain the release ID and be visible in the review diff. A provider office or council address is not a delivery location unless the source says support is delivered there.

For deterministic search issue #8:

1. Need/text relevance and reviewed eligibility facts remain the primary retrieval signals.
2. An explicit source-backed coverage match is a positive geographic explanation.
3. Remote delivery is not penalised for lacking a local venue.
4. A reviewed venue in the same built-up area may be a low-weight, labelled tie-breaker: “Venue postcode is assigned to Ashton-under-Lyne.” It is never “nearest”.
5. Borough-wide services remain visible to Ashton users even without an Ashton venue.
6. Unknown geography remains visible with “Location or area served not provided”; it is not silently treated as local.
7. `outside_tameside`, `not_in_local_reference`, omitted and unavailable postcode states do not block the limited Tameside catalogue.
8. No result is filtered solely by a postcode mismatch unless the source explicitly defines a conflicting coverage restriction and that rule has separate review evidence.

Do not expose metres/miles, “within X miles”, “closest”, travel time, map pins or radius filters in v1. Postcode centroids, sparse service venues and incomplete coverage cannot support those claims.

## Privacy, caching and logging

A postcode is public reference data when it appears in ONSPD, but a submitted postcode linked to an IP address, timestamp and support need can become identifying or reveal sensitive circumstances. Treat the submission as private request data whether or not every postcode is personal data in isolation.

V1 controls:

- lookup server-side against the local table;
- do not write submitted postcode or free-text need to the database, logs, error reports, traces, analytics, session storage, local storage or cookies;
- redact common UK postcode patterns from unexpected error metadata before export;
- configure the hosting layer not to log request bodies;
- log only an outcome enum, latency bucket, active reference release and a random request correlation ID;
- do not log an IP-to-postcode association;
- keep aggregate counts only after ensuring cells cannot expose rare input combinations;
- document the transient processing in the privacy notice.

No postcode-result cache is needed for a local indexed lookup. If a future external adapter is approved, it must be server-side, receive only the normalised postcode, have a short timeout, use no query/free-text context, and fail open. A bounded in-memory cache may hold postcode-to-coarse-area responses for at most 24 hours with no user/request association; do not persist a request-derived cache or analytics table. An upstream quarterly release is not a reason to retain user submissions.

The ICO's data-minimisation principle requires data to be adequate, relevant and limited to what is necessary; its storage-limitation guidance says personal data must not be kept longer than needed and should be erased or anonymised when no longer necessary. Sources: [ICO data minimisation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/) and [ICO storage limitation](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/).

## Public interaction and accessibility

The postcode is an optional refinement labelled, for example, **“Postcode (optional)”**, with hint text explaining: “Used once to identify your area. We do not save it. You can search without one.” Do not ask for a full address or browser location.

- use a visible `<label>` and `autocomplete="postal-code"`;
- use an input visually sized for a postcode while allowing pasted variations;
- preserve the user's typed value when showing a correction error;
- associate inline errors and hints with the input using `aria-describedby`;
- include a text error summary that moves focus appropriately after submit;
- announce asynchronous/unavailable status without stealing focus;
- never rely on colour, a map or a pin to communicate the result;
- provide a single action to remove the postcode and continue;
- make “Search all pilot services” available in every postcode error/outage state;
- avoid live autocomplete/typeahead: one submit is simpler, private and usable without JavaScript.

Suggested messages:

| State | Message | Next action |
| --- | --- | --- |
| `invalid_format` | “Enter a full UK postcode, for example OL6 6BH, or remove the postcode.” | Keep the value; focus the error/input; offer search without it. |
| `ashton` | “Area: Ashton-under-Lyne (based on the postcode's official statistical area).” | Allow change/remove; do not show distance. |
| `tameside` | “Area: Tameside.” | Allow change/remove. |
| `outside_tameside` | “That postcode is outside Tameside. This pilot only covers a limited selection of Tameside services.” | Continue with all pilot services or change postcode. |
| `terminated` | “That postcode is no longer current in our August 2026 reference.” | Change/remove; continue without it. |
| `not_in_local_reference` | “We could not match that postcode in our local Tameside reference.” | Change/remove; continue without it. |
| `temporarily_unavailable` | “Postcode matching is temporarily unavailable. You can still search all pilot services.” | Continue automatically or via a clear button. |

GOV.UK recommends an explicit full-postcode error, `autocomplete="postal-code"`, and accepting case/spacing variations. It also warns against restrictive `maxlength` behaviour. Sources: [GOV.UK addresses pattern](https://design-system.service.gov.uk/patterns/addresses/) and [GOV.UK text input component](https://design-system.service.gov.uk/components/text-input/).

## Availability and failure behaviour

| Failure | Required behaviour |
| --- | --- |
| ONS publication unavailable during scheduled import | Keep the last validated local reference active; mark the import failed; do not affect public search. |
| Release schema or known code changes | Fail the import before activation and require review; never guess a replacement field/code. |
| Partial/corrupt download or count anomaly | Reject the candidate reference version; retain prior release and checksum evidence. |
| Local reference older than the configured review window | Display/reference the actual release; create an operational warning; do not claim current validation. Search still works. |
| Local database timeout/error | Return `temporarily_unavailable`; run the query without postcode refinement; no raw database error reaches the browser. |
| Invalid format | No lookup; show an accessible correction and continue option. |
| Not found locally | Return `not_in_local_reference`, not `invalid`; never call Postcodes.io silently. |
| Postcode centroid straddles a real boundary | Use the official assignment only with the coarse label; never claim address-level proof. Provide the report/correction route. |
| Service has no reviewed geography | Keep it discoverable and disclose the missing fact. |

## Testable acceptance contract

### Normalisation and validation tests

- case, missing-space, repeated-space and accepted-punctuation variants resolve to the same canonical postcode;
- control characters, incomplete outcodes and impossible full forms return `invalid_format` without a lookup;
- input is not truncated silently;
- one current Ashton fixture resolves to `ashton`;
- one current non-Ashton Tameside fixture resolves to `tameside`;
- one neighbouring outward-code fixture resolves to `outside_tameside`;
- one explicitly retained terminated fixture resolves to `terminated`;
- a plausible postcode outside the bounded projection resolves to `not_in_local_reference`;
- each expected result records the pinned reference release used by the test.

### Import and data tests

- the source archive, guide, checksum, release and attribution are present;
- Tameside resolves uniquely to `E08000008`;
- Ashton-under-Lyne built-up area resolves uniquely by exact name and expected reviewed code;
- every `ashton` postcode is also assigned to Tameside or the import fails for review;
- canonical current postcode is unique;
- outward-code expansion includes both sides of an observed district boundary;
- terminated records cannot resolve as current;
- field-order changes do not break a header-driven fixture;
- corrupt archives, missing columns, code changes and unexpected count drops do not replace the active reference;
- activating a new validated reference is atomic and retains release provenance.

### Search/ranking tests

- the same need query remains usable with postcode omitted and when lookup throws;
- a Tameside coverage statement produces a field-backed explanation;
- an Ashton venue produces the qualified “venue postcode assigned to Ashton-under-Lyne” explanation, not “near you”;
- remote and borough-wide services are not penalised for lacking an Ashton venue;
- an administrative/provider address never becomes a delivery-location match;
- no test result contains a numerical distance or inferred eligibility;
- `unknown` service geography remains visible and explicitly incomplete.

### Privacy and accessibility tests

- application/HTTP/error logs contain neither a submitted postcode nor free-text need;
- analytics receives only approved aggregate outcome enums, never request values;
- request bodies are not captured by tracing;
- lookup uses POST/body semantics and the postcode is absent from URLs/referrers;
- the postcode field has a programmatic label, `autocomplete="postal-code"`, hint and error association;
- keyboard-only and screen-reader journeys can submit, correct, remove and bypass the field;
- invalid, outside, unavailable and no-result states expose a clear next action and status announcement;
- core search works with JavaScript disabled at the form/submission level where the application architecture permits progressive enhancement.

No production test should call a live external postcode API. Contract-test the repository with pinned, independently authored fixtures and run import validation against an explicitly selected ONSPD release.

## Revalidation triggers

Review this decision when:

- ONS changes ONSPD fields, licensing, attribution, update frequency or relevant geography codes;
- Tameside or Ashton-under-Lyne boundaries/codes change;
- the product expands beyond the bounded Tameside pilot;
- service records gain enough reviewed location/coverage evidence to justify a map or distance evaluation;
- a user need for UK-wide postcode validation is demonstrated;
- the local projection materially affects deployment size/cost; or
- Postcodes.io or another provider is proposed as a runtime dependency.

A map, radius or “nearest service” feature requires a separate evidence decision and evaluation. It must not emerge implicitly from the postcode lookup.

## Conclusion

The postcode feature should make a small, honest improvement to Tameside discovery: normalise an optional input, classify its official postcode centroid at a coarse level, and explain geography without saving the input. A local, versioned ONSPD projection gives the best v1 balance of authority, privacy, availability and cost. The no-postcode path remains first-class. Postcodes.io is useful evidence that this adapter boundary is practical, but it should not receive sensitive discovery inputs or become a hidden availability dependency.

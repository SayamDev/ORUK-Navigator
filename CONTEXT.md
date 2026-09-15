# ORUK Navigator domain glossary

## Catalogue entry

A reviewed, discoverable record in ORUK Navigator representing a source-backed offer of support. A catalogue entry may be normalized from an ORUK service or from an admitted non-ORUK source. It is never evidence of current availability by itself.

Avoid using “listing” when the distinction matters; “listing” may refer to an unreviewed item on an external page.

## Source

An external publisher and technical origin from which evidence is obtained. A source has its own contract, licence, admission status, refresh policy, and health history.

## Source manifest

The reviewed configuration and evidence required before a source or source page can enter ingestion. It records identity, canonical URL, licence and attribution, extraction method, review status, and operational constraints.

## Source record

The source-specific item and evidence from which a catalogue entry is normalized. Source records retain their source identity and are not exposed as the application’s domain model.

## Feed

A source that exposes a repeatable machine-readable collection contract. A public web page is not a feed merely because it can be fetched.

## Admitted source

A source that has passed the project’s legal, provenance, safety, and technical admission gates. Public readability or ORUK directory verification alone does not make a source admitted.

## Delivery location

A physical or virtual place at which support is delivered. It is distinct from a provider’s administrative address.

## Coverage area

The geographic area whose residents or users a catalogue entry explicitly says it serves. An address within an area does not establish coverage, and borough-wide coverage does not imply a local venue.

## Provenance

The evidence chain connecting a displayed fact to its publisher, source record, canonical URL, retrieval time, licence, and transformation history.

## Data confidence

Navigator’s transparent completeness classification for a catalogue entry. It measures the presence and freshness of useful source-backed fields. It is not a judgement of service quality, availability, official status, ORUK compliance, or publisher trustworthiness.

## Match explanation

The field-backed evidence showing which query terms, reviewed mappings, structured attributes, and geographic facts caused a catalogue entry to be retrieved or ranked. A model-generated narrative is not a match explanation unless every claim is grounded in this evidence.

## Pilot coverage

The explicitly limited set of admitted sources and catalogue entries searchable in v1. Pilot coverage must never be described as a complete directory of Tameside support.

## Ingestion run

One recorded attempt to evaluate one or more admitted source pages through their configured adapters. A run reports transport, extraction, candidate, and review-work outcomes; it does not directly define what is public.

## Candidate

A validated, evidence-backed proposed catalogue state produced by a source adapter. A candidate is not publicly searchable until it is approved.

## Publication

An immutable reviewed version of a catalogue entry. Each catalogue entry has at most one active publication, while older publications remain part of its provenance history.

## Source health

Navigator’s operational observation of whether a source can be fetched and interpreted according to its admitted contract. Source health is distinct from service availability and catalogue-entry lifecycle.

## Stale

A source-health state indicating that Navigator has not completed a contract-valid check within the source manifest’s freshness window. Stale does not mean closed, invalid, or unavailable; the interface must disclose the age and preserve the last reviewed publication.

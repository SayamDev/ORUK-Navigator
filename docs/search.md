# Deterministic search, ranking, and evaluation

**Decision date:** 15 September 2026  
**Status:** v1 search contract for issue #8

## Decision

V1 search is a deterministic PostgreSQL full-text pipeline over active, reviewed publications. It combines:

1. literal and stemmed lexical matching;
2. a small, versioned set of reviewer-approved concepts and synonyms;
3. explicit structured filters;
4. source-backed location and coverage evidence; and
5. stable, field-level match explanations.

Search does not require embeddings, a language model, a hosted search service, a map, or a live postcode service. Optional semantic ranking may be evaluated later, but it cannot add candidates, facts, filters, or explanations in v1.

The implementation must favour a useful honest result over a confident-looking guess. It never invents a category, expands a query through an unreviewed thesaurus, treats an administrative address as a delivery location, infers eligibility, or turns a postcode into distance.

## Search boundary

### Searchable records

Only a catalogue entry's current active publication is searchable. The repository query must enforce all of these conditions before scoring:

- the catalogue entry lifecycle is `active`;
- the active publication belongs to that entry;
- the publication came from an approved candidate and review decision;
- its source and source page remain admitted for public display;
- required licence evidence and attribution are present; and
- the search projection version matches the active publication.

A rejected candidate, draft, old publication, suspended/withdrawn entry, failed extraction, or unlicensed source cannot enter results even if a stale search-projection row exists.

Source health and catalogue-entry availability are separate. A failed refresh leaves the last reviewed publication searchable with its real checked date and stale/source-health disclosure; it does not silently lower relevance or remove the result.

### Request

```ts
type SearchRequest = {
  query: string;
  userArea: UserAreaResolution;
  classificationKeys?: string[];
  deliveryModes?: Array<"physical" | "remote">;
  page?: number;
  pageSize?: number;
};
```

The public form may submit a plain-language need and an optional postcode. It must not expose PostgreSQL query syntax. A blank need routes to the browse experience instead of producing an unexplained universal text match.

V1 filters exist only for structured fields that are populated and reviewed often enough to be useful. A filter cannot be created from missing data, a parser guess, or raw source prose. When no admitted record has reliable values for a proposed filter, omit the control.

## Privacy and input handling

Free-text need and submitted postcode are transient request data. They may describe health, finances, housing, disability, abuse, or another sensitive circumstance.

- Process both server-side.
- Do not place either value in a URL, route segment, page title, referrer, analytics event, trace, error report, database row, cookie, local storage, or session storage.
- Do not log raw query text, derived tokens, spellings, or a query fingerprint/hash.
- Log only an approved outcome enum, result-count band, latency bucket, search-contract version, postcode-resolution kind, and random request correlation ID.
- Do not associate those aggregates with an IP address or persistent browser identifier.
- Reject an oversized UTF-8 request before parsing; the initial application limit is 240 Unicode scalar values after normalisation, with a friendly correction message rather than truncation.
- Parameterise every database value. User text is never interpolated into SQL or `tsquery` syntax.

The 240-character limit is a misuse/safety bound, not guidance to users. The field should visually support a short sentence and explain that personal names, addresses, case details, and medical histories are unnecessary.

## Query normalisation

Normalisation makes equivalent input comparable; it does not reinterpret the person's circumstances.

1. Apply Unicode NFKC normalisation.
2. Trim leading/trailing whitespace and collapse internal Unicode whitespace to one ASCII space.
3. Case-fold for matching while preserving the submitted text only for the current response/form correction.
4. Treat punctuation as token boundaries except apostrophes within a word.
5. Keep letters and numbers from all scripts accepted by PostgreSQL's parser; do not transliterate names automatically.
6. Build an English stemmed query and a `simple`-configuration literal query from the bounded, parameterised text.
7. Record which safe normalised lexemes survived stop-word removal for explanation assembly, but do not persist them.

Use `plainto_tsquery`, not `to_tsquery`, for the primary user-text path. `plainto_tsquery` treats unformatted input as text and inserts AND between surviving words; it does not accept query operators. PostgreSQL also documents `websearch_to_tsquery` as safe from syntax errors, but its `OR`, quote, and negative-term semantics are not promised by this form and would make accidental punctuation affect public-support results. See [PostgreSQL: controlling text search](https://www.postgresql.org/docs/current/textsearch-controls.html).

### Need phrases and mixed needs

Before database retrieval, the application matches only reviewed concept phrases against token boundaries. Longest phrases win within an overlapping region. For example, a reviewed phrase such as “money advice” may map to one local concept, but the implementation must not derive a medical, legal, or eligibility meaning merely because individual words occurred.

For input containing multiple recognised concepts, each concept is an independent retrieval branch and the union is ranked by concept coverage. This prevents a request such as “food and debt help” from requiring one publication to contain both needs before any result appears. Unrecognised remaining terms still participate in lexical retrieval.

The application must not try to diagnose intent, urgency, protected characteristics, or eligibility from prose. Urgent guidance, if later introduced, requires separately reviewed deterministic phrases, content, safety ownership, and testing; search v1 is not an emergency-triage system.

## Reviewed concept dictionary

The concept dictionary is a versioned application artifact reviewed alongside the admitted catalogue. Each entry contains:

```ts
type SearchConcept = {
  key: string;
  preferredLabel: string;
  phrases: string[];
  classificationKeys: string[];
  evidence: Array<
    | { kind: "source"; publicationId: string; evidenceId: string }
    | { kind: "editorial"; reviewDecisionId: string; rationale: string }
  >;
};
```

Rules:

- use the words people are shown in browse/refinement controls;
- keep each phrase narrow enough that a reviewer can explain it;
- map only to reviewed local classifications;
- record source versus editorial origin;
- never label an editorial concept as an official ORUK taxonomy term;
- do not add broad generative expansions, hidden spelling variants, or sensitive inferences;
- require evaluation cases for every added or changed phrase; and
- publish the dictionary version in technical search metadata.

Synonyms are indexed into a separate search field so a result can say, for example, “Matched reviewed term ‘money advice’ to Debt support.” The explanation must not pretend that the synonym appeared on the source page.

## Search projection

`catalogue.search_documents` remains a rebuildable projection of catalogue truth. One row per active publication contains at least:

- entry and active-publication identifiers;
- search-contract and concept-dictionary versions;
- normalised service/provider name text;
- reviewed classification labels and concept phrases;
- source-derived description and support-provided text;
- reviewed eligibility, access, language, and accessibility text where useful for discovery;
- reviewed delivery-location and coverage labels;
- separate `simple` and `english` `tsvector` values with positions retained;
- a compact field-to-lexeme/provenance map used to build explanations; and
- projection build time.

Weights in the composed vectors are:

| Weight | Fields | Reason |
| --- | --- | --- |
| A | service name; preferred classification label | Direct identity or reviewed need label |
| B | reviewed concept/synonym phrases; provider name | Strong reviewed discovery language |
| C | source-derived description; support-provided summary | Useful broader evidence |
| D | eligibility, access, language, accessibility, coverage, and delivery wording | Supporting detail, never a dominant match |

Use a GIN index on the text-search vector as selected in `docs/data-model.md`. Preserve positional data because `ts_rank_cd` uses term proximity. PostgreSQL documents weighted vectors and cover-density ranking in [Controlling Text Search](https://www.postgresql.org/docs/current/textsearch-controls.html).

Projection replacement must be transactional per publication. A projection failure leaves the previous valid projection available, creates an operational failure, and cannot make an unreviewed publication active.

## Candidate retrieval

Each query creates bounded branches whose union is deduplicated by catalogue entry:

1. **Exact identity:** case-folded exact match against service name or a reviewed classification label.
2. **Reviewed concept:** one or more recognised phrases map to a classification attached to the active publication.
3. **Strict lexical:** the full non-empty `plainto_tsquery` matches the weighted English or literal vector.
4. **Relaxed lexical:** if strict lexical retrieval returns fewer than the configured result floor, retrieve entries matching any surviving non-stop lexeme, but require at least one A/B/C-field match. D-only relaxed matches do not qualify.

The result floor is an implementation tuning constant fixed by the evaluation version, initially three; it is not a promise that three results exist. Relaxed retrieval supplements strict results and never changes the meaning of a structured filter.

Do not silently use trigram similarity to retrieve services in v1. Fuzzy matching can produce plausible but unsafe need substitutions. A future spelling-suggestion feature may compare input only with the reviewed visible vocabulary, show the proposed wording, and require the person to resubmit. PostgreSQL's `pg_trgm` supports similarity search, but enabling it is a separate evaluated decision: [PostgreSQL `pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html).

## Deterministic ordering

Results are ordered by a lexicographic tuple, not an opaque blended “confidence” percentage:

```text
(
  best_match_tier ASC,
  recognised_concepts_matched DESC,
  query_lexeme_coverage DESC,
  weighted_lexical_rank DESC,
  source_backed_area_signal DESC,
  normalised_service_name ASC,
  public_entry_id ASC
)
```

### Match tier

| Tier | Qualification |
| --- | --- |
| 0 | Exact service-name match |
| 1 | Exact reviewed classification/preferred-label match |
| 2 | Reviewed concept/synonym match |
| 3 | Strict lexical match |
| 4 | Relaxed lexical match |

An entry receives its best qualifying tier. Tier is about the evidence path, not service quality, official approval, eligibility, or availability.

### Lexical components

- `recognised_concepts_matched` is the number of distinct requested concepts attached to the publication.
- `query_lexeme_coverage` is matched eligible lexemes divided by eligible query lexemes. It is used only for ordering; do not show it as a confidence percentage.
- `weighted_lexical_rank` uses `ts_rank_cd` with the documented vector weights and a fixed normalisation option selected in the implementation ADR/test fixture. V1 starts with normalisation `32` only for bounded display-independent scaling; changing it changes the search-contract version.

PostgreSQL explicitly notes that relevance is application-specific and that rank normalisation to zero–one is cosmetic rather than a probability. Navigator therefore never displays the database rank as “% match”.

### Geography component

`source_backed_area_signal` breaks ties only after textual/concept relevance:

| Signal | Value |
| --- | ---: |
| Explicit reviewed coverage matches the resolved user area | 2 |
| Reviewed delivery-location postcode is assigned to the same Ashton built-up area | 1 |
| Remote, unknown, omitted, unavailable, outside-reference, or non-matching coarse geography | 0 |

Zero is neutral, not a penalty. Borough-wide and remote services are not demoted for lacking an Ashton venue. Geography never creates a candidate, establishes eligibility, or filters a result unless the person explicitly selected a reviewed structured coverage filter. The qualifications and user messages in `docs/research/location-postcode.md` are mandatory.

Do not rank by completeness, publisher identity, source freshness, popularity, click-through rate, or correction-report count. Those facts may be disclosed or used operationally, but they do not make one service more relevant to a need. An urgent source-backed warning is presentation content, not a relevance boost.

Stable name and public-ID tie-breakers make pagination repeatable. Page size is bounded to 20; v1 defaults to 10. A search response records the active search-contract, concept-dictionary, catalogue-snapshot, and postcode-reference versions used so a result order can be reproduced without retaining the query.

## Match explanations

Every returned result has one to three concise reasons derived from the actual winning signals. The response uses typed evidence, not generated prose:

```ts
type MatchReason =
  | { kind: "service_name"; queryWords: string[]; evidenceIds: string[] }
  | { kind: "classification"; label: string; origin: "source" | "editorial"; evidenceIds: string[] }
  | { kind: "reviewed_synonym"; phrase: string; conceptLabel: string; reviewDecisionId: string }
  | { kind: "description"; queryWords: string[]; evidenceIds: string[] }
  | { kind: "coverage"; areaLabel: string; evidenceIds: string[] }
  | { kind: "delivery_area"; qualifiedLabel: string; evidenceIds: string[]; referenceRelease: string };
```

Reason selection order is service name, classification, reviewed synonym, source description, explicit coverage, then qualified delivery area. Deduplicate near-identical reasons and omit supporting D-field matches when stronger reasons already explain the result.

Required wording distinctions:

- source term: “The service description mentions debt advice.”
- editorial mapping: “Your words ‘money advice’ match the reviewed category Debt support.”
- coverage: “The source says this service covers Tameside.”
- venue assignment: “Venue postcode is assigned to Ashton-under-Lyne.”

Never say “best for you”, “eligible”, “available now”, “approved”, “near you”, “nearest”, or “within” unless a future source and decision explicitly support that fact. Highlighting must HTML-escape source and query content; prefer rendering matched field labels/short reviewed fragments rather than executing `ts_headline` over arbitrary HTML.

## Filters and empty states

Filters apply after the same publication/source admission boundary and before pagination. Each visible option shows plain language and is backed by reviewed structured data. Multiple selections within one facet use OR; different facets use AND. The results heading and live status state the applied controls without repeating sensitive free text.

When no result qualifies:

1. state that the limited pilot found no match, not that no support exists;
2. preserve the typed need in the current response only;
3. offer to remove structured filters;
4. offer reviewed browse categories;
5. allow postcode removal or continuation across all pilot services; and
6. link to the council's authoritative source directory/data-sources explanation where appropriate.

Do not automatically replace the person's query, broaden to an unrelated concept, or show another region.

## Versioned evaluation set

The evaluation artifact is reviewed data in the repository, separate from production analytics. Each case contains:

```ts
type SearchEvaluationCase = {
  id: string;
  category: "exact" | "synonym" | "vague" | "mixed" | "place" | "filter" | "zero_result" | "adversarial";
  query: string;
  userArea: UserAreaResolution;
  filters: Record<string, string[]>;
  expectedRelevant: Array<{ publicEntryId: string; allowedReasons: string[] }>;
  expectedTopThree?: string[];
  forbiddenEntries?: string[];
  rationale: string;
  reviewer: string;
  reviewedAt: string;
  catalogueSnapshot: string;
};
```

Expectations must be derived from admitted publications and reviewed mappings. Do not fabricate a result expectation to improve a metric. Changing source content, a concept phrase, filter, weight, threshold, or ranking rule requires a new evaluation version and an explained diff.

Before public launch the set contains at least 40 cases and at least:

- five exact-name or exact-need cases;
- eight plain-language synonym cases;
- five vague/short cases;
- five mixed-need cases;
- five Ashton/Tameside/omitted/unavailable place variants;
- five structured-filter cases;
- four honest zero-result cases; and
- three adversarial cases covering excluded/unreviewed data and misleading geography.

One case may satisfy more than one coverage count only when its primary category remains explicit. Every active publication appears as expected relevant in at least three materially different cases, including one plain-language case.

### Release gates

All safety/truth gates are absolute:

- **100%** of results are active, reviewed, admitted, and licensed.
- **100%** of displayed match reasons are backed by an allowed field evidence or review decision.
- **100%** of forbidden-entry, geography, privacy, and zero-result assertions pass.
- **0** results or explanations infer eligibility, availability, distance, endorsement, or provider-address delivery.
- **0** raw queries or submitted postcodes appear in logs, persistence, analytics, URLs, or traces in the test harness.

Usefulness gates, reported overall and per category so averages cannot hide a broken cohort:

- required relevant entry recall at 5 is **100%** for exact and reviewed-synonym cases;
- at least one expected relevant entry appears in the top 3 for **95%** of all non-zero cases and **100%** of exact cases;
- mean reciprocal rank is at least **0.85** overall and **0.75** in each non-zero category;
- every mixed-need case returns an expected entry for each reviewed recognised concept within the first 5 when the catalogue contains one; and
- result ordering is byte-for-byte stable across five repeated runs against the same snapshot and versions.

With a five-entry pilot, these gates are intentionally demanding but are not proof of general search quality. Report raw failing case IDs beside every aggregate. A release cannot waive an absolute gate; it may document and accept a usefulness miss only before launch, with the relevant public limitation and a linked follow-up issue.

### Performance and resilience checks

- repository search p95 is below 300 ms over 1,000 repeated production-shaped requests in CI/local PostgreSQL after warm-up;
- the query plan uses the intended GIN/indexed access path at the largest agreed synthetic catalogue size;
- input length and page size bounds prevent unbounded work;
- the same need query completes when postcode resolution is omitted or forced unavailable;
- a missing semantic provider configuration has no effect; and
- projection rebuild failure preserves the prior searchable snapshot.

The latency check is an engineering regression budget, not a public SLA. Production monitoring must use aggregate timings only.

## Accessibility contract

- Search is a labelled form with a normal submit action and progressive enhancement; it is not dependent on live suggestions.
- The input has concise hint text, does not silently truncate, and preserves its value on a correction response.
- Validation errors use an error summary and programmatic field association.
- Results count and filter changes are announced without moving focus unexpectedly.
- “Why this matched” is text available to assistive technology, not a tooltip, colour, icon, or score alone.
- Result order is meaningful in DOM order and does not visually reorder with CSS.
- No-results and error states have a heading and a concrete next action.
- The core form submission and result links work without client-side JavaScript where the framework architecture permits progressive enhancement.

## Implementation and test seam

Keep query interpretation separate from persistence:

```ts
interface SearchInterpreter {
  interpret(input: SearchRequest): InterpretedSearch;
}

interface ServiceDiscoveryRepository {
  search(input: InterpretedSearch): Promise<PaginatedResult<SearchResult>>;
  getByPublicId(id: CatalogueEntryPublicId): Promise<ServiceDetails | null>;
}
```

Unit-test normalisation, phrase matching, concept branching, reason selection, ordering tuples, privacy redaction, and public messages without a database. Run repository contract, rank, permission, and query-plan tests against PostgreSQL. Browser tests cover search, filters, result explanations, detail navigation, empty states, postcode correction/removal, keyboard use, screen-reader status, and JavaScript-disabled submission.

## Deferred decisions

- Semantic reranking/embeddings remain absent until issue #11 demonstrates a measured deterministic-search failure and passes the same truth/evaluation gates.
- Typo suggestions require a separate, visible reviewed-vocabulary design; silent fuzzy retrieval is not approved.
- Urgent or safeguarding signposting requires accountable content ownership and a dedicated safety decision.
- Personalisation, saved searches, user profiles, popularity ranking, and behavioural ranking are outside v1.
- Maps, radius search, travel time, and nearest-service claims require materially better service-location evidence and a separate decision.

## Consequences

The pipeline is modest but reproducible: every candidate and reason can be inspected, the catalogue remains usable with no AI or external postcode API, and sparse Tameside evidence stays visible rather than being papered over. The cost is editorial ownership of a small concept dictionary and evaluation set. That is appropriate for the pilot: reviewed language and failing examples create reusable product evidence, while an opaque model score would not repair missing service facts.

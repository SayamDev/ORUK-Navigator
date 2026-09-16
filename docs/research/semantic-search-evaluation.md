# Semantic search v1 evaluation

**Decision:** defer semantic retrieval from v1  
**Measured:** 16 September 2026  
**Related:** GitHub issue #11, `src/data/search-evaluation.ts`, ADR 0003

## Question

Would a local/open semantic provider improve retrieval for the admitted Tameside catalogue enough to justify its privacy, performance, hosting, explainability, and failure-isolation costs?

## Method

The evaluation uses ten reviewed query cases stored as code, not screenshots or subjective examples:

- nine in-scope formulations derived from facts present in the five admitted council source pages;
- ten expected service relevance judgements across those formulations; and
- one deliberately unrelated query that must return no results.

The automated gate checks whether every expected service appears within the first three deterministic results and whether the unrelated query remains empty. It runs with the ordinary unit suite.

This is intentionally a small pilot evaluation. It measures the current catalogue; it is not evidence that deterministic retrieval will remain sufficient as coverage grows.

## Result

| Measure | Deterministic baseline |
| --- | ---: |
| Query cases | 10 |
| Expected relevant service judgements retrieved at rank ≤3 | 10 / 10 |
| Source-backed recall@3 | 100% |
| Unrelated zero-result truth gate | 1 / 1 |
| External model/API calls | 0 |
| Model download/runtime weight | 0 |
| Search text transmitted or retained | 0 |

Run:

```bash
pnpm test -- src/lib/search-evaluation.test.ts
```

The baseline reaches the ceiling of the current source-backed recall measure. A semantic reranker cannot demonstrate a retrieval gain on this set. Adding one now would therefore add runtime/build weight, cold-start risk, new failure modes, and harder explanations without a measured user benefit.

## Why no model bake-off was run

Running several embedding models would not answer the decision question while the accepted baseline has no measured misses. Model selection at this point would optimise an implementation before establishing a problem and could overfit a ten-query/five-service catalogue.

The honest outcome is to defer provider integration, preserve the interface boundary described in the product architecture, and grow the evaluation set with reviewed sources and observed anonymous research—not production query logging.

## Reconsideration gate

Prototype one or more local/open semantic providers only when all of the following are true:

1. the catalogue or reviewed evaluation set has grown materially;
2. at least five distinct meaning/wording cases fail deterministic recall@3 after reasonable concept-dictionary review;
3. the failures cannot be fixed by correcting missing source classification or an obviously reusable reviewed synonym;
4. a provider can run within the selected free hosting memory, bundle, cold-start, and latency budgets; and
5. result explanations still resolve to reviewed catalogue fields rather than model similarity alone.

Any future prototype must compare the same frozen cases and report recall@3, zero-result false positives, p95 latency, memory/startup cost, artefact size, failure behaviour, and whether search text leaves the application boundary. It must also prove that disabling the provider restores deterministic results without breaking the public journey.

## Limitations

- Ten queries cannot represent the language of every person seeking support.
- The fixtures cover only five provisionally admitted council services.
- The test measures retrieval truth, not comprehension, usability, or real-world outcome.
- No claim is made that semantic search is generally ineffective; only that it has not earned v1 complexity here.

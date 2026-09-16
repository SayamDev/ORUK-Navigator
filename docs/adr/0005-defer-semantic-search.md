# ADR 0005: Defer semantic search from v1

- **Status:** accepted
- **Date:** 2026-09-16
- **Decision owners:** ORUK Navigator maintainers
- **Related:** GitHub issue #11, `docs/research/semantic-search-evaluation.md`, ADR 0003

## Context

The product brief permits an optional local semantic provider but requires core discovery to work without paid AI. Semantic retrieval would add model artefacts, hosting/runtime cost, cold-start and failure concerns, and an explanation layer that must never create service facts.

The admitted pilot catalogue contains five services. A versioned ten-query source-backed evaluation set produces ten expected relevance judgements and one unrelated zero-result gate. The deterministic baseline retrieves 10/10 expected judgements within rank three and returns no result for the unrelated query.

## Decision

Do not ship embeddings, a vector index, or semantic reranking in v1.

Keep future semantic capability behind optional interfaces, but do not add a provider implementation until the frozen deterministic evaluation exposes a meaningful cluster of vocabulary/meaning misses that reviewed synonyms and source classification cannot responsibly address.

The first reconsideration requires at least five such distinct failures plus measured provider evidence for retrieval gain, zero-result safety, latency, memory/startup, artefact size, privacy, explainability, and deterministic fallback.

## Alternatives considered

### Add a small local embedding model now

This would demonstrate an AI component, but cannot improve the current recall measure and would make a five-record catalogue operationally heavier. Rejected because technical display is not a user need.

### Use a free hosted embedding API

This avoids local model weight but transmits potentially sensitive support narratives to another processor and creates an external availability dependency. Rejected for the v1 baseline.

### Use semantic output only for explanations

Model prose could sound more natural, but field-backed templated explanations are auditable and already satisfy the trust requirement. Rejected because fluent text is not evidence.

## Consequences

- V1 search stays small, deterministic, reproducible, and available without a model runtime.
- The repository still demonstrates AI judgement: a measured decision not to add AI where it has no proven value.
- Maintainers must expand the versioned evaluation set as reviewed coverage grows.
- A future semantic provider has a precise evidence gate and must remain optional and failure-isolated.

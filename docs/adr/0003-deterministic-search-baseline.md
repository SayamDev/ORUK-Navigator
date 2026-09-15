# ADR 0003: Deterministic search is the v1 baseline

- **Status:** accepted
- **Date:** 2026-09-15
- **Decision owners:** ORUK Navigator maintainers
- **Related:** GitHub issue #8, `docs/search.md`, `docs/research/location-postcode.md`

## Context

ORUK Navigator must help people find support from a small, reviewed Tameside catalogue without retaining sensitive queries or requiring paid/opaque AI. The admitted sources contain uneven prose, sparse classifications, and limited location evidence. A semantic model cannot repair those missing facts and would make retrieval harder to reproduce and explain.

## Decision

V1 uses deterministic PostgreSQL full-text retrieval with:

- weighted source fields;
- a small, versioned, reviewer-approved concept/synonym dictionary;
- structured filters backed by reviewed data;
- coarse source-backed geography only after need relevance;
- stable tie-breakers and typed field-level match reasons; and
- a versioned evaluation set with absolute truth/privacy gates.

Embeddings and semantic reranking are absent from the required path. They may be reconsidered only when the deterministic evaluation set exposes a measured problem and a prototype passes the same truth, privacy, accessibility, and failure gates. Semantic output may never create facts, eligibility, coverage, or the only explanation.

## Consequences

- Search works with no model provider, external search service, or live postcode API.
- Every result and reason can be traced to reviewed evidence or an explicit editorial mapping.
- Maintainers must own a small concept dictionary and evaluation set.
- Silent fuzzy retrieval, behavioural ranking, popularity ranking, proximity claims, and opaque confidence percentages are excluded from v1.
- Optional future semantic work has a fixed deterministic baseline against which to demonstrate value.

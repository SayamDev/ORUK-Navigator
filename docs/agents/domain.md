# Domain documentation

This repository uses a single-context domain-documentation layout.

## Read before exploring

- Read `CONTEXT.md` at the repository root when it exists.
- Read relevant decisions under `docs/adr/` before changing an affected area.
- If either location does not exist yet, proceed without creating placeholder documentation. Domain-modelling work creates these files when real terminology or decisions need recording.

## Intended layout

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
`-- src/
```

## Use the glossary vocabulary

Use terms as defined in `CONTEXT.md` in issue titles, design proposals, hypotheses, tests, and implementation. Do not drift to synonyms that the glossary explicitly avoids.

If a needed concept is absent, first check whether the proposed language belongs in the product. Record genuine terminology gaps through the domain-modelling flow.

## Flag decision conflicts

If proposed work contradicts an existing ADR, identify the conflict explicitly and explain why reopening the decision may be justified. Never silently override an accepted decision.

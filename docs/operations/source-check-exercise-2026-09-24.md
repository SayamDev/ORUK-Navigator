# First production source-check exercise: 24 September 2026

## Outcome

The manually dispatched [Source freshness run](https://github.com/SayamDev/ORUK-Navigator/actions/runs/35991899586) checked all ten approved Tameside source URLs. Every request reached a publisher page with HTTP 200 and `text/html`, but all ten extraction checks rejected the page with `missing_required_field`. The workflow correctly failed and opened [the deduplicated operations issue](https://github.com/SayamDev/ORUK-Navigator/issues/47).

The production database contained zero new pending candidates after this run. Published service facts were not replaced. The source pages were marked `invalid`, so the public interface warns readers to confirm details with the publisher.

## Cause and boundary

The extractor in `src/ingestion/tameside-page-adapter.ts` expects `main h1` and fixture-specific IDs such as `#service-summary`, `#who-it-helps`, and `#how-to-access`. The live Tameside pages instead use a `#main-content` region and varied heading structures. For example, the approved Crisis Payments page has its title and sections in that region, but no `<main>` element. The fetch and admission boundary worked; the extraction contract did not match live publisher markup.

This is a real integration failure, not a service closure or proof that the council information changed. Do not waive the required fields or mark these sources healthy just because the URLs answer successfully.

## Safe next steps

1. Review each publisher page and define source-specific, field-level selectors or a narrower technical-check contract. Keep evidence for every published fact.
2. Test the rules against captured, reviewed examples of the current publisher pages and against missing-field/changed-markup cases.
3. Run one source manually, inspect the resulting candidate privately, then run the remaining nine. Never auto-approve the first live candidate from a seeded fixture baseline.
4. Leave issue #47 open until a production rerun demonstrates contract-valid checks and the reviewer can handle the resulting queue.

The workflow remains available for controlled manual retests. Its weekly schedule was paused after this exercise, rather than treating repeated alerts as successful monitoring. Restore a schedule only after source-specific extraction rules and a production rerun pass.

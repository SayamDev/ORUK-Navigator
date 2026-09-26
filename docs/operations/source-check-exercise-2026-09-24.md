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

## Remediation: 26 September 2026

All ten approved pages are served by the council's Liferay CMS with a stable shape: the service title in `#main-content h1.page-title` and the content in the first `#main-content .journal-content-article`. Inside that article, markup varies between `<p>` paragraphs and bare text separated by `<br>` (Equipment and Adaptations), and heading levels vary (`h2`, `h3`, `h4`).

The adapter is now `tameside-liferay-v2` with rules `reviewed-pages-v2`:

- The article is flattened into an ordered list of headings and text lines, so paragraph and `<br>` markup read the same way.
- Each page has reviewed locators per field: the page title, a named section heading, the lead text before the first heading, or a named starting line. A section stops at the next heading of the same or higher rank.
- Area, cost, and the Early Support and Advice Hub name are editorially reviewed wording. They are published only while a confirming phrase still matches the page, and the matched phrase is stored as evidence.
- A renamed heading, missing confirming phrase, or changed page shape still rejects the page with `missing_required_field`. Nothing is waived.
- Test fixtures are reduced captures of the live pages (header and first article only), taken on 26 September 2026 under the Open Government Licence.

Against the captures, all ten pages now produce candidates with evidence for name, description, area, and access. The next steps from the list above still apply: run one source in production, review the candidate privately against the council page, then run the remaining nine. The first live candidates will be `changed` until a reviewer approves them, and then `healthy` on the next unchanged check.

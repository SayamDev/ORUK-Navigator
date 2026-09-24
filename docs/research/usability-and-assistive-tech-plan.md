# Usability and assistive-technology test plan

**Status:** prepared, not conducted. Do not describe this as user-test evidence until real sessions and findings are recorded.

## Questions to answer

- Can someone who does not know the pilot's ten-service scope tell what is available before searching?
- After searching for money support, can they find the relevant council resource and understand why it matched?
- Do they notice that the result is not an eligibility or availability decision?
- Can they follow the original publisher link and understand the difference between a human-reviewed publication and a technical source check?
- Can keyboard and screen-reader users complete the same journey without losing focus or context?

## Participants and safeguards

Recruit actual or likely Tameside service users, including people with limited digital confidence and people who already use assistive technology. Do not substitute the project team for public-service users. Use an accessible consent process and do not ask participants to disclose real debt, housing, health or family details. Test with fictional scenarios, collect only the minimum research notes, and obtain separate consent before any recording or public quotation. No search narrative or postcode should be copied into GitHub issues.

GOV.UK's [participant guidance](https://www.gov.uk/service-manual/user-research/find-user-research-participants) suggests four to eight participants for a round of usability tests and calls for including disabled people and people with lower digital skills. Its [privacy guidance](https://www.gov.uk/service-manual/user-research/managing-user-research-data-participant-privacy) applies to notes and recordings.

## Moderated tasks

Use a 30- to 45-minute session. Ask the participant to think aloud without coaching them toward a link.

1. “You have had an unexpected expense and want to find out what support may exist in Tameside. Start from this page.” Observe whether the scope panel and support-type suggestions help.
2. “Choose one result and tell me what it might help with, what is uncertain, and what you would do next.” Observe the match reason, council link and source warning.
3. “Find where this result came from and when its displayed information was last reviewed.” Observe provenance and date comprehension.
4. “You do not see a relevant result. What would you do?” Observe the no-results and coverage guidance without suggesting an answer.

Ask afterward what was confusing, missing or reassuring. Record task completion, hesitation points, mistaken assumptions and exact UI location; avoid scoring participants.

## Assistive-technology pass

A named reviewer should test the same tasks with VoiceOver + Safari on macOS or iOS and NVDA + Firefox or Chrome on Windows. Include the skip link, labels and hints, suggestion controls, validation, results announcement, match explanation, detail/provenance links and technical-status warnings. Test keyboard-only focus order and 200% zoom separately. GOV.UK says [assistive-technology testing belongs throughout development](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies), particularly after significant changes.

## Evidence record

For each session, record: date; participant code (not name); relevant access needs; device/browser/assistive-technology versions; task outcomes; de-identified findings; severity; proposed fix; issue link; and retest result. Store consent and any recordings outside this public repository. Publish only aggregated, anonymised findings.

The human screen-reader release gate in [accessibility-review.md](../accessibility-review.md) stays open until the pass and fixes are documented.

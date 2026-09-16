# Accessibility release review

**Reviewed:** 16 September 2026
**Target:** WCAG 2.2 AA
**Status:** automated and keyboard gates pass; human screen-reader pass remains a launch blocker

## Automated evidence

The production-mode Playwright suite runs axe rules tagged WCAG 2.0 A/AA, 2.1 A/AA, and 2.2 AA against:

- home/search before interaction;
- dynamically rendered search results;
- service detail;
- correction form;
- About the data; and
- Technical status.

It runs at 1280×720, 390×844, and 320×720. All 27 browser checks passed on 16 September 2026 with no reported axe violations or horizontal overflow.

## Keyboard and visual review record

The real-browser journey verifies focus order from need → place → submit, moves focus to the results summary, follows semantic links to detail and correction pages, submits the form, and observes the live confirmation. Errors move focus to the error summary and link to the affected field. Visible `:focus-visible` treatment remains on every interactive element.

The 1280px Technical status and 320px home layouts were visually inspected after the release changes. Content remained readable without clipping, navigation remained operable, and 320px did not introduce horizontal scrolling.

## Screen-reader review still required

axe and browser accessibility semantics cannot replace listening with assistive technology. Before public launch, a named human reviewer must run VoiceOver + Safari or NVDA + Firefox through:

1. skip link and primary navigation;
2. search labels, hints, validation, results announcement, and match explanation;
3. service headings, definition lists, publisher link, and correction link;
4. correction radio group, privacy warning, error summary, busy state, and UUID receipt;
5. Technical status summary and checking warnings.

Record reviewer, browser/screen-reader versions, date, findings, fixes, and retest result here. Do not mark the release gate complete until this section contains that evidence.

## Deliberate privacy exception

Search state is not deep-linked. This intentionally departs from the general interface preference for URL-reflected state because narratives and postcodes must not enter URLs, browser history, referrer headers, hosting request logs, or copied links. The pre-hydration form uses POST for the same reason.

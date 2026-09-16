# Public journey prototype fidelity record

**Reviewed:** 16 September 2026  
**Reference:** `docs/design/concepts/` and `DESIGN.md`

This record captures the five-point comparison completed after rendering the implementation in a real browser. Code-native semantics and accessibility take precedence over incidental image-generation details.

## 1. Layout

- The homepage follows the approved information-rich composition: branded bar wordmark, pale-grey hero, editorial heading, reviewed-coverage panel, and overlapping search card.
- Common topic choices remain visible for people who do not yet know what support exists, then narrow contextually as someone types.
- Results remain an open divided list rather than a dashboard.
- Service details use an article and provenance rail on wide screens, collapsing to one column on small screens.
- The report journey keeps visible radio choices and privacy guidance.

## 2. Typography

- Newsreader is limited to major headings.
- Atkinson Hyperlegible is used for body copy, labels, navigation, and controls.
- Text remains sentence case with readable line lengths and a 1rem-or-larger base for controls.

## 3. Colour and identity

- Navy `#243588`, cyan `#009fe3`, green `#7cc68d`, and teal `#82c0c7` establish the intended visual relationship to the iNetwork/iStandUK ecosystem.
- The three-bar wordmark is original to ORUK Navigator and uses the established blue, cyan, and green brand palette.
- No third-party logo, endorsement claim, gradient, glass treatment, or purple AI styling is used.

## 4. Components and content

- Search, contextual topic suggestions, result cards, match explanations, source warnings, provenance, validation errors, and prototype confirmations are implemented as semantic components.
- All public service claims come from the reviewed fixture/source manifest; fast-changing contact details are not invented or copied into the prototype.
- The location field starts with Ashton-under-Lyne to make the pilot area concrete and validates that searches remain within Tameside.

## 5. Responsive and interaction behaviour

- Repository-backed Playwright checks pass in isolated Chromium at 1280×720, 390×844, and 320×720.
- Desktop and narrow-mobile layouts have no horizontal overflow.
- Inputs and actions retain at least 48px targets, visible labels, and keyboard focus styling.
- Keyboard submission moves focus and the viewport to the result summary, with smooth movement disabled when the user prefers reduced motion; the need and location never enter the URL.
- The search → result → detail/provenance journey runs against the seeded private Postgres repository with a clean browser console.
- Automated WCAG A and AA scans pass on the homepage, dynamic results, About page, service details, reporting form, and technical status page.

# Public journey prototype fidelity record

**Reviewed:** 16 September 2026  
**Reference:** `docs/design/concepts/` and `DESIGN.md`

This record captures the five-point comparison completed after rendering the implementation in a real browser. Code-native semantics and accessibility take precedence over incidental image-generation details.

## 1. Layout

- The homepage retains one dominant task, a limited-pilot warning, and a three-step explanation.
- Results remain an open divided list rather than a dashboard.
- Service details use an article and provenance rail on wide screens, collapsing to one column on small screens.
- The report journey keeps visible radio choices and privacy guidance.

## 2. Typography

- Newsreader is limited to major headings.
- Atkinson Hyperlegible is used for body copy, labels, navigation, and controls.
- Text remains sentence case with readable line lengths and a 1rem-or-larger base for controls.

## 3. Colour and identity

- Navy `#243588`, cyan `#009fe3`, green `#7cc68d`, and teal `#82c0c7` establish the intended visual relationship to the iNetwork/iStandUK ecosystem.
- The wordmark and route motif are original to ORUK Navigator.
- No third-party logo, endorsement claim, gradient, glass treatment, or purple AI styling is used.

## 4. Components and content

- Search, result cards, match explanations, source warnings, provenance, validation errors, and prototype confirmations are implemented as semantic components.
- All public service claims come from the reviewed fixture/source manifest; fast-changing contact details are not invented or copied into the prototype.
- The reporting form explicitly states that prototype reports are not sent or stored.

## 5. Responsive and interaction behaviour

- Repository-backed Playwright checks pass in isolated Chromium at 1280×720 and 390×844.
- The 390px viewport has no horizontal overflow.
- Inputs and actions retain at least 48px targets, visible labels, and keyboard focus styling.
- Keyboard submission moves focus to the result summary; the need and place never enter the URL.
- The search → result → detail/provenance journey runs against the seeded private Postgres repository with a clean browser console.
- Browser testing exposed and fixed a pre-hydration native-form privacy leak by ensuring sensitive fields have no serializable form names.

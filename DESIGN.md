# ORUK Navigator design direction

**Status:** prototype source of truth  
**Last reviewed:** 16 September 2026

## Intent

ORUK Navigator should feel related to the public-sector standards community around iStandUK and iNetwork without copying either organisation or implying endorsement. The interface is an independent, accessible civic product: direct, calm, source-conscious, and useful under stress.

The prototype screens are stored in `docs/design/concepts/`:

- `home-search.png`
- `search-results.png`
- `service-detail.png`
- `report-problem.png`

They define the page hierarchy and visual rhythm. Code-native text, semantic structure, responsive behaviour, and accessibility requirements take precedence over any image-generation artefact.

## Brand relationship and independence

The colour lineage intentionally references the current public visual family:

- iNetwork-adjacent navy anchors the interface;
- iStandUK-adjacent cyan identifies links, focus, and active controls;
- soft green and teal support non-critical information states; and
- white and cool grey keep public tasks legible.

ORUK Navigator must not use the iStandUK, iNetwork, Tameside Council, or ORUK logos without explicit permission. It must not claim to be produced, endorsed, certified, or maintained by those organisations.

## Tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#ffffff` | Primary page background |
| Surface | `#f4f6fa` | Quiet panels and alternate bands |
| Ink | `#1d2433` | Body text |
| Navy | `#243588` | Headings and primary actions |
| Cyan | `#009fe3` | Links, focus, active details |
| Soft green | `#7cc68d` | Positive/supporting information only |
| Soft teal | `#82c0c7` | Route motif and calm information accents |
| Border | `#d9e0e8` | Rules and control boundaries |
| Muted ink | `#536176` | Secondary text; verify contrast per size |
| Error | `#b4232d` | Error text and boundaries, never colour alone |
| Error surface | `#fff2f2` | Error summary background |

Do not use gradients, glassmorphism, heavy shadows, neon colour, or a purple/blue AI palette. Soft green is not dark enough for white text.

## Typography

- Display headings: Newsreader, with Georgia as fallback, used sparingly.
- Body, labels, controls, and navigation: Atkinson Hyperlegible, with Arial/sans-serif fallback.
- Minimum body/control size: `1rem`.
- Body line height: at least `1.55`.
- Text blocks: generally no wider than `68ch`.
- Sentence case only; no decorative all-caps labels.

## Layout

- Maximum content width: `90rem` with responsive gutters.
- Search homepage: one dominant task with explicit scope limitation.
- Results: an open divided list; filters are a fieldset, not a dashboard sidebar on small screens.
- Detail: article plus provenance rail on wide screens, one semantic column on narrow screens.
- Report: visible radio choices, privacy guidance, error summary, and confirmation state.
- Corners: `0.375rem` to `0.625rem`; no pill-shaped primary controls.
- Elevation: borders and spacing first; shadows only where layer ownership requires them.

The signature motif is a thin abstract route line with restrained nodes. It encodes the journey from need to reviewed source; it is not a map and must never imply distance or location precision.

## Interaction and accessibility

- WCAG 2.2 AA is the minimum target.
- All controls have visible labels, a minimum 48px target, and a 3px cyan/ink focus ring with offset.
- Search need and postcode use POST/body semantics and are not placed in URLs, logs, analytics, or persistence.
- Errors appear both in a focusable summary and inline beside the affected field.
- Results and state changes use restrained polite announcements.
- Motion is optional and minimal; respect `prefers-reduced-motion`.
- Core navigation and form submission must remain understandable without client-side JavaScript.

## Content rules

- State that pilot coverage is limited near search and results.
- Use “Why this matched” only for field-backed reasons.
- Keep match explanations separate from service facts.
- Show publisher, source URL, checked date, licence, and review status.
- Never say “best for you”, “eligible”, “available now”, “near you”, “nearest”, or present a confidence percentage.
- Missing information remains missing; do not invent contacts or opening times.


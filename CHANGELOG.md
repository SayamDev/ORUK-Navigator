# Changelog

All notable public-facing changes are recorded here. The project follows semantic versioning after its first tagged pilot release.

## [Unreleased]

### Added

- Privacy-preserving local-support search over reviewed Tameside publications.
- Visible common-search choices and contextual topic suggestions for people who do not know what support is available.
- Source-backed service detail, provenance, correction reporting, and technical status journeys.
- Private ingestion, catalogue, and operations schemas with immutable publication history.
- CI release gates for code quality, database contracts, responsive browser journeys, accessibility, dependencies, and security headers.
- Reproducible search-projection rebuild and backup/restore rehearsal commands.
- Public Vercel pilot backed by a dedicated UK-region Free Plan Supabase project.
- Five more reviewed Tameside Council services: Housing Payments, Tameside Carers Centre, Family Hubs, Equipment and Adaptations, and the adult social care Early Support and Advice Hub, with an idempotent data script for existing databases.
- Common-search choices for caring for someone, families and children, and equipment and adaptations.
- ORUK v3 (HSDS-UK-3.0) publishing feed at `/api/oruk/v3` with services and organisations endpoints, validated as Level 1 compliant by the official Open Referral UK validator.

### Changed

- Restored the approved information-rich ORUK Navigator homepage with its branded wordmark, coverage panel, prominent search card, and prefilled Ashton-under-Lyne pilot location.
- Kept common support types visible and narrowed them to relevant suggestions as people type.
- Directed the viewport and keyboard focus to **Support that may help** after a successful search, while respecting reduced-motion preferences.
- Search words now match only at the start of source words, so short words such as "rent" no longer match inside "current"; matches in a service name rank slightly higher; "financial assessment" no longer counts as financial support.
- The homepage coverage count and wording now follow the number of reviewed services.

### Security

- Per-request nonce Content Security Policy and hardened browser response headers.
- Server validation, bounded requests, honeypot, keyed rate limiting, and retention for correction reports.
- Immutable GitHub Action references, frozen dependency installation, secret scanning, dependency review, and production audit.
- Fail-closed public correction intake until an explicit launch flag, fallback owner, and staffed review hours are configured.

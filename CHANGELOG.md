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

### Changed

- Restored the approved information-rich ORUK Navigator homepage with its branded wordmark, coverage panel, prominent search card, and prefilled Ashton-under-Lyne pilot location.
- Kept common support types visible and narrowed them to relevant suggestions as people type.
- Directed the viewport and keyboard focus to **Support that may help** after a successful search, while respecting reduced-motion preferences.

### Security

- Per-request nonce Content Security Policy and hardened browser response headers.
- Server validation, bounded requests, honeypot, keyed rate limiting, and retention for correction reports.
- Immutable GitHub Action references, frozen dependency installation, secret scanning, dependency review, and production audit.
- Fail-closed public correction intake until an explicit launch flag, fallback owner, and staffed review hours are configured.

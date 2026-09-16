# Changelog

All notable public-facing changes are recorded here. The project follows semantic versioning after its first tagged pilot release.

## [Unreleased]

### Added

- Privacy-preserving local-support search over reviewed Tameside publications.
- Contextual topic suggestions and an explicit support-type browser for people who do not know what support is available.
- Source-backed service detail, provenance, correction reporting, and technical status journeys.
- Private ingestion, catalogue, and operations schemas with immutable publication history.
- CI release gates for code quality, database contracts, responsive browser journeys, accessibility, dependencies, and security headers.
- Reproducible search-projection rebuild and backup/restore rehearsal commands.
- Public Vercel pilot backed by a dedicated UK-region Free Plan Supabase project.

### Changed

- Restored the approved ORUK Navigator homepage composition, brand typography, palette, route signature, navigation, and responsive layout.
- Made the town or postcode field genuinely optional and removed the prefilled location.
- Kept support types out of the default layout while surfacing relevant suggestions as people type.

### Security

- Per-request nonce Content Security Policy and hardened browser response headers.
- Server validation, bounded requests, honeypot, keyed rate limiting, and retention for correction reports.
- Immutable GitHub Action references, frozen dependency installation, secret scanning, dependency review, and production audit.
- Fail-closed public correction intake until an explicit launch flag, fallback owner, and staffed review hours are configured.

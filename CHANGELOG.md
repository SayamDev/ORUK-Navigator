# Changelog

All notable public-facing changes are recorded here. The project follows semantic versioning after its first tagged pilot release.

## [Unreleased]

### Added

- Privacy-preserving local-support search over reviewed Tameside publications.
- Source-backed service detail, provenance, correction reporting, and technical status journeys.
- Private ingestion, catalogue, and operations schemas with immutable publication history.
- CI release gates for code quality, database contracts, responsive browser journeys, accessibility, dependencies, and security headers.
- Reproducible search-projection rebuild and backup/restore rehearsal commands.
- Public Vercel pilot backed by a dedicated UK-region Free Plan Supabase project.

### Security

- Per-request nonce Content Security Policy and hardened browser response headers.
- Server validation, bounded requests, honeypot, keyed rate limiting, and retention for correction reports.
- Immutable GitHub Action references, frozen dependency installation, secret scanning, dependency review, and production audit.
- Fail-closed public correction intake until an explicit launch flag, fallback owner, and staffed review hours are configured.

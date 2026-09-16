# Security and privacy release review

**Reviewed:** 16 September 2026
**Scope:** public Next.js application, correction API, maintenance API, PostgreSQL boundaries, CI, and deployment configuration

## Trust boundaries and controls

| Boundary | Main abuse case | Implemented control |
| --- | --- | --- |
| Search form → browser ranking | narrative/postcode leakage | browser-only state, POST pre-hydration fallback, no query-string state, URL regression test |
| Public correction → server/database | spam, oversized input, sensitive text, identifier tampering | 8KiB request cap, server allowlists and Unicode bound, honeypot, keyed 24-hour rate window, active-publication resolution on server |
| Maintenance caller → privileged operations | spoofed retention/alert run | independent bearer secret, constant-time comparison, generic 401, no browser credential |
| Publisher page → ingestion | SSRF, redirect, oversized/wrong response, poisoned facts | manifest host allowlist, public-address checks, redirect/content/size/time bounds, evidence, human review |
| Application → PostgreSQL | direct browser access, injection, connection exhaustion | server-only repositories, parameterized SQL, private schemas/roles, bounded serverless pool |
| GitHub workflow → repository | mutable action compromise, secret disclosure, dependency regression | immutable action SHAs, no persisted checkout credential, frozen lockfile, secret scan, production audit, dependency review |

## Browser and response hardening

- A fresh per-request nonce is applied through the Next.js proxy.
- Production script policy uses `'strict-dynamic'` and contains neither `'unsafe-inline'` nor `'unsafe-eval'`.
- CSP denies frames and objects, limits forms/base/connect/fonts/images to required origins, and upgrades insecure requests.
- HSTS, `nosniff`, frame denial, strict referrer policy, restrictive permissions policy, COOP, and CORP are tested in Chromium.
- React text rendering is used for correction and source content; no user-controlled HTML sink is present.

## Data and logs

- No account, email address, support application, or attachment is collected.
- Search narratives and postcodes are not intentionally stored or logged.
- Correction free text is private, is never copied into operational events, and has executable retention.
- Operational events use allowlisted columns rather than arbitrary payload JSON.
- Health and status outputs expose bounded state without stack traces, internal hosts, retry schedules, or report content.
- Production hosting log inspection remains a deployment smoke check because repository review cannot prove a provider’s runtime configuration.

## Supply chain

The workspace has one pnpm lockfile and pins pnpm 11.19.0. The added axe adapter is pinned to 4.13.0. The production dependency audit reported no known high/critical vulnerability on 16 September 2026. Dependabot is bounded and grouped; CI repeats audit and dependency review on change.

## Residual launch gates

- create a dedicated production database rather than reuse the unrelated Supabase project visible to this workstation;
- authenticate and connect the Vercel project;
- configure unique production secrets and verify they never appear in logs;
- enable GitHub private vulnerability reporting and required checks;
- verify managed backups and perform the approved non-production restore rehearsal; and
- complete the human screen-reader pass and name a fallback maintainer.

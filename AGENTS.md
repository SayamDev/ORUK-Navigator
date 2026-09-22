# Repository guidance

## Agent skills

For frontend design work, read the project-local
[`ultimate-frontend` skill](agent-skills/ultimate-frontend/SKILL.md). Its three
core dependencies, `design-taste-frontend`, `impeccable`, and `text-to-lottie`,
are agent tooling rather than application dependencies. They must be installed
in the contributor's agent environment; this repository does not bundle their
third-party files or add a Lottie runtime to the product. Follow the existing
`DESIGN.md` and the approved Tameside public-service design when a generic
skill default conflicts with the project brief. Use Lottie only when a specific
interaction needs it, with a reduced-motion alternative.

### Issue tracker

Issues and specifications are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the standard five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

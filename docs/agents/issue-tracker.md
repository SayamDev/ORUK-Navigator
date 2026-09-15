# Issue tracker: GitHub

Issues and specifications for this repository live in GitHub Issues. Use the `gh` CLI for all operations.

## Conventions

- Create an issue with `gh issue create --title "..." --body "..."`.
- Read an issue with `gh issue view <number> --comments` and include its labels.
- List issues with `gh issue list`, using state and label filters appropriate to the task.
- Add discussion with `gh issue comment <number> --body "..."`.
- Apply or remove labels with `gh issue edit`.
- Close completed work with `gh issue close <number> --comment "..."`.

Infer the repository from the configured Git remote when running inside this checkout.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Pull requests are not treated as incoming feature requests. This can be changed here later if the project adopts that workflow.

## Skill operations

When a skill says to publish to the issue tracker, create a GitHub issue. When it says to fetch a ticket, read the corresponding GitHub issue and its comments.

## Wayfinding operations

- The map is one issue labelled `wayfinder:map`, containing notes, decisions so far, and unresolved fog.
- Child decision tickets are linked as GitHub sub-issues where available and labelled `wayfinder:<type>` for `research`, `prototype`, `grilling`, or `task`.
- Use native GitHub issue dependencies for blocking relationships where available. Otherwise, record `Blocked by: #<number>` near the top of the child issue.
- An unblocked, unassigned open child is available to claim. Claim it by assigning it to the current developer.
- Resolve a decision by recording the answer, closing the child issue, and adding a concise pointer to the map's decisions-so-far section.

# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`

**Balance / sheet numbers:** [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc) — use `google-sheets` MCP; engine data via `scripts/build-structure-balance.mjs` and `scripts/build-research-data.mjs`.

**Session changelog:** **ChangeLog** tab in the balance workbook (`20260804 Corp Idle Working.xlsx`). Append via `scripts/append-changelog-*.mjs` (close Excel first if EBUSY).

**Resume prompt:**

```
Continue corp-civ-idle. Read docs/ui-principles.md and .cursor/rules/player-view-ui.mdc first.
Task: [specific tab or change]
```

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

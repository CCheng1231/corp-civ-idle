# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`

**Balance / sheet numbers:** [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc) — use `google-sheets` MCP; engine data via `scripts/build-structure-balance.mjs` and `scripts/build-research-data.mjs`.

**Session changelog:** **ChangeLog** tab in the balance workbook (`20260827 Corp Idle Working.xlsx`). Append via `scripts/append-changelog-*.mjs` (e.g. `append-changelog-aug31-secretary-job-board.mjs`; close Excel first if EBUSY).

**Resume prompt:**

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Task: [specific tab or change]
```

**Recent UI state (Aug 31, evening):** Secretary **task forces** — two-line rows (name + status), `TaskForceStatusIcon` (traveling / on-site), units/earnings in tooltip only. **Job board** (embedded): 2-column filters; compact posting drawer with −/+ / **Max** crew steppers, fit-content height, **Larger** toggles text scale; engage blocker → **Not enough units**. Queue times use `5m` / `30s` abbreviations.

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

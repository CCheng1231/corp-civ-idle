# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`

**Balance / sheet numbers:** [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc) — use `google-sheets` MCP; engine data via `scripts/build-structure-balance.mjs` and `scripts/build-research-data.mjs`.

**Session changelog:** **ChangeLog** tab in the balance workbook (`20260827 Corp Idle Working.xlsx`). Append via `scripts/append-changelog-*.mjs` (e.g. `append-changelog-aug31-tab-ui-home-hub.mjs`; close Excel first if EBUSY).

**Resume prompt:**

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Task: [specific tab or change]
```

**Recent UI state (Aug 31):** Bottom nav is **World · Home · Secretary · Log · Set**. **Home** flyout → Build / Recruit / R&D. Build, Recruit, Research, Secretary tabs share portrait + queue header pattern; catalog below portrait with category scene banners. Secretary: task forces under Office picker; Reports in below-portrait banner.

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

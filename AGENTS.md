# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`; art direction **v0.1** — [`docs/world-map-v0.1.md`](docs/world-map-v0.1.md)

**Balance / sheet numbers:** [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc) — use `google-sheets` MCP; engine data via `scripts/build-structure-balance.mjs` and `scripts/build-research-data.mjs`.

**Session changelog:** **ChangeLog** tab in the balance workbook (`20260905 Corp Idle Working.xlsx`). Append via `scripts/append-changelog-*.mjs` (e.g. `append-changelog-aug31-online-save-lease.mjs`; close Excel first if EBUSY).

**Online multiplayer:** Firestore `worlds/dev` — private saves, shared job board, map presence. Access via **access keys** (`src/multiplayer/onlineAccess.ts`) — playtester enters key once; browser binds via Anonymous Auth + `worlds/dev/bindings/{uid}`. Devs create keys in Settings or `scripts/create-access-key.mjs`. Read `useOnlineWorld.ts`, `worldSync.ts`, `browserLease.ts` before changing sync. **Firestore rules:** `firestore.rules` + [`docs/firestore-security.md`](docs/firestore-security.md). One browser tab per online account (lease on world meta).

**Resume prompt:**

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Online work: useOnlineWorld.ts, worldSync.ts, browserLease.ts — test single tab per account.
Task: [specific tab or change]
```

**Recent state (Sep 14, 2026 — world map session, paused):**

- **Z1 in-game base:** `world-map-z1-hybrid-soft-pass1-v5.png` + `src/assets/z1-layout-canonical.json`. Dev: drag bake, hex edit (non-locked sites), per-hex nudge, export JSON (`WorldMapDevToolbar`).
- **Hub lock:** Gov + six majors — dev **cannot move** them (`src/game/mapLayoutLock.ts`). Saved `mapDevLandmarkCoords` / hex nudges for hubs **still apply** (freeze-in-place; not reset to canon on load). Canon defaults in `z1-layout-canonical.json`.
- **Reverted (do not re-apply without Chris):** Rim terrain hexes, viewBox `MAP_VISUAL_HEX_RADIUS`, undercoat layer — moved layout; user asked full revert.
- **Z1 world extend (next):** Fill grey at **20% zoom + pan slack** with **visual-only** larger plate; v5 cornerstone unchanged. Spec: [`docs/z1-world-extend-gen-spec.md`](docs/z1-world-extend-gen-spec.md). Margin script: `npx tsx scripts/compute-z1-world-extend-margin.mjs` → **~2600 viewBox pad/side**, master **~8240×7890**. **Draft image** (not in repo): Cursor assets `world-map-z1-hybrid-soft-world-extend-draft.png` — composite v5 center + feather; then engine underlay in `WorldMapBaseArt` (not started).
- **Online / map (older):** Chris HQ `{-2,-4}`; HQ focus via `mapViewport.ts`; online saves / browser lease — see bullets in prior sessions.

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

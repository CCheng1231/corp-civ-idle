# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`

**Balance / sheet numbers:** [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc) — use `google-sheets` MCP; engine data via `scripts/build-structure-balance.mjs` and `scripts/build-research-data.mjs`.

**Session changelog:** **ChangeLog** tab in the balance workbook (`20260827 Corp Idle Working.xlsx`). Append via `scripts/append-changelog-*.mjs` (e.g. `append-changelog-aug31-online-save-lease.mjs`; close Excel first if EBUSY).

**Online multiplayer:** Firestore `worlds/dev` — private saves, shared job board, map presence. Read `src/hooks/useOnlineWorld.ts`, `src/multiplayer/worldSync.ts`, `src/multiplayer/browserLease.ts` before changing sync. One browser tab per online account (Firestore lease on world meta).

**Resume prompt:**

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Online work: useOnlineWorld.ts, worldSync.ts, browserLease.ts — test single tab per account.
Task: [specific tab or change]
```

**Recent state (Aug 31, late evening):**

- **Online saves:** Bootstrap gating, resetGeneration / onlineSaveSessionId, transactional saves, migration fixes (`structureQueues`, empty `branchSites`). Stale-tab overwrite protection via `playerResetAt` + session id on world meta.
- **Browser lease:** `playerBrowserLease` + `claimGeneration` — kicks duplicate tabs; reclaim vacant lease instead of false kick in dev (StrictMode).
- **Settings (online):** Reset Tim/Chris account, shared-world reset (job board only), full world reset, **Pull from Firestore**.
- **Map:** Chris HQ `{-2,-4}`; HQ/Home focus uses DOM-centered pan (`mapViewport.ts`).

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

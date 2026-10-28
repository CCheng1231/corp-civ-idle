# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`; art direction **v0.1** — [`docs/world-map-v0.1.md`](docs/world-map-v0.1.md)

**Balance numbers:** Committed in `src/game/structureBalanceData.ts`, `researchData.ts`, `jobHubData.ts` (code is source of truth). Optional reference sync: `node scripts/import-balance-from-workbook.mjs` (workbook: `Corp Idle Working.xlsx`). Metrics: `node scripts/balance-report.mjs` → `docs/balance-report.md`. See [`.cursor/rules/google-sheets-balance.mdc`](.cursor/rules/google-sheets-balance.mdc).

**Session changelog:** **ChangeLog** tab in [`Corp Idle Working.xlsx`](Corp%20Idle%20Working.xlsx). Append via `scripts/append-changelog-*.mjs` (close Excel first if EBUSY).

**Online multiplayer:** Firestore `worlds/dev` — private saves, shared job board, map presence. Access via **access keys** (`src/multiplayer/onlineAccess.ts`) — playtester enters key once; browser binds via Anonymous Auth + `worlds/dev/bindings/{uid}`. Devs create keys in Settings or `scripts/create-access-key.mjs`. Read `useOnlineWorld.ts`, `worldSync.ts`, `browserLease.ts` before changing sync. **Firestore rules:** `firestore.rules` + [`docs/firestore-security.md`](docs/firestore-security.md). One browser tab per online account (lease on world meta).

**Resume prompt:**

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Online work: useOnlineWorld.ts, worldSync.ts, browserLease.ts — test single tab per account.
Task: [specific tab or change]
```

**Recent state (Oct 27, 2026 — major hub + Gov capitol on map):**

- **Major hubs (player map):** `MapMajorHubSupertallMarker.tsx` — supertall SVG **inside the map SVG** on all six Z1 coords; white `hex-tile-major-hub` hidden on player view at hub hexes.
- **Gov (player map):** `MapGovCapitolMarker.tsx` — baked capitol PNG at `MAP_GOV`; amber gov fill hidden under art; `hex-tile-gov-site` ring. Asset: `src/assets/map/gov-capitol-isometric-bake.png` (`scripts/key-gov-capitol-bake.mjs`). Reference: `gov-landmark-isometric-demos.html`.

**Prior (Oct 9 — player map 3D towers):**

- **Player HQ 3D:** `MapPlayerHqTower3D.tsx` — solarpunk **canopy A** (glass core + garden pods); `variant` mine (green) / peer (blue); overlay in `map-hq-towers-layer-untilted` (counter-tilt vs map tilt); hex HQ/branch fill hidden on player view at authored HQ coords.
- **Office towers 3D:** `MapOfficeTower3D.tsx` — per-tower styles from `hq-tower-solarpunk-demos.html` (`officeTowerVisualStyle` / `OFFICE_TOWER_VISUAL_STYLE` in `mapWorld.ts`); coords via `officeTowerMapSites(settings)`; same overlay layer; `hex-tile-tower` hidden on player view at tower hexes.
- **Sizing / tilt:** `mapHqTowerDimensionsFromHexScreenPx`, `mapHqTowerPresentationTiltDeg` in `mapViewport.ts`.
- **Dev map:** schematic hex colors + `MapPlayerHq3DMarker` SVG; no HTML office/HQ extrusion overlay.

**Prior (Oct 7 — Z1 frame + Z2 + plate v2):** Z1 base v5 + `z1-layout-canonical.json`; Z1 plate viewBox + haze; Z1→Z2 crossfade 100–120%; world-plate AI rim v2; hub lock in `mapLayoutLock.ts`. See `docs/z1-world-extend-gen-spec.md`.

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

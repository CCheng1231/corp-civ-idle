# Agent handoff (corp-civ-idle)

When working on **player-facing UI** or continuing a prior UI session, read first:

1. [`docs/ui-principles.md`](docs/ui-principles.md) — design rules, file map, resume checklist, recent state
2. [`.cursor/rules/player-view-ui.mdc`](.cursor/rules/player-view-ui.mdc) — auto-applied on `src/components/**` and `src/App.css`
3. [`.cursor/rules/cross-platform-layout.mdc`](.cursor/rules/cross-platform-layout.mdc) — Android / iOS / PC scaling, safe areas, 48px touch targets
4. **World map layout / zoom** — [`.cursor/rules/world-map-viewport.mdc`](.cursor/rules/world-map-viewport.mdc) when editing `WorldView`, `mapWorld`, or `mapViewport`; art direction **v0.1** — [`docs/world-map-v0.1.md`](docs/world-map-v0.1.md)
5. **Unit portrait art bank & skins** — [`docs/unit-art-bank.md`](docs/unit-art-bank.md) for banked higher-tier/Intel/Support contractor portraits (`src/game/unitPortraitAssets.ts`, switchable in **Secretary → Roaster → Unit skins**).

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

**World map landmark art (player view):** Mixed art — **baked PNG** (unique/heroes) + **inline SVG** (simple repeats); HQ/office **CSS 3D** stays overlay. Registry `mapLandmarkArtRegistry.ts`, sites `mapLandmarkInstances.ts`, policy `mapLandmarkPolicy.ts`.

**World landmark policy (Chris, Oct 2026):**
- **Canon world-building** — Gov, hubs, multi-hex structures: fixed map geography for **everyone** (layout/canonical JSON + providers), not per-player save.
- **Same canon art** — Gov/hubs/uniques: one shared asset set for the world (not per-save builds).
- **Per-player show/hide** — `settings.mapShowWorldLandmarkArt` in **private save only** (Tim off ≠ Chris off; online = follows that account's devices). **Filter** below HQ. When off, hide landmark art + site rings on that client.
- **Future cosmetics** — world landmarks stay shared; player skins (e.g. own HQ/office) affect **only that player's view** of their assets, not what others see on the map.
- **Agent habit:** if unsure canon vs player-owned or shared vs private visibility, **ask Chris** before wiring coords to `GameState`.

**Recent state (Oct 30, 2026 — Build + Research category art):**

- **Build tab:** Pass 2 wired — Essentials v4, Departments v4, Power & research v4, Recruitment structures v1 (`structure*Art.ts`, `OfficeStructurePanel`). Review: `docs/structure-category-review/`.
- **Research tab:** Pass 2 wired — Resources v2, Payouts v4, Discover v1, Operations v1 (`research*Art.ts`, `ResearchView`). Review: `docs/research-category-review/`.
- **Category banners:** Structure / Recruit / Research summary strips **9.5×2.82rem** (`06-job-board.css`).
- **Next (Chris):** Recruit tab images — contractor/unit card art pass (structure recruitment category already wired; role roster cards TBD).

**Recent state (Oct 28, 2026 — map filter + landmark pipeline):**

- **Multi-hex (dormant):** enable sites in `mapLandmarkCanonSites.ts` (`canonMultiHexLandmarkProviders`); helpers `landmarkArtInstanceMultiHex`, `playerLandmarkArtInstanceAtCoord`.
- **Top-right Filter:** world landmarks only (`MapWorldLandmarkFilterControl.tsx`). Z1 overlay code remains (`WorldMapZ1ProceduralOverlay`, `mapZ1LayerFilters` in settings) for later — no player UI yet.
- **Gov bake:** lazy chunk `mapLandmarkBakedAssets.ts`; regen via `node scripts/key-gov-capitol-bake.mjs` (`--master` PNG when ready).
- **Inspect:** hex drawer shows landmark site id / footprint when landmark art is on.

**Recent state (Oct 28, 2026 — map landmark art registry):**

- **Gov + major hubs** drawn through `MapLandmarkArtLayer` (not one-off markers in `WorldView`).

**Recent state (Oct 27, 2026 — major hub + Gov capitol on map):**

- **Major hubs + Gov:** site providers in `mapLandmarkInstances.ts`; art via `MapLandmarkArtLayer` (`major-hub-supertall` vector, `gov-capitol` baked `@2x`).

**Prior (Oct 9 — player map 3D towers):**

- **Player HQ 3D:** `MapPlayerHqTower3D.tsx` — solarpunk **canopy A** (glass core + garden pods); `variant` mine (green) / peer (blue); overlay in `map-hq-towers-layer-untilted` (counter-tilt vs map tilt); hex HQ/branch fill hidden on player view at authored HQ coords.
- **Office towers 3D:** `MapOfficeTower3D.tsx` — per-tower styles from `hq-tower-solarpunk-demos.html` (`officeTowerVisualStyle` / `OFFICE_TOWER_VISUAL_STYLE` in `mapWorld.ts`); coords via `officeTowerMapSites(settings)`; same overlay layer; `hex-tile-tower` hidden on player view at tower hexes.
- **Sizing / tilt:** `mapHqTowerDimensionsFromHexScreenPx`, `mapHqTowerPresentationTiltDeg` in `mapViewport.ts`.
- **Dev map:** schematic hex colors + `MapPlayerHq3DMarker` SVG; no HTML office/HQ extrusion overlay.

**Prior (Oct 7 — Z1 frame + Z2 + plate v2):** Z1 base v5 + `z1-layout-canonical.json`; Z1 plate viewBox + haze; Z1→Z2 crossfade 100–120%; world-plate AI rim v2; hub lock in `mapLayoutLock.ts`. See `docs/z1-world-extend-gen-spec.md`.

Before large UI reads, check `git status` / `git diff` — this repo often has in-progress work on `main`.

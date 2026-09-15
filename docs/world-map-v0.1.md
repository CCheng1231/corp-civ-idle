# World map art — version 0.1

**Status:** **Z1** = **pass-1 v5 bake** + locked `z1-layout-canonical.json` (`rasterAlign`, `majorHubHexes`, `majorHubMarkers`). Gov `0,0` fixed; six majors + gameplay landmarks on hex ring per v5 art. **Z2–Z4** = hybrid-soft rasters.

**Canon name:** World map **v0.1** — **hybrid soft** (earth terrain + muted soft-futurist accents, low density).

---

## Where v0.1 lives

| Artifact | Location |
|----------|----------|
| Image prompts + notes | Excel tab **`world map`** in `20260905 Corp Idle Working.xlsx` |
| Reference PNGs (Z1–Z4) | `src/assets/reference/zoom-levels/world-map-z{1-4}-hybrid-soft.png` |
| Folder index | `src/assets/reference/README.md` |
| Re-apply Excel tab from repo | `node scripts/patch-world-map-sheet.mjs` |
| Engine landmarks & regions | `src/game/mapWorld.ts`, `src/game/hexLayout.ts` |
| Presentation pixels | `worldMapAxialToPixel` in `mapWorld.ts` |
| Viewport / zoom / Home | `src/game/mapViewport.ts`, `world-map-viewport.mdc` |
| Current runtime art | `WorldMapBaseArt.tsx` — Z1 layers + Z2–Z4 rasters (`worldMapV01.ts`) |
| Layout / Z1 generator | `worldMapLayout.ts`, `worldMapZ1Layers.ts` |

---

## v0.1 style (generation brief)

**Keep:** Natural greens, tan scrub, soft blue water; large open gaps between built areas; illustrated game-map readability; muted **teal** (corporate) and **warm amber** (settlement) glow — not sharp neon; calm overcast, low saturation.

**Avoid:** Grim noir cyberpunk; photoreal satellite / Google Maps density; one continuous megacity at strategic zoom; black dead void outside the play region.

**Shared prompt block** (prepend to every Z-level image prompt): see Excel **`world map`** tab, row *Shared style block*.

---

## Game geography (must match implementation)

Hex patch: **`MAP_RADIUS = 9`** around Gov; forest greenbelt ring **`MAP_GREENBELT_HEX_RADIUS = 7`** (Z1 bake). Pointy-top hexes, **`HEX_RADIUS = 42`** px (logic); on-screen layout uses **`worldMapAxialToPixel`** (radial stretch from Gov — do not use raw `axialToPixel` for art placement).

### Fixed landmarks (axial `q,r`)

| Site | Coord | Notes |
|------|-------|--------|
| Gov | `0, 0` | Center |
| Central Exchange Tower | `0, -4` | metropolis |
| Parkview Office Tower | `2, 5` | suburban |
| Crossroads Business Tower | `-7, 2` | rural |
| Hillside Corporate Tower | `7, -6` | countryside |
| Tim default HQ | `-6, 5` | `MAP_HQ` |
| Chris HQ (online) | `4, -1` | `CHRIS_HQ` in `playerHq.ts` |
| Commercial: suburban strip | `5, 2` | |
| Commercial: rural highway | `-1, -6` | |
| Commercial: countryside lot | `-5, 7` | |
| Major hubs (×6) | see `majorHubHexes` in `z1-layout-canonical.json` | fiction majors — `worldMapMajorHubs.ts` |

### Six major hubs (Z1 fiction ring — not the four towers)

**Paint** in pass-1 v5 bake: six teal majors (only **12h** in greenbelt; five outers beyond trees; **no 3h**). **Engine** pins (next): canon marker pixels in `z1-layout-canonical.json` → nearest hex (`worldMapMajorHubs.ts`). Z1 player default: **v5 bake** + landmark pins; procedural hub overlays off.

Pass-1 generations: v3 (archive / road bar) → v4 → **v5 (in-game)**. Redlines: `world-map-z1-v5-hub-redline.jpg`, `world-map-z1-v5-hub-redline-v3-arrows.jpg`. Pin layout after sync: `world-map-z1-pass1-v5-pin-layout.png`.

### Region bands (game logic)

Distance rings from Gov (+ edge jitter): **metropolis → suburban → rural → countryside** (`regionAtCoord` in `mapWorld.ts`). HQ region pinned **countryside** (`HQ_REGION`). Site rate bonuses: `REGION_SITE_RATE_BONUS`.

### Geography flavor (current procedural baseline)

**Flavor (design intent):** lakes/river/water optional in Z1 bake (no required east bay). Major **highway-style** roads in the paint (curves + straights, through greenbelt). Landmark **hex coords** authoritative after pass-2 alignment.

---

## Zoom ladder (v0.1 references — not engine yet)

| Zoom | Reference file | Intent |
|------|----------------|--------|
| Z1 | `world-map-z1-hybrid-soft.png` | Strategic — hub glows, greenbelt, open terrain, no blocks |
| Z2 | `world-map-z2-hybrid-soft.png` | Regional — separated clusters, river/bay, light futurist core |
| Z3 | `world-map-z3-hybrid-soft.png` | City — block massing, canals/parks between clusters |
| Z4 | `world-map-z4-hybrid-soft.png` | Wide neighborhood — most detail, still not street-level |

**Engine note:** v0.1 does **not** require four baked layers on day one; references define the target look per band. Implementation may ship **one** playable zoom first (see scope below).

### Planned Z1 UX (not in v0.1 code)

World theme; minimal icons; **active office only** by default; filters for trading hubs + six main sites (Gov, 4 towers, HQ). Defer UI until base art lands.

---

## Checklist — include in every future image generation

1. **Version:** World map v0.1, hybrid soft.
2. **Paste** shared style block (Excel tab).
3. **Zoom level** (Z1–Z4) and altitude / detail sentence from Excel tab.
4. **Density:** explicitly “low density / generous negative space.”
5. **Hub count & roles:** up to **6 main sites** + optional **small beginner pockets** (yellow/green, many tiny, not large zones).
6. **Layout:** separated pockets at Z1–Z2, not one blob (Sep 9 spec).
7. **Outside margin:** living haze/pastoral, not flat black.
8. **Constraints:** no text, labels, icons, UI, people, cars.
9. **Optional:** “align hub positions to hex landmark table above” when generating layout guides (refs today are **not** georeferenced to the hex grid).
10. **Tilt by zoom band:** Z1 mild 3/4 (not flat orthographic); each step Z2→Z3→Z4 **more** oblique; Z4 clearly angled neighborhood view (hybrid-soft Z4 regen should increase tilt).

---

## Implementation scope options (pick before coding)

| Scope | What ships | Needs from Chris |
|-------|------------|------------------|
| **A — Palette pass** | Restyle `worldMapArt.ts` (colors, softer roads/water, teal/amber accents) at **current single zoom** | Confirm keep existing river/bay/road topology |
| **B — Base layer + refs** | Dev toggle or replace `WorldMapBaseArt` with aligned raster/vector underlay | Anchor image to `worldMapHexBounds` or approve procedural-only v0.1 |
| **C — Full Z1–Z4** | Zoom-dependent art + viewport thresholds | Z thresholds, asset pipeline, Z1 filter UX |

---

## Decisions (Chris)

| # | Question | Answer |
|---|----------|--------|
| 1 | First implementation scope | **A** — palette pass on procedural `worldMapArt.ts` (single zoom) |
| 2 | Geography / layout | **Gov** = single **large central hub** inside the dense interior. **Six smaller hubs** sit **outside** the **greenbelt ring** (outer / “higher zone” feel). Inner side of belt = slightly **higher density**. Map may need **larger hex extent** later (`MAP_RADIUS` 7 today). Outer six (engine today): **4 office towers** + **2 HQ coords** (Tim `2,-7`, Chris `-2,-4`); commercial lots / future pads may add outers later. |
| 3 | Camera / tilt | **Never fully flat.** Tilt **increases as player zooms in** (Z1 → Z4 ladder). Ref feedback on hybrid-soft set: **Z1 OK**; **Z2 + a bit more** tilt; **Z3 + more**; **Z4 too flat today — needs more angle** than current ref. |
| 4 | Futurist accents | **Target = hybrid-soft reference PNGs only** (not current in-game cream map). Muted **teal / amber at hubs**; earth + open ground between; no full-map neon. Optional later: slightly stronger accents as `zoomRel` increases. |
| 5 | Mood / tone | **Soft solarpunk** — Chris label; aligns with hybrid-soft refs (green-forward, hopeful future, muted not neon). Refs remain color bible. |
| 6 | Water / hydrography | **Keep** east **bay + meandering river** (organic, on-vibe). **Fill “dead” map areas** in base art with lakes, forest, **residential** massing, light **industry** — world texture, not all commercial; no new gameplay required for v0.1. |

### Q2 — art layout (procedural v0.1)

```
        [ denser built-up — Gov as dominant center ]
    ═══════════════ greenbelt ring (visual border) ═══════════════
        [ six smaller outer hubs — towers + HQ sites ]
```

Scope A: SVG washes + hub scale (Gov larger glow/mass). Coord / radius expansion = follow-up.

## Open decisions (remaining)

1. ~~**Ship scope:**~~ **A** (see table above).
2. ~~**Z1 layout:**~~ Gov inside; six outers outside greenbelt (see table above).
3. ~~**Camera:**~~ Zoom-linked tilt ladder (see decisions table). Scope A: approximate via base-layer perspective/skew tied to `zoomRel` until baked Z layers (B/C).
4. ~~**Futurist strength:**~~ Hub-only muted teal/amber per hybrid-soft v0.1 (see decisions table).
5. ~~**Mood:**~~ Match hybrid-soft refs (see decisions table).
6. ~~**Water:**~~ Keep bay + river; enrich dead zones with residential/industry/green (see decisions table).
7. ~~**Raster vs procedural:**~~ **A** locked — procedural SVG for v0.1 implementation.
8. **Map chrome / filters** — **Deferred to v0.2** (see below).

---

## Aligned map generation (next — Z1 first)

**Principles (Chris, Sep 14):**

| Topic | Decision |
|--------|----------|
| Placement | **Hubs must read sensibly on the map.** Generation uses **current engine hub definitions** (`MAP_GOV`, `OFFICE_TOWERS`, HQ coords, lots, etc.) as **constraints/guidelines**, not painted-first then move hexes. |
| Map growth | When coords or `MAP_RADIUS` change, **art regenerates from data** — no hardcoded hub pixels only in a one-off PNG. |
| Zoom order | **Z1 first**, then Z2 → Z3 → Z4 (“move downward” / more detail as player zooms in). |
| Greenbelt | **No fixed design for today** — expose **tunable parameters** in code (center, radii, stroke) for later. |
| Mini / beginner hubs | **Not designed** — **placeholders** in layout data until spec exists. |
| Asset pipeline (#5) | **Pass-1 bake** from Excel **`world map`** Z1 prompt (`patch-world-map-sheet.mjs`); **pass-2** layout guide; aligned raster under pins. Procedural SVG = interim only. Hub/road SVG overlays = **filter-driven** (default off). |

**Chris (Sep 14) — alignment follow-ups:**

| Topic | Decision |
|--------|----------|
| HQ | **Testing placeholder** — coords/behavior can change; layout generator must read **HQ from engine data**, not fixed art. |
| Commercial (and pins generally) | **Pins on for now**; later **filter toggles** to show/hide categories (v0.2 UX — pins become filter-driven). |
| Z1 visuals | **Multiple images / layers** at Z1 (see below) — not one monolithic PNG as the only approach. |

**`MAP_RADIUS`:** still default **align on r=7 first** unless Chris says expand first.

### Z1 visuals — architecture (Chris, Sep 14)

| Model | Status |
|--------|--------|
| **A. Layer stack** | **Now** — Z1 = aligned layers in one frame (base terrain, water, greenbelt, hub washes, roads, etc.); same `viewBox`; hub positions from **`mapWorld` / `hexLayout`**. |
| **C. Filter overlays** | **Now (design)** — calm base + optional layers / pin groups toggled by filters (**v0.2 UX**); tag layer & pin categories in code early. |
| **B. Tile mosaic** | **Later** — when **`MAP_RADIUS` / map expands**; each tile can use the same **A** generator per chunk. Planned, not v0.1. |

**Engine direction:** layout metadata per layer (anchor hex, z-index, `filterGroup` id); when hubs move, **regenerate or recomposite** from data — no single baked PNG as source of truth.

**Implementation order:** aligned **Z1 layer stack (A)** on current r=7 patch → **filter-driven visibility (C)** with pins → **tiles (B)** when world grows.

**Implementation sketch (not built yet):** `worldMapLayout.ts` (or JSON) — greenbelt params, placeholder mini hubs, river/bay splines; `buildWorldMapZ1Layers(bounds, layout, landmarks)`; dev overlay toggles landmark dots vs art.

---

## v0.2 UX (planned — not in scope for v0.1 art pass)

Player’s view today: illustrated base + **landmark pins** + pan/zoom/HQ + **legend highlight** (not filters) + **hex drawer** for economy sites; terrain hexes are low-value taps.

**v0.2 direction (stub):**

- Redesign map chrome after v0.1 ground art ships — do not bolt on old “Z1 six-site filter” spec as-is.
- Consider: **layer toggles** (economic sites vs flavor-only geography), **zoom-aware icon density** (fewer labels/pins when zoomed out), **strategic vs local** read without separate Z1–Z4 assets yet.
- Keep **drawer** for actionable hexes; reduce noise on pure terrain or show flavor-only tooltip.
- Revisit **legend** (filter vs teach), **Distance from**, and whether **commercial lots** need pin parity with towers when map reads as a “world.”

---

## Changelog

| Date | Note |
|------|------|
| 2026-09-14 | Named v0.1 hybrid soft; prompts in Excel `world map` tab; Z1–Z4 reference PNGs |
| 2026-09-14 | Scope A art pass: `worldMapArt.ts`, `WorldMapBaseArt.tsx`, player CSS, zoom tilt |
| 2026-09-14 | Z1: pass-1 bake brief, fictional six majors, highways in paint, default filter none, Z1 tilt toward ref |
| 2026-09-15 | Z1 pass-1 **v5 bake locked** (6 teal + Gov, 12h in belt, no 3h, arrow moves); prompts synced via `patch-world-map-sheet.mjs` |

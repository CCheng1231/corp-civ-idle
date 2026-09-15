# World map reference images

**Active art direction:** **World map v0.1 (hybrid soft)** — full spec, landmarks, and generation checklist: [`docs/world-map-v0.1.md`](../../docs/world-map-v0.1.md). Prompts also on Excel tab **`world map`**.

Design references for illustrated map art and multi-zoom foundation layers.

## Zoom levels (Z1–Z4)

Folder: `zoom-levels/` — foundation pieces for zoom-dependent map art (not simple photo scale).

| File | Zoom | Style | Intent |
|------|------|-------|--------|
| `world-map-z1-*.png` | Z1 | cyberpunk / satellite | Strategic overview — zone colors only, no building detail |
| `world-map-z2-*.png` | Z2 | cyberpunk / satellite | Regional — districts, arterials, major geography |
| `world-map-z3-*.png` | Z3 | cyberpunk / satellite | City — block massing, landmarks as shapes |
| `world-map-z4-*.png` | Z4 | cyberpunk / satellite | Most detail — wide neighborhood view (not street-level) |

### Hybrid soft (Sep 14) — earth + futurist, low density

Muted natural terrain + gentle teal/amber glow (not sharp neon); airy layout, illustrated game map (not Google satellite).

| File | Zoom |
|------|------|
| `world-map-z1-hybrid-soft.png` | Z1 (original ref) |
| `world-map-z1-hybrid-soft-pass1.png` | Z1 pass-1 bake v1 |
| `world-map-z1-hybrid-soft-pass1-v2.png` | Z1 pass-1 bake v2 |
| `world-map-z1-hybrid-soft-pass1-v3.png` | Z1 pass-1 bake v3 (archive) |
| `world-map-z1-v5-hub-redline.jpg` | Hub markup v2 — delete 3h, six teal |
| `world-map-z1-v5-hub-redline-v3-arrows.jpg` | Hub markup v3 — NE / NW / SW arrow moves (locked with v5 bake) |
| `world-map-z1-hybrid-soft-pass1-v4.png` | Z1 pass-1 bake v4 |
| `world-map-z1-pass1-v5-pin-layout.png` | v5 pins **numbered** (for you); regen `npx tsx scripts/render-z1-v5-pin-layout.mjs` |
| `world-map-z1-pass1-v5-pin-layout-bake-guide.png` | v5 **bake constraint** — dots only, no text (use for image gen, not numbered layout) |
| `world-map-z1-hybrid-soft-pass1-v5.png` | Z1 pass-1 v5 — **in-game Z1 base** (layout locked; align canon + pins next) |
| `world-map-z1-hybrid-soft-world-extend-draft.png` | Z1 **world plate draft** (copy from gen output; see `docs/z1-world-extend-gen-spec.md`) |
| `world-map-z1-hybrid-soft-pass2-guide.png` | Z1 pass-2 align guide (dev overlay) |
| `world-map-z2-hybrid-soft.png` | Z2 |
| `world-map-z3-hybrid-soft.png` | Z3 |
| `world-map-z4-hybrid-soft.png` | Z4 |

**Z1 UX (planned):** world theme, minimal icons; active office only by default; sidebar filters for trading hubs / six main sites (Gov + 4 towers + HQ).

**Engine note:** each zoom level may need separate art or procedural rules — not a single image scaled.

### Z1 design notes (Chris, Sep 9)

| Source | Keep | Avoid |
|--------|------|-------|
| Option B | Greenbelt at edge; cyan/pink hub mix | Too much detail; one connected megacity |
| Option A | Clean hub separation | Space-map void; not grounded |
| Hybrid A | Slight angle; visible roads | Too close — use for Z1.5/Z2 |
| B outside | Z1 zoom level in center glow | Outside too dead/black |

**Target Z1:** separated hub pockets + grounded terrain + greenbelt + small yellow/green beginner pockets + living (not dead) outside margin. Slight angle optional at Z1.5+.

New refs: `world-map-z1-cyberpunk-v2-synthesis.png`, `world-map-z1-5-cyberpunk-hubs-roads.png`, `world-map-z1-cyberpunk-v2-outside-terrain.png` (mood only — horizon, not map tile).

## Style samples (Sep 9)

- `world-map-ref-cyberpunk-city.png` — dense neon top-down (was too close even for Z4; good palette)
- `world-map-ref-satellite-city.png` — photoreal satellite modern city

## Earlier style targets (optional)

- `world-map-ref-coastal-city.jpg` — bay, bridges, waterfront
- `world-map-ref-radial-grid.jpg` — civic rings + mixed grids
- `world-map-ref-organic-roads.jpg` — curved arterials
- `world-map-ref-river-meander.png` — meandering channel
- `world-map-ref-photo-base.jpg` — overall tone / density

Runtime map (today): Z1 hub-aligned layers (`worldMapLayout.ts`, `worldMapZ1Layers.ts`); Z2–Z4 rasters (`worldMapV01.ts`).

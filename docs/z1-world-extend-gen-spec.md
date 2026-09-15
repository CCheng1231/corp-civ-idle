# Z1 world extend — generation spec (visual only)

**Goal:** At **20% zoom** and **max pan overscroll**, no grey viewport — only continued map art. **Do not move** hex grid, `rasterAlign`, hubs, or `world-map-z1-hybrid-soft-pass1-v5.png` alignment in the engine until Chris approves a composite.

**Scope:** Z1 strategic band only. **Content:** terrain continuation (forest, hills, lakes, soft haze) — **no new hubs, roads, or settlements** in the extension (v0.1 checklist item 7: living margin, not black void).

---

## Viewport math (engine constants)

| Constant | Value |
|----------|--------|
| `MAP_ZOOM_REL_MIN` | 0.2 (20%) |
| `MAP_FIT_BLEED` | 2.65 |
| `MAP_PAN_OVERSCROLL_RATIO` | 0.2 |
| Current `worldMapHexBounds` (r=9 + pad) | ≈ **3039 × 2688** viewBox units |

**Worst case** (desktop 800×600, min zoom, max pan): visible rect extends **~2494 viewBox units** beyond current bounds on one side.

**Recommended pad per side (viewBox px):** **2600** (rounded + safety margin).

| | Current | Extended master |
|--|---------|-----------------|
| minX / minY | ≈ −1519 / −1344 | ≈ **−4119 / −3944** |
| width × height | ≈ 3039 × 2688 | ≈ **8239 × 7888** |
| Scale vs current | 1× | **~2.71 × W**, **~2.93 × H** |

Gov center stays at viewBox **(0, 0)** in presentation space (unchanged).

---

## Canvas spec (master plate)

### ViewBox-aligned master (for engine later)

- **Extended viewBox:** `8239 × 7888` (use integers: **8240 × 7890**).
- **Cornerstone (frozen) region:** current bounds rectangle, **centered** in the master:
  - Offset from extended top-left: **(+2600, +2600)** in viewBox units.
  - Size: **3039 × 2688** — paste **pixels from v5** here in post; do not re-paint.
- **Paint zone:** everything outside that inner rect (≈ **76%** of master area by pixel count).

### Raster export sizes

| Tier | Master px | Inner v5 placement | Notes |
|------|-----------|----------------------|--------|
| **Draft** | 2048 × 1960 | 753 × 667 @ (512, 512) | Quick comp check |
| **Production** | 4096 × 3920 | 1506 × 1334 @ (1025, 1025) | Good for iteration |
| **Ship** | 8240 × 7890 | 3039 × 2688 @ (2050, 2050) | 1:1 viewBox units |

Inner placement formula (master `W×H`, current bounds `w×h`, pad `p=2600`):

- `innerX = p`, `innerY = p`, `innerW = w`, `innerH = h` (when master = extended viewBox size).

### Seamless blend

- **Target:** 8–12% soft blend at the inner rect edge (feather mask), not a hard cut.
- **Post (recommended):** Outpaint in PS / GIMP with v5 on top locked; or composite: `master = generated_rim under + v5 over center` with gradient mask on the rim layer.

---

## Image generation prompt (copy-paste)

**Version:** World map **v0.1 hybrid soft**. **Zoom:** Z1 strategic, mild 3/4 oblique (match reference center).

**Shared style (prepend):** Illustrated strategy game map; muted natural greens and tan scrub; soft blue water; low density; generous negative space; calm overcast; muted teal glow only at existing hubs in the **center reference**; soft solarpunk, hopeful, not neon cyberpunk; not photoreal satellite; no text, labels, icons, UI, people, or vehicles.

**Task:** Extend the attached **center reference image** outward as if continuing to paint the same world. The **center third** must remain **pixel-identical** to the reference (do not redraw hubs, roads, greenbelt, or interior). Only generate **new terrain** in the outer margin: rolling forest, hills, distant lakes, light atmospheric haze toward the horizon, pastoral living margin — **no new buildings, hubs, highways, or settlements** in the extension. Match color grading, brush texture, and lighting to the reference edge. Seamless transition at the boundary; no visible frame or vignette. Square composition, center-weighted.

**Negative:** black void, flat grey, sci-fi megacity, sharp neon, text, map labels, grid overlay, new glowing hubs, new roads, duplicate of center features, hard rectangular border, oversaturated.

---

## Engine hook (after art approval — not in this pass)

- New asset e.g. `world-map-z1-hybrid-soft-world-plate.png` aligned so **Gov** and **current v5** register with existing `bounds`.
- Render **under** current Z1 bake (or replace bake with single composite once approved).
- No change to `MAP_RADIUS`, hub hexes, or `mapDev*` layout.

---

## Recompute margins

```bash
npx tsx scripts/compute-z1-world-extend-margin.mjs
```

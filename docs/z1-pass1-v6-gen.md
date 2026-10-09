# Z1 pass-1 v6 — engine-aligned bake (draft)

**Status:** experimental draft (`world-map-z1-hybrid-soft-pass1-v6-draft.png`). v5 remains ship default.

## Intent

- **Higher-res** Z1 strategic art (~4:3 generation, PNG in repo).
- **Hub meaning** tied to live engine: Gov `(0,0)` + six majors from `majorHubHexes` in `z1-layout-canonical.json`.
- **Theme:** world map v0.1 hybrid soft (same brief as `patch-world-map-sheet.mjs` Z1 prompt).

## Pipeline

1. **Constraint guide (4096px wide)** — hub dots in presentation viewBox space:

   ```bash
   npx tsx scripts/render-z1-v6-engine-bake-guide.mjs
   ```

   Outputs:

   - `src/assets/reference/zoom-levels/world-map-z1-pass1-v6-engine-bake-guide.png` (dots only — image-gen ref)
   - `world-map-z1-pass1-v6-engine-pin-layout.png` (numbered, for IDE)
   - `world-map-z1-pass1-v6-engine-layout.json` (normalized hub positions)

2. **Image generation** — use v5 bake as **style** ref + v6 bake-guide as **layout** ref. Prompt must include: Gov amber center, six teal majors at normalized coords from layout JSON, greenbelt, hybrid-soft roads, no text/UI.

3. **In-game try** — dev map toolbar → **Z1 bake → v6 draft (engine)**. Default v6 `rasterAlignV6Draft` in `z1-layout-canonical.json` (scale ~1.81, greenbelt fit). Re-fit: `npx tsx scripts/fit-z1-v6-raster-align.mjs`. Tuning saves to `mapZ1RasterAlignV6` (separate from v5).

## Regenerate art

Copy updated PNG to:

`src/assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass1-v6-draft.png`

When v6 is approved, bake `rasterAlign` + optional `majorHubMarkers` into `z1-layout-canonical.json` and switch default import in `WorldMapBaseArt.tsx` from v5 → v6.

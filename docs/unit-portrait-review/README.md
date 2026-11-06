# Unit portrait review (Recruit roster cards)

Contractor roster art for **Recruit → hire cards** (`RecruitmentView.tsx`). Category **scene banners** use `Recruit_*.png/jpg/webp` in `src/assets/` (not this folder).

## Flow (mirror Build / Research Pass 2)

1. **Generate / key** — `node scripts/process-unit-portrait-demos.mjs` (flags: `--defense-only`, `--intel-only`, `--support-only`, `--special-only`). Outputs PNG + JPG to:
   - `src/assets/reference/unit-portraits/`
   - `docs/unit-portrait-review/images/`
2. **Review** — open HTML previews (live card sandbox + galleries):
   - [`index.html`](./index.html) — Farming (Pass 2)
   - [`defense.html`](./defense.html) · [`intel.html`](./intel.html) · [`support.html`](./support.html) · [`special.html`](./special.html)
3. **Pick defaults** — update `DEFAULT_UNIT_PORTRAIT_SKIN_ID` + `UNIT_PORTRAIT_SKINS` in [`src/game/unitPortraitAssets.ts`](../../src/game/unitPortraitAssets.ts).
4. **Tune card strip** — per-unit height/scale in [`src/game/unitPortraitCardFraming.ts`](../../src/game/unitPortraitCardFraming.ts) (sync [`unit-wire-defaults.js`](./unit-wire-defaults.js)).
5. **Doc bank** — [`docs/unit-art-bank.md`](../unit-art-bank.md) for saved higher-tier designs.

## In-game wiring

| Piece | Location |
|-------|----------|
| Skin bank + imports | `src/game/unitPortraitAssets.ts` |
| Card strip framing | `src/game/unitPortraitCardFraming.ts` |
| Category header crops | `src/game/recruitContractorCategoryArt.ts` · `recruit-contractor-wire-defaults.js` |
| Card UI | `UnitCardPortrait.tsx` → `RecruitmentView.tsx` |
| Strip CSS | `src/styles/06-job-board.css` (`--progression-compact-portrait-*`) |

**All 17 roster roles** have Pass 1/2 skins wired (Oct 29–30, 2026). Player override: **Secretary → Roster → Unit skins**.

## Scope note

This pass covers **roster hire cards only**. Build tab **Recruitment structures** (desk, MIT room) live under `docs/structure-category-review/recruitment-pass2.html` → `structureRecruitmentArt.ts`.

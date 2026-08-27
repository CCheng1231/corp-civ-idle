# Player UI principles & handoff (corp-civ-idle)

Gameplay may be deep; **UI must stay scannable**. This doc captures design decisions and where to look when continuing UI work in a **new chat**.

## New chat — read this first

When picking up UI work, read in this order (narrow scope; avoid full-repo scans):

1. **This file** — philosophy, file map, recent state.
2. **`.cursor/rules/player-view-ui.mdc`** — always-applied rules for `src/components/**` and `src/App.css`.
3. **Shared UI** — `src/components/progressionUi.tsx`, `src/components/upgradePreviewFormat.ts` (`formatCompactBonus`).
4. **The tab you are editing** — one view + its CSS blocks in `src/App.css`:
   - Research → `ResearchView.tsx`
   - Structures → `OfficeStructurePanel.tsx`, `OfficeSiteSummary.tsx`
   - Recruitment → `RecruitmentView.tsx`
5. **Categories & copy** — `src/game/constants.ts` (`RESEARCH_CATEGORY_*`, `STRUCTURE_CATEGORY_*`, `researchDisplayDescription`, `structurePlayerDescription`).
6. **Discover / structure gates** — `isStructureUnlocked`, `researchUnlockForStructure` in `constants.ts`; discover rows in `src/game/researchData.ts` (`unlocksStructure`).

Optional if touching balance copy or unlocks: `scripts/build-research-data.mjs`, `scripts/build-structure-balance.mjs` (sheet placeholders stay here, not in player copy).

### Resume prompt (paste into a new chat)

```
Continue corp-civ-idle player UI work. Read AGENTS.md and docs/ui-principles.md first.
Follow existing patterns in progressionUi, StructureCostLine, QueueSection.
Task: [describe the specific tab or tweak]
```

### Search past decisions

If context from an earlier session matters, search agent transcripts for: `progression-grid`, `ProgressionMaxedCard`, `Discover`, `recruitment-grid`, `player-view-ui`.

---

## Design philosophy

### Categories

- Group **research**, **structures**, and **recruitment** by **player-meaningful roles**, not engine/sheet types (tier, discover flag, internal IDs).
- Use **~4–5 sections** per tab. Too many categories defeats grouping.
- Research-gated builds go in their **functional** section (e.g. electricity generator → Power & research, MIT room → Recruitment), not a separate “Discovered” bucket on the structures tab.

| Tab | Category source | Labels |
|-----|-----------------|--------|
| Research | `RESEARCH_CATEGORY_ORDER` | `RESEARCH_CATEGORY_LABELS` in `constants.ts` |
| Structures | `STRUCTURE_CATEGORY_ORDER` | `STRUCTURE_CATEGORY_LABELS` |
| Recruitment | `RECRUITMENT_CATEGORY_ORDER` in `RecruitmentView.tsx` | `CATEGORY_LABELS` (maps `ContractorCategoryId`) |

Tier is a **badge on the card**, not the section header (recruitment).

### Screen real estate

- **Queue first**, then catalog. No intro paragraphs that repeat queue `count/max`.
- **Collapse maxed/completed** cards to one line (name · level · bonus); expand for detail (`ProgressionMaxedCard`).
- **Collapse category sections** when every item in the group is maxed (`ProgressionCategorySection`, `defaultOpen` when any item needs attention).
- **Checkbox filters** live in the queue header row (e.g. “Hide completed” / “Hide maxed”), not a separate toolbar row.

### No redundant messaging

- **Cost line** (red/green) = affordability. Do not repeat cash/supply/power shortfalls in blocker text.
- **Button label** = action state (Locked, Queue full, In progress). Do not duplicate in a line above.
- Keep **Requires:** (or similar) for locks when the button only says “Locked”.
- Destructive actions (sell/demolish) → **`ConfirmDialog`** with refund note; no refund line on the card.

### Copy

- Player-facing text is **in-world**. Workbook placeholders (“respective resources”) stay in sheets / build scripts only.
- `researchDisplayDescription()` and `structurePlayerDescription()` are the player copy sources.
- Level header format: `Lv 2 → 3 · max 5` — omit max when `maxLevel === 1`.

### Density & grids

- **Research / structures**: `progression-grid` — `minmax(220px, 1fr)` in `App.css`.
- **Recruitment**: `recruitment-grid` — `minmax(200px, 1fr)`; do not reuse the wider progression grid on recruitment.
- Upgrade cards: `structure-card structure-card-upgrade`; tighter padding via CSS on `.structure-card-upgrade`.
- Recruitment compact layout: `recruitment-card-compact` — role clamped to 2 lines (`title` for full text), cost · time inline, qty + button on one footer row.

---

## Shared components & CSS

| Piece | Location | Role |
|-------|----------|------|
| `ProgressionCategorySection` | `progressionUi.tsx` | Collapsible category `<details>` |
| `ProgressionMaxedCard` | `progressionUi.tsx` | One-line maxed summary + expand |
| `StructureCostLine` | `StructureCostLine.tsx` | Affordability; `layout="line"` inline, `layout="stack"` for preview blocks |
| `QueueSection` | `StructureBuildQueueList.tsx` | Queue header with count/max |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Sell / destructive confirms |
| `formatCompactBonus` | `upgradePreviewFormat.ts` | One-line bonus on collapsed maxed cards |
| `structureUpgradeBlockerDisplay` | `OfficeStructurePanel.tsx` | Filters power + duplicate cost messages from blockers |

Main stylesheet blocks: search `App.css` for `progression-grid`, `progression-maxed`, `recruitment-grid`, `recruitment-card-compact`, `structure-card-upgrade`.

Panel width: `.main-view-panel { max-width: 960px; }`.

---

## Tab-specific behavior

### Research (`ResearchView.tsx`)

- Grouped by `RESEARCH_CATEGORY_ORDER`.
- Completed research: optional “Current bonus” box; collapsed when maxed via `ProgressionMaxedCard`.
- In queue: show **In progress**, not “Maxed” (use **built** level for maxed check, not projected queue level).
- “Hide completed” checkbox in queue header.

### Structures (`OfficeStructurePanel.tsx`)

- Grouped by `STRUCTURE_CATEGORY_ORDER`.
- Discover-gated structures (`isStructureUnlocked`) show locked state; unlock requirement from `structureUnlockRequirementLabel`.
- Sell uses `ConfirmDialog` (50% refund). `structureUpgradeBlockerDisplay` strips redundant power/cost blockers.
- “Hide maxed” in queue header. Same in-progress vs maxed fix as research.

### Recruitment (`RecruitmentView.tsx`)

- Grouped by contractor **category** (farming, defense, intel, support, special).
- Collapsible roster: `Staff at {office} · N units` (`recruitment-roster-details`).
- Hire row: inline cost, time, qty, queue button — no stacked “Cost” heading block.
- `branch_manager` locked until Branch Management research ≥ 1.

### Office map summary (`OfficeSiteSummary.tsx`)

- Staff count in stats only; duplicate unit list removed from summary.

---

## Discover research → structures

Five discover nodes unlock structures via `effects.unlocksStructure` in research data:

| Research (discover) | Structure |
|---------------------|-----------|
| (see `researchData.ts`) | `video_production_studio`, `press_room`, `company_statue`, `electricity_generator`, `mit_room` |

Engine gate: `isStructureUnlocked()` in `constants.ts`; build blocked in `engine.ts` if locked. Preview lines in `researchPreview.ts`. Placeholder balance in `scripts/build-structure-balance.mjs` until sheet rows exist.

---

## Recent session state (Aug 2026)

Completed in the UI pass leading to this doc:

- Unified progression patterns across research / structures / recruitment.
- Collapsed maxed cards and category sections.
- Recruitment density pass: `recruitment-grid`, compact hire footer, 2-line role clamp.
- Progression grid narrowed to 220px (from 260px).
- Discover structure unlocks wired end-to-end.

**Not committed** unless git history shows otherwise — check `git status` / `git diff` before assuming.

**Session log:** **ChangeLog** tab in `20260827 Corp Idle Working.xlsx` (append via `scripts/append-changelog-aug4-progression-ui.mjs`; close Excel if EBUSY).

**Likely follow-ups** (user taste, not blockers):

- Further recruitment density (e.g. role in expand-only `<details>` if cards still feel tall).
- Tune grid min widths if panel still feels wide on target viewport.
- More player descriptions as balance sheet matures.

---

## Anti-patterns (do not reintroduce)

- Separate “Discovered structures” section on structures tab.
- Duplicate queue-full / can’t-afford text when the button already says it.
- Refund amount on the structure card (dialog only).
- Grouping recruitment by tier instead of category.
- Reading entire `App.css` or full generated data files when editing one tab.
- Player-facing “respective resources” or other sheet placeholder language.

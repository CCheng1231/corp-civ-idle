# Player UI principles & handoff (corp-civ-idle)

Gameplay may be deep; **UI must stay scannable**. This doc captures design decisions and where to look when continuing UI work in a **new chat**.

## New chat — read this first

When picking up UI work, read in this order (narrow scope; avoid full-repo scans):

1. **This file** — philosophy, file map, recent state.
2. **`.cursor/rules/player-view-ui.mdc`** — always-applied rules for `src/components/**` and `src/App.css`.
3. **`.cursor/rules/cross-platform-layout.mdc`** — Android / iOS / PC scaling, safe areas, 48px touch targets.
4. **`.cursor/rules/world-map-viewport.mdc`** — when changing world map layout, bounds, pan/zoom, or Home.
5. **Shared UI** — `src/components/progressionUi.tsx`, `src/components/upgradePreviewFormat.ts` (`formatCompactBonus`).
6. **The tab you are editing** — one view + its CSS blocks in `src/App.css`:
   - **Home hub nav** → `ShortcutSidebar.tsx` (`HOME_HUB_ITEMS`, `.shortcut-home-hub-*`)
   - **Build** → `OperationsView.tsx`, `OfficeStructurePanel.tsx`, `OfficeSiteSummary.tsx`
   - **Recruit** → `RecruitmentView.tsx`
   - **Research** → `ResearchView.tsx`
   - **Secretary** → `OfficeView.tsx`, `SecretaryBriefing.tsx`, `JobBoard.tsx`, `JobPostingCard.tsx`, `MissionCrewPicker.tsx`, `TaskForceStatusIcon.tsx` (embedded job board)
   - Map hex drawer (commercial lots / branches) → `MapHexDrawer.tsx`, `mapHexInfo.ts`, `branchCommercial.ts`
7. **Category open state** — `src/game/officeCategoryOpen.ts` (Build, Recruit, Research section collapse persists per office).
8. **Categories & copy** — `src/game/constants.ts` (`RESEARCH_CATEGORY_*`, `STRUCTURE_CATEGORY_*`, `researchDisplayDescription`, `structurePlayerDescription`).
9. **Discover / structure gates** — `isStructureUnlocked`, `researchUnlockForStructure` in `constants.ts`; discover rows in `src/game/researchData.ts` (`unlocksStructure`).

Optional if touching balance copy or unlocks: `scripts/build-research-data.mjs`, `scripts/build-structure-balance.mjs` (sheet placeholders stay here, not in player copy).

### Resume prompt (paste into a new chat)

```
Continue corp-civ-idle. Read AGENTS.md and docs/ui-principles.md first.
Follow .cursor/rules/player-view-ui.mdc for tab UI; world-map-viewport.mdc for map/layout.
Online: useOnlineWorld.ts, worldSync.ts, browserLease.ts — one tab per online account.
Follow existing patterns in progressionUi, StructureCostLine, QueueSection, ConfirmDialog.
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
| `ConfirmDialog` | `ConfirmDialog.tsx` | Sell / destructive confirms; `confirmTone="primary"` for establish branch |
| `BranchOpeningCostLine` | `MapHexDrawer.tsx` | `Cost:` neutral + green/red resource amount (like StructureCostLine, both label + amount colored) |
| `formatCompactBonus` | `upgradePreviewFormat.ts` | One-line bonus on collapsed maxed cards |
| `structureUpgradeBlockerDisplay` | `OfficeStructurePanel.tsx` | Filters power + duplicate cost messages from blockers |
| `SceneBanner` | `SceneBanner.tsx` | Category scene strip (Build, Recruit, Research) |
| `TaskForceStatusIcon` | `TaskForceStatusIcon.tsx` | Traveling / on-site glyph for Secretary task-force rows |
| Category open persist | `officeCategoryOpen.ts` | Per-office collapse for Build / Recruit / Research sections |

Main stylesheet blocks: search `App.css` for `progression-grid`, `progression-maxed`, `recruitment-grid`, `recruitment-card-compact`, `structure-card-upgrade`, `shortcut-home-hub`, `secretary-task-forces-beside`, `secretary-task-force-icon`, `job-board-detail-drawer`, `mission-crew-unit-controls`, `office-site-summary-banner`.

Panel width: `.main-view-panel { max-width: 960px; }`.

---

## Tab-specific behavior

### Research (`ResearchView.tsx`)

- Grouped by `RESEARCH_CATEGORY_ORDER`.
- Completed research: optional “Current bonus” box; collapsed when maxed via `ProgressionMaxedCard`.
- In queue: show **In progress**, not “Maxed” (use **built** level for maxed check, not projected queue level).
- “Hide completed” checkbox in queue header.

### Structures / Build tab (`OperationsView.tsx`, `OfficeStructurePanel.tsx`)

- Nav label **Build**; page title **Building**.
- Grouped by `STRUCTURE_CATEGORY_ORDER` with `SceneBanner` per category; collapse persisted via `officeCategoryOpen.ts`.
- Space / power / office expand in **banner below portrait** (`OfficeSiteSummary` `variant="banner"`), not beside queue.
- Discover-gated structures (`isStructureUnlocked`) show locked state; unlock requirement from `structureUnlockRequirementLabel`.
- Sell uses `ConfirmDialog` (50% refund). `structureUpgradeBlockerDisplay` strips redundant power/cost blockers.
- “Hide maxed” in queue header. Same in-progress vs maxed fix as research.

### Recruitment (`RecruitmentView.tsx`)

- Grouped by contractor **category** (farming, defense, intel, support, special) with scene banners + collapsible sections.
- **Unit breakdown** below portrait (clickable count → office roster list).
- Collapsible roster: `Staff at {office} · N units` (`recruitment-roster-details`).
- Hire row: inline cost, time, qty, queue button — no stacked “Cost” heading block.
- `branch_manager` locked until Branch Management research ≥ 1.

### Research (`ResearchView.tsx`)

- Grouped by `RESEARCH_CATEGORY_ORDER` with scene banners; firm-wide **completed** count in banner below portrait.
- Same collapse / maxed / queue patterns as Build.

### Secretary (`OfficeView.tsx`, `SecretaryBriefing.tsx`)

- Nav and title **Secretary** (not Sec).
- **Task forces** `active/cap` + compact deployment list **below Office picker** (beside portrait).
  - Two lines per row: job name · status (`engagementStatusLabel`); units/earnings in `data-tip` only.
  - Left icon: `TaskForceStatusIcon` — traveling (animated) vs on-site (static); matches world-map task glyphs.
  - Cancel uses shared `queue-cancel-btn` pattern.
- **Reports** count in banner below portrait.
- Job reports / Job board: compact tab pills; job board **Filters** is link text (`Filters` / `Hide filters`), not a pill button.
- Embedded job board: no top border (`.job-board.job-board-embedded`); duplicate Task forces panel removed from Job reports tab.
- **Filters (expanded):** 2-column grid; full width above list in Secretary (not a narrow side column).
- **Posting drawer** (`JobBoard.tsx` → `JobPostingCard`): fit-content height (no dead space below Engage); compact type; **Larger** / **Smaller** bumps in-drawer font scale.
  - Crew row: `MissionCrewPicker` with **−** / **+** / **Max** steppers (no heavy bordered box).
  - Completion/size tooltips: no “shared job progress” title; pop **upward**; `overflow: visible` so drawer does not scroll for tips.
  - Engage disabled copy: **Not enough units** (generic — not category-specific). Button stays short/compact.
  - No “Shared world” badge on posting card.
- Queue/countdown copy in drawer uses `5m` / `30s` (`formatQueueTimeMs`, `formatJobDurationSec`).

### Office map summary (`OfficeSiteSummary.tsx`)

- Staff count in stats only; duplicate unit list removed from summary.

### World map (`WorldView.tsx`, `mapViewport.ts`, `mapWorld.ts`)

- **Presentation pixels:** `worldMapAxialToPixel` / `worldMapHexBounds` (region radial stretch).
- **Viewport math:** `mapViewport.ts` only — fit zoom, pan clamp, Home center (`worldMapViewportCache.ts` for persistence).
- Changing layout → update washes, paths, bounds, zoom, and Home together (see `world-map-viewport.mdc`).

### Map hex drawer — commercial lots (`MapHexDrawer.tsx`)

- **Contracts** — collapsible; tower-style postings, **Send** → Secretary job board (`map-hex-job-send` button).
- **Branch** — collapsible; locked until Branch Management research; shows regional **site bonus** (structure passives multiplier from `REGION_SITE_RATE_BONUS`, not a timed buff).
- **Branch pads** — up to 3 per lot (Compact / Standard / Campus); each pad is an independent establish target. Row layout: `Compact · 8 space · to 12` on title line (same font size); second line `Cost: Cash N` + compact **Establish** button (match Send styling).
- **Establish** — `ConfirmDialog` before open; blocker tooltip floats **left** of button, only when blocked (compact list, not full-width above).
- Pad costs / catalog: `src/game/branchCommercial.ts` (`BRANCH_PAD_CATALOG`: cash 2000/4000/6000; `officeSpaceRange` / `expansionCapRange` for future per-lot variation; 0–4 pads via `MAX_BRANCH_PADS_PER_LOT`).
- Multi-branch engine: `branchSites[]`, office id `branch:${commercialLotId}:${slotIndex}` — see `branchSites.ts`, `mapWorld.ts`, `save.ts` migration.

### Top chrome (`ResourceBar.tsx`, `App.tsx`, `ShortcutSidebar.tsx`)

- Resource bar brand is **CC · Corp Civ Idle** only (no Online / player badges — more chip room).
- Online connection line on **second bar**: `{Player} · Online {status}` (e.g. Tim · Online connected).
- **Bottom nav (mobile):** World · **Home** · Secretary · Log · Set. **Home** single-tap opens flyout: Build, Recruit, R&D; tap Home again → HQ overview. CSS: `.shortcut-home-hub-*`, overflow visible when open.

---

## Discover research → structures

Five discover nodes unlock structures via `effects.unlocksStructure` in research data:

| Research (discover) | Structure |
|---------------------|-----------|
| (see `researchData.ts`) | `video_production_studio`, `press_room`, `company_statue`, `electricity_generator`, `mit_room` |

Engine gate: `isStructureUnlocked()` in `constants.ts`; build blocked in `engine.ts` if locked. Preview lines in `researchPreview.ts`. Placeholder balance in `scripts/build-structure-balance.mjs` until sheet rows exist.

---

## Recent session state (Aug 2026)

### Aug 31 (late evening) — Online save integrity + browser lease + HQ focus

- **Refresh / stale-tab fixes:** Bootstrap no longer races Firestore listeners; online first paint skips localStorage cache; auto-save gated until load completes. Migrations tolerate missing `structureQueues` per office and empty `branchSites`.
- **Reset / session auth:** World meta `playerResetAt`, `playerSaveSessionId`; save fields `resetGeneration`, `onlineSaveSessionId`, `onlineResetGeneration`. Stale tabs cannot overwrite post-reset progress. Corrupt remote loads repair instead of wipe.
- **Browser lease:** `src/multiplayer/browserLease.ts` + `useOnlineBrowserLease` — one active browser per Tim/Chris online account; duplicate tab alerts and returns to account gate. `claimGeneration` prevents React StrictMode false kicks; heartbeat reclaims vacant leases.
- **Settings (online):** Per-player account reset, shared-world reset (job board + task forces only), full world reset, **Pull from Firestore** with timeout UX.
- **Map / HQ:** Chris HQ at `{-2,-4}`; `focusViewportOnContentPoint` + DOM rect nudge for reliable HQ button centering.
- **Misc:** Secretary stats banner counts clickable; blank favicon in `index.html`.

**Changelog:** `scripts/append-changelog-aug31-online-save-lease.mjs` → **ChangeLog** tab.

**Likely follow-ups:**

- Playtest Tim online: single tab, wait 10s+, refresh — confirm cash/progress persists after one account reset if needed.
- Two-browser lease test: second Tim/Chris tab should kick first; first alone should never self-kick.
- Verify shared job board flush after long offline tab closed.
- Optional: replace `window.alert` on lease kick with in-app toast/dialog.

### Aug 31 (evening) — Secretary task forces + job posting drawer

- **Task forces:** Two-line compact rows; `TaskForceStatusIcon`; tooltip holds units/earnings; abbreviated queue times (`m` / `s`).
- **Job board filters:** 2-column grid when expanded; Secretary uses full-width filter panel.
- **Posting drawer:** Dense layout, crew −/+ / Max, fit-content popup, Larger text toggle, generic **Not enough units** engage blocker, upward tooltips.

**Changelog:** `scripts/append-changelog-aug31-secretary-job-board.mjs` → **ChangeLog** tab.

**Likely follow-ups:**

- Playtest posting drawer on S24: Larger scale, tooltip position near bottom facts rows.
- Task-force icon motion (`prefers-reduced-motion` already respected) — tune if too subtle.
- Optional: click **Reports** count → Job reports tab.

### Aug 31 — Home hub nav + Build / Recruit / Research / Secretary tab UI

- **Home hub:** Build, Recruit, R&D removed from bottom nav; accessed via **Home** flyout (`ShortcutSidebar.tsx`). Touch/overflow fixes for mobile.
- **Build:** Page title **Building**; space/power/expand banner below portrait; category scene banners + persisted collapse.
- **Recruit:** Unit count banner (clickable roster); category banners (`Recruit_*.png/jpg/webp`); compact hire queue.
- **Research:** Firm-wide progress banner; category banners including `Research_Operations.webp`.
- **Secretary:** Renamed from Sec; task forces under Office picker with live deployment list; Reports below portrait; compact job tabs; Filters as link text.

**Changelog:** `scripts/append-changelog-aug31-tab-ui-home-hub.mjs` → **ChangeLog** tab.

**Likely follow-ups:**

- Home flyout: optional **Overview** row at top of menu; verify long nav label **Secretary** on narrow devices.
- Secretary: make Reports count clickable (open Job reports tab?) if desired.
- Tune category banner heights / font sizes on S24 after playtesting all four tabs.

### Aug 31 — commercial branch pads + map drawer + top bar

- Commercial lot **Contracts** + **Branch** sections in map drawer; multi-pad branch establish with per-size cash costs (2000/4000/6000).
- `branchSites[]` multi-branch refactor; save migration from single branch.
- Map drawer UI polish: Send-sized Establish, confirm dialog, `BranchOpeningCostLine`, left-floating blocker tips.
- Resource bar decluttered; player + online status on second banner row.
- World map viewport split (`mapViewport.ts`, `world-map-viewport.mdc`).

**Changelog:** `scripts/append-changelog-aug31-commercial-branch-map.mjs` → **ChangeLog** tab.

**Likely follow-ups:**

- Roll per-lot pad count (0–4) and space ranges from location data (catalog ranges exist in `branchCommercial.ts`).
- Tune pad costs in sheet / `BRANCH_PAD_CATALOG` when balance is ready.
- Commercial job postings balance and more lots on the map.

### Earlier UI pass (documented baseline)

Completed in the UI pass leading to this doc:

- Unified progression patterns across research / structures / recruitment.
- Collapsed maxed cards and category sections.
- Recruitment density pass: `recruitment-grid`, compact hire footer, 2-line role clamp.
- Progression grid narrowed to 220px (from 260px).
- Discover structure unlocks wired end-to-end.
- **UI scale default is 100%** (`UI_SCALE_DEFAULT = 1`). Design against 100%; use 125% as the squeeze check.
- Home: net worth in the bottom panel above structure levels; empty queues show `0/2` only.

**Session log (older):** `scripts/append-changelog-aug4-progression-ui.mjs` and related scripts.

**General follow-ups** (user taste, not blockers):

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

# Changelog

All notable changes to **corp-civ-idle** are documented here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Planned / follow-ups

- Further recruitment density (e.g. role text in expand-only details) if cards still feel tall.
- Replace placeholder balance for discover-gated structures when sheet rows exist.
- Tune grid min widths after more playtesting on target viewport.

---

## [2026-08-04]

Summary: **Discover research unlocks**, a unified **progression UI pass** across research / structures / recruitment, and **agent handoff docs** so new chats can resume without this thread.

### Added

- **Discover research → structure unlocks** — five discover nodes gate new structures via `unlocksStructure` (`video_production_studio`, `press_room`, `company_statue`, `electricity_generator`, `mit_room`). Engine and UI respect `isStructureUnlocked()`.
- **Shared progression UI** — `ProgressionCategorySection`, `ProgressionMaxedCard`, `formatCompactBonus()`; collapsed maxed cards and auto-collapsed category sections when all items are maxed.
- **Player-facing research copy** — `researchDisplayDescription()` and build script support; in-world descriptions instead of sheet placeholders.
- **Sell confirmation** — structure sell uses `ConfirmDialog` with 50% refund note (no refund line on card).
- **Map region outlines** — `mapRegionOutlines.ts` and related `WorldView` polish from the same pass.
- **Agent handoff** — `AGENTS.md`, `docs/ui-principles.md`, `.cursor/rules/player-view-ui.mdc`.

### Changed

- **Research tab** — grouped by category (Resource efficiency, Project payouts, Discover structures, Operations); queue first; “Hide completed” in queue header; compact level labels (`Lv 2 → 3 · max 5`); “In progress” when queued (not “Maxed”); current bonus on completed research.
- **Structures tab** — grouped by functional category (Essentials, Departments, Power & research, Recruitment); discover-gated builds in functional sections, not a separate bucket; hide maxed filter; same in-progress / collapsed maxed patterns as research; `structureUpgradeBlockerDisplay()` filters redundant power/cost blockers.
- **Recruitment tab** — grouped by contractor category with tier badge on card; collapsible roster; denser hire row (`recruitment-grid`, `recruitment-card-compact`: inline cost · time, 2-line role clamp, qty + button on one row).
- **Grids** — progression cards `minmax(220px, 1fr)`; recruitment `minmax(200px, 1fr)`.
- **Office site summary** — removed duplicate unit list (staff count in stats only).
- **Balance data** — regenerated `researchData.ts` / `structureBalanceData.ts`; build scripts updated for discover structures and player descriptions.

### Fixed

- Research / structures showed **“Maxed” while still queued** — maxed check now uses built level, not projected queue level.

---

## [2026-08-04] — earlier (prior commit)

- Branch v1, map polish, and `20260804` balance workbook baseline.

## [Earlier]

- Build queues, Secretary job board, map hex inspector.
- Repo made public.
- Phase 1 MVP: resources, structures, research, contractors, projects, hex map, auto-save.

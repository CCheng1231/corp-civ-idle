/**
 * Appends 8/4/2026 changelog rows (world map polish + branch system v1).
 * Run: node scripts/append-changelog-aug4-branch.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/4/2026",
    "SUMMARY (for other devs) — World map player presentation + Branch office v1 foundation. Map: soft region washes, decorations, zoom/pan, legend, Player/Dev ground styles; Dev keeps sharp hex board. Branch: Branch Manager (Special unit, consumed on establish), Massive Expansion research (#21) for extra branch slots, renameable branch names (default “Branch N @ Region”), temporary region site bonuses on structure passives. HQ starts in countryside at 0% bonus so opening a branch inland is incentivized. Lot uniqueness / multi-office model (beyond hq|branch) deferred.",
  ],
  [
    "8/4/2026",
    "Cursor AI: World map Player view — soft region washes (overlapping curvy patches per cell, light blur); Dev view keeps sharp hex board. Shared regionAtCoord + MAP_REGION_SEED so both views match.",
  ],
  [
    "",
    "Cursor AI: World map — Player ground styles (Streets / Terrain / Hybrid via settings.mapPlayerGround); clustered non-clickable region decorations (town pockets); collapsible legend with hover spotlight; zoom (+/−/reset + wheel) and clamped pan.",
  ],
  [
    "",
    "Cursor AI: World map — drawer always right; richer tower panel for on-site task forces; landmark/hex inspect via data-map-q/r (fixes click vs pan capture). No static roads; travel paths only for active job engagements.",
  ],
  [
    "8/4/2026",
    "Recruitment: added Branch Manager — Type Special, Tier 1; flat cost $800 cash / 200 SUP / 10 REP / 8 CON. Establish-only: required and consumed when founding a branch; no job/office passive use. Unlocked by Branch Management research. Special type note added on Recruitment tab.",
  ],
  [
    "",
    "Research #8 Branch Management — effect text updated: unlocks Branch Manager hire; establish consumes 1 Branch Manager + opening cost at HQ.",
  ],
  [
    "",
    "Research #21 Massive Expansion (was Placeholder research 21) — Unlock, max level 4, pre-req Branch Management L1, R&D Lv 8. +1 additional branch slot per level (beyond the first); each new branch still consumes a Branch Manager. Wired in build-research-data.mjs as massive_expansion (v1 set).",
  ],
  [
    "8/4/2026",
    "Cursor AI: Branch establish — requires Branch Management + 1 Branch Manager at HQ (consumed) + BRANCH_OPENING_COST. Default name “Branch 1 @ {Region}”; RENAME_BRANCH (max 48 chars) from map drawer. officeDisplayName used in overview picker / map titles.",
  ],
  [
    "",
    "Cursor AI: Recruitment — category Special; Branch Manager hire gated on branch_management. Engine START_RECRUITMENT rejects BM without research. Types: ContractorCategoryId += special, UnitId += branch_manager, ResearchId += massive_expansion; ProgressionEffects.branchSlotPerLevel.",
  ],
  [
    "",
    "Cursor AI: Temporary region site bonus on structure passive rates only (not job payouts). Rank worst→best: countryside 0% → rural 7% → suburban 10% → metropolis 12%. HQ pinned to countryside (MAP_HQ q:2,r:-7; HQ_REGION). Shown on map office/commercial panels.",
  ],
  [
    "",
    "Deferred / next: multi-office state beyond “hq”|“branch” (up to 5 via Massive Expansion), commercial lot uniqueness / regional security bonuses, Google Sheet sync if live workbook diverges from this xlsx.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, {
  header: 1,
  defval: "",
});

const already = rows.some((r) =>
  String(r[1] ?? "").includes("Branch office v1 foundation"),
);
if (already) {
  console.log("8/4/2026 branch changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

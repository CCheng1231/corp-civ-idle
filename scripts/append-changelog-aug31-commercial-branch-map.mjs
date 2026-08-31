/**
 * Appends 8/31/2026 changelog rows (commercial branch pads, map drawer, top bar).
 * Run: node scripts/append-changelog-aug31-commercial-branch-map.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/31/2026",
    "SUMMARY (for other devs) — Commercial lots: Contracts (tower-style job postings + Send → Secretary job board) and Branch section (collapsible). Each commercial lot has up to 3 independent pads (Compact / Standard / Campus); each pad can become a separate branch office (branchSites[], dynamic office ids branch:lot:slot). Per-pad opening cost (cash only for now): Compact 2000, Standard 4000, Campus 6000 — tunable in src/game/branchCommercial.ts (BRANCH_PAD_CATALOG; 0–4 pads per lot + space ranges ready for per-location authoring). Map hex drawer: pad row uses contract-style Send-sized Establish button, confirm dialog, Cost: with neutral label + green/red Cash amount (BranchOpeningCostLine), left-floating blocker tooltip. Site bonus copy fixed (REGION_SITE_RATE_BONUS — regional structure passive multiplier, not a timed buff). Top chrome: removed Online/player badges from resource bar; second bar shows Tim · Online connected. World map viewport refactor: mapViewport.ts, worldMapViewportCache.ts, world-map-viewport.mdc rule.",
  ],
  [
    "8/31/2026",
    "Cursor AI: src/game/branchCommercial.ts, branchSites.ts — multi-branch save migration, establish per pad, job board/map travel office ids.",
  ],
  [
    "",
    "Cursor AI: MapHexDrawer — commercial Contracts + Branch pads, ConfirmDialog establish, BranchOpeningCostLine; mapWorld commercial lots, branch slots, site bonus display.",
  ],
  [
    "",
    "Cursor AI: ResourceBar/App — player + connection status on online-status-banner only (more room for resource chips). ConfirmDialog confirmTone primary.",
  ],
  [
    "",
    "Cursor AI: WorldView/mapViewport/worldMapViewportCache — decoupled viewport math; AGENTS.md + docs/ui-principles.md handoff updated.",
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
  String(r[1] ?? "").includes("Commercial lots: Contracts"),
);
if (already) {
  console.log(
    "8/31/2026 commercial branch/map changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

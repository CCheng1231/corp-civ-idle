/**
 * Appends 10/29/2026 changelog — map chrome polish, Home/Secretary hub resume + double-tap,
 * Overview structure double-click jump, farming unit portrait skins + Roaster Unit skins switcher.
 * Run: node scripts/append-changelog-oct29-map-ui-unit-portraits.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "unitPortraitAssets farming skins";

const NEW_ROWS = [
  [
    "10/29/2026",
    "SUMMARY (for other devs) — World map UI: narrower HQ/Filter controls and collapsed Jobs strip; Filter renamed to Landmark icon (hides all baked overlays including HQ/towers when unchecked); clicking empty map clears hex inspection; higher-contrast text in player hex drawer and removed landmark/hub boilerplate copy. Home & Secretary hubs: categories start collapsed and persist in localStorage; single-tap Home/Secretary restores last sub-view, double-tap returns to hub landing; double-clicking a structure on Home -> Overview opens Structure tab and scrolls to that card. Recruitment & Roaster: Farming units (Fresh Graduate, Part-timer, Office clerk, Call Center Veteran) use translucent left-portrait cards with Pass 2 skins; Secretary -> Roaster split into collapsible Secretaries and Unit skins sections; banked higher-tier/Intel designs documented in docs/unit-art-bank.md.",
  ],
  [
    "10/29/2026",
    `Cursor AI: WorldView.tsx, MapWorldLandmarkFilterControl.tsx, MapHexDrawer.tsx, 08-world-tab.css, 09-world-map-ground.css, hubNavigation.ts, ShortcutSidebar.tsx, OverviewView.tsx, OfficeStructurePanel.tsx, RecruitmentView.tsx, SecretaryRosterView.tsx, unitPortraitAssets.ts, 06-job-board.css, docs/unit-art-bank.md — ${MARKER}, hub resume & double-tap, map chrome & drawer contrast.`,
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

if (rows.some((r) => String(r[1] ?? "").includes(MARKER))) {
  console.log("10/29/2026 changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

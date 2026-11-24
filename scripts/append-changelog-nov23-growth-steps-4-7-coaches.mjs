/**
 * Appends 11/23/2026 changelog — Growth steps 4–7 coach pass + map dispatch engage polish.
 * Run: node scripts/append-changelog-nov23-growth-steps-4-7-coaches.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Growth steps 4–7 coaches";

const NEW_ROWS = [
  [
    "11/23/2026",
    `SUMMARY — Government Program growth: Step 4 After-action (intro + Secretary → Job reports dismiss coach); Step 5 R&D voucher (intro + Research queue coach); Step 6 Branch hint (intro only); Step 7 Branch Manager recruit coach. Step 3 polish — map dispatch engage spotlights portal to backdrop, Team dispatched popup after Engage, travel zoom remeasure, hex drawer coach highlights only during coach phases.`,
  ],
  [
    "11/23/2026",
    `Cursor AI: govProgram.ts, types, engineReducer, GovProgramGrowthPathCoach, GovProgramGrowthTutorialIntro, App, SecretaryBriefing, ResearchView, RecruitmentView, MapHexDrawer, GovProgramCoachSpotlight, MapWorldJobEngageDialog, WorldView — ${MARKER}.`,
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
  console.log("11/23/2026 growth steps 4–7 changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);
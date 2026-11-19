/**
 * Appends 11/18/2026 changelog — Growth track map survey + first contract coaches.
 * Run: node scripts/append-changelog-nov18-growth-map-job-coach.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Growth map step 3–4 coaches";

const NEW_ROWS = [
  [
    "11/18/2026",
    `SUMMARY — Government Program growth: Step 3 Site survey (Jobs filter T1 → pick posting → hex drawer tour); Step 4 First contract (map Jobs → Contracts Send → on-map dispatch modal with light JobPostingCard, no Branch Manager on crew); travel explainer then step reward on World tab (no Secretary hop); coach spotlights portal to world-view; Settings reset growth steps 1–8.`,
  ],
  [
    "11/18/2026",
    `Cursor AI: govProgram.ts, govProgramData.ts, WorldView, MapHexDrawer, MapJobFilterPanel, MapWorldJobEngageDialog, GovProgramCoachSpotlight*, GovProgramMap*, engineReducer, types, 09-world-map-ground.css, 13-gov-program.css — ${MARKER}.`,
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
  console.log("11/18/2026 growth map job coach changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);
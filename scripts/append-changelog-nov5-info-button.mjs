/**
 * Appends 11/5/2026 changelog — Info button matches Section row height.
 * Uses SheetJS (same as the other changelog scripts). ExcelJS rewrites corrupt the workbook.
 * Run: node scripts/append-changelog-nov5-info-button.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Info button matches Section dropdown row height";

const NEW_ROWS = [
  [
    "11/5/2026",
    "SUMMARY — Hub Info buttons (Structure, Recruit, Research, Gov't Prog, World map) are one row tall, matching the Section dropdown. Gov't Prog header uses the same frozen Info + Section/Office band as the Structure tab.",
  ],
  [
    "11/5/2026",
    `Cursor AI: GovernmentProgramView, 05-hub-tabs.css, 09-world-map-ground.css — ${MARKER}.`,
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
  console.log("11/5/2026 Info button changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

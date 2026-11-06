/**
 * Appends 11/5/2026 changelog — Government Program + quest map in workbook.
 * Run: node scripts/append-changelog-nov5-gov-program.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Gov Program tab + Growth/Executive quest data";

const NEW_ROWS = [
  [
    "11/5/2026",
    "SUMMARY — Government Program: Growth track (8 steps) + Executive attache (Gessesa, charter on Gov't Prog only, Chief switch); decline/skip-charter paths; engage lock until charter done; save govProgram state; Gov't Prog hub tab UI. Workbook: Gov Program * sheets + embedded Gov Program Map flowchart. Docs: gov-program-spec.md, docs/gov-program-quest-map.jpg.",
  ],
  [
    "11/5/2026",
    `Cursor AI: govProgram.ts, govProgramData.ts, GovernmentProgramView, build-gov-program-data.mjs, embed-gov-program-quest-map-workbook.mjs — ${MARKER}.`,
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
  console.log("11/5/2026 Gov Program changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

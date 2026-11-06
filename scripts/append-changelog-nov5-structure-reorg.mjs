/**
 * Appends 11/5/2026 changelog — structure tab reorg + tier-1 SUP cut.
 * Run: node scripts/append-changelog-nov5-structure-reorg.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Build tab Essentials generators vs Departments caps";

const NEW_ROWS = [
  [
    "11/5/2026",
    "SUMMARY — Build tab: Essentials = passive generators (desk, supply, outreach, break, social, video, press); Departments = caps + expansion (finance, logistics, company statue, office expansion). Structure IDs renamed: dept_finance, dept_logistics, outreach_program (save migration). Display renames: Department of Finance, Department of Logistics, Outreach Program. Tier-1 recruit SUP costs −90% in Recruitment tab + recruitmentData.ts. Structure + Office Concept + Cost sheets updated; Build tab category column on Structure sheet.",
  ],
  [
    "11/5/2026",
    `Cursor AI: structureIdMigration.ts, constants structureCategoryForId, phaseA, structureBalanceData, structure*Art.ts, OfficeStructurePanel sort, patch-structure-reorg-nov5.mjs — ${MARKER}.`,
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
  console.log("11/5/2026 structure reorg changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

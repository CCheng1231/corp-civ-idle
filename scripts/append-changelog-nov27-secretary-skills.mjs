/**
 * Appends 11/27/2026 changelog — secretary skill workbook (3-tab trees + on-site).
 * Run: node scripts/append-changelog-nov27-secretary-skills.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Secretary Skills sheet + 3-tab skill workbook";

const NEW_ROWS = [
  [
    "11/27/2026",
    "SUMMARY — Secretary detail: full-screen skill workbook (Chief · team lead · on site), branched 5-node trees with prerequisites, tap-to-rank shared point pool. Excel Secretary Skills → build-secretary-skill-data.mjs; on-site REP/hire/structure at posted office; save secretaryPostedOffice + onSiteSkillRanks; mobile sheet scroll/portal fixes.",
  ],
  [
    "11/27/2026",
    `Cursor AI: SecretaryDetailDialog, SecretarySkillWorkbook, secretaryEffects/skillLogic/posting, save load order, docs/secretary-skill-review/xaihi.html sandbox — ${MARKER}.`,
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
  console.log("11/27/2026 secretary skills changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);
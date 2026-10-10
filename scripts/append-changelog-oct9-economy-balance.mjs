/**
 * Appends 10/9/2026 changelog — code-first economy balance pass.
 * Run: node scripts/append-changelog-oct9-economy-balance.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "code-first balance structureBalanceData";

const NEW_ROWS = [
  [
    "10/9/2026",
    "SUMMARY (for other devs) — Economy balance: game uses committed src/game/structureBalanceData.ts, researchData.ts, jobHubData.ts (not xlsx at build). Optional import from 20260905 workbook tabs Structure cost and rate, Research Cost, Research, Job Hub via import-balance-from-workbook.mjs. Milestone tuning: upgrade costs ×2.5, T1 job pool +15% and 12% bonus, research manual costs +35%. balance-report.mjs → docs/balance-report.md; npm run balance:report|import|tune.",
  ],
  [
    "10/9/2026",
    `Cursor AI: import-balance-from-workbook.mjs, balance-report.mjs, apply-balance-tuning.mjs, workbook-path (no eager exit), build-* balance scripts import-only — ${MARKER}, docs/balance-playtest-checklist.md, AGENTS.md + google-sheets-balance.mdc code-first.`,
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
  console.log("10/9/2026 economy balance changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

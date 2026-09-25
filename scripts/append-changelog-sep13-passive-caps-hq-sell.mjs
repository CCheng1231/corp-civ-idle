/**
 * Appends 9/13/2026 changelog rows (full passive catch-up, REP/GREP caps, HQ sell floors).
 * Run: node scripts/append-changelog-sep13-passive-caps-hq-sell.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/13/2026",
    "SUMMARY (for other devs) — Passive income: removed 24h OFFLINE_CATCHUP_CAP_SEC; offline load, TICK, and online Firestore sync (finalizeOnlineSyncState) now apply full elapsed passive production since lastTickAt. Welcome dialog no longer mentions a 24h cap.",
  ],
  [
    "9/13/2026",
    "Cursor AI: structureBalance.ts, engine.ts — REP/GREP holding caps enforced in computeResourceCaps + clampResourcesToCaps: sum Company Statue effect per site; if no statue anywhere, soft cap 10 REP and 10 GREP (REP_GREP_CAP_WITHOUT_COMPANY_STATUE). Resource bar shows cap fill for REP/GREP.",
  ],
  [
    "",
    "Cursor AI: phaseA.ts, constants.ts — HQ starter structures (office desk, vault, supply, storage, expansion, power panel) cannot be sold below day-one L1 via minimumStructureLevelAtSite + canSellStructureLevel. Commit ce35fd0.",
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
  String(r[1] ?? "").includes("REP_GREP_CAP_WITHOUT_COMPANY_STATUE"),
);
if (already) {
  console.log(
    "9/13/2026 passive/caps/HQ sell changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

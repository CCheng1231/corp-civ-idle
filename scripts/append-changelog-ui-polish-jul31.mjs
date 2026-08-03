/**
 * Appends 7/31/2026 UI polish changelog rows to ChangeLog tab.
 * Run: node scripts/append-changelog-ui-polish-jul31.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
import { resolveWorkbookPath } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "7/31/2026",
    "Cursor AI: Structure upgrade cards use compact layout; preview box shows stacked cost (cash/supply/power) beside build time and stat deltas.",
  ],
  [
    "",
    "Cursor AI: Research tab matches structure upgrade UI — compact cards, Lv N → N+1, cost stack, and effect preview (bonus %, unlocks).",
  ],
  [
    "",
    "Cursor AI: Office expand button shows expand cost and slot gain; office space used/total remains in summary stats row.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, { header: 1, defval: "" });

const already = rows.some((r) =>
  String(r[1] ?? "").includes("Structure upgrade cards use compact layout"),
);
if (already) {
  console.log("UI polish changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

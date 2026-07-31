/**
 * Appends 7/31/2026 UI changelog rows to ChangeLog tab.
 * Run: node scripts/append-changelog-ui-jul31.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
const workbookPath = join(__dirname, "..", "20260731 Corp Idle Working.xlsx");

const NEW_ROWS = [
  [
    "7/31/2026",
    "Cursor AI: Reordered sidebar — World map, Overview, Office sites first. Added Overview tab (HQ structure levels, builds, research, hiring, units).",
  ],
  [
    "",
    "Cursor AI: Overview office dropdown (HQ + locked Branch) for future multi-site support.",
  ],
  [
    "",
    "Cursor AI: Office sites remember Structure upgrades and Recruitment collapsed/expanded state (saved in game).",
  ],
  ["", "Cursor AI: Office space summary shows expand cost from balance sheet."],
  [
    "",
    "Cursor AI: Structure upgrade cards enlarged; show Lv N → N+1 preview (build time, stat changes).",
  ],
  [
    "",
    "Cursor AI: Upgrade cost shows Cost: with capitalized resource names; each amount green if affordable, red if not.",
  ],
  [
    "",
    "Cursor AI: Removed structure level list from Office sites Summary (moved to Overview).",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, { header: 1, defval: "" });

const already = rows.some((r) =>
  String(r[1] ?? "").includes("Reordered sidebar"),
);
if (already) {
  console.log("UI changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

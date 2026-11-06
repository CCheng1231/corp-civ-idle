/**
 * Adds In roster + Chief effect target columns to Secretary Stat;
 * appends column guide to Secretary Basic.
 * Run: node scripts/patch-secretary-stat-roster-columns.mjs
 * (Close Corp Idle Working.xlsx first if EBUSY.)
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const IN_ROSTER_BY_CODE = {
  Secretary_01: "Y",
  Secretary_02: "Y",
  Secretary_03: "N",
  Secretary_04: "N",
  Secretary_05: "N",
};

const EFFECT_TARGET_BY_CODE = {
  Secretary_01: "officeProduction",
  Secretary_02: "jobWorkTime",
  Secretary_03: "recruitCost",
  Secretary_04: "recruitTime",
  Secretary_05: "travelTime",
};

const BASIC_GUIDE = [
  ["", ""],
  ["Secretary Stat — column guide (for manual edits)", ""],
  [
    "In roster",
    "Y = player can see and assign on Roster tab. N = hidden (data kept for later).",
  ],
  [
    "Chief effect target",
    "Which system the Chief bonus applies to (game applies magnitude in code, default 1% today). Values: officeProduction | jobWorkTime | recruitCost | recruitTime | travelTime",
  ],
  [
    "As Chief of staff / Report line",
    "Player-facing copy only; does not change math.",
  ],
  [
    "Percent / balance",
    "Edit src/game/secretaryEffects.ts CHIEF_EFFECT_MAGNITUDE (or per-kind later). Excel does not store %.",
  ],
];

const wb = XLSX.read(readFileSync(workbookPath));
const sheet = wb.Sheets["Secretary Stat"];
if (!sheet) {
  console.error("Missing Secretary Stat sheet");
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
const header = rows[0] ?? [];
header[5] = "In roster";
header[6] = "Chief effect target";
rows[0] = header;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const code = String(row[0] ?? "").trim();
  if (!code.startsWith("Secretary_")) continue;
  row[5] = IN_ROSTER_BY_CODE[code] ?? "N";
  row[6] = EFFECT_TARGET_BY_CODE[code] ?? "";
  rows[i] = row;
}

wb.Sheets["Secretary Stat"] = XLSX.utils.aoa_to_sheet(rows);

const basicSheet = wb.Sheets["Secretary Basic"];
if (basicSheet) {
  const basicRows = XLSX.utils.sheet_to_json(basicSheet, {
    header: 1,
    defval: "",
  });
  const marker = "Secretary Stat — column guide";
  if (!basicRows.some((r) => String(r[0] ?? "").includes(marker))) {
    for (const line of BASIC_GUIDE) {
      basicRows.push(line);
    }
    wb.Sheets["Secretary Basic"] = XLSX.utils.aoa_to_sheet(basicRows);
  }
}

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Patched Secretary Stat columns F–G + Basic guide → ${workbookPath}`);

/**
 * Adds/updates "Phase A Placeholders (engine)" in the root balance workbook.
 * Run: node scripts/sync-phase-a-placeholders.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;

const __dirname = dirname(fileURLToPath(import.meta.url));
import { resolveWorkbookPath } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();

const SHEET_NAME = "Phase A Placeholders (engine)";

const rows = [
  ["Phase A — engine placeholders (synced from src/game/phaseA.ts)"],
  ["Passive rates are per hour; tick adds rate × (Δt seconds / 3600)."],
  ["Net worth: Cash 1×, Supply 1×, Connection 0×, REP 5×, GREP 10×, power capacity 2×/pt"],
  ["HQ start: space 20, power 30, all listed structures level 1"],
  [],
  [
    "Structure ID",
    "Name",
    "Max Lvl",
    "Upgrade cost note",
    "Cost scale",
    "Cash /hr per lvl",
    "SUP /hr per lvl",
    "CON /hr per lvl",
    "Mood /hr per lvl",
    "Office slots (if built)",
    "Office space /lvl",
    "Power /lvl",
  ],
  [
    "office_desk",
    "Office desk",
    20,
    "L2 ref: 12.5 cash, 6.25 SUP",
    1.1,
    200,
    0,
    0,
    0,
    1,
    0,
    0,
  ],
  [
    "bank_account",
    "Bank account",
    20,
    "L2 ref: 100 cash, 50 SUP",
    1.6,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
  ],
  [
    "office_supply",
    "Office supply",
    20,
    "TBD from sheet",
    1.6,
    0,
    40,
    0,
    0,
    1,
    0,
    0,
  ],
  [
    "storage_room",
    "Storage Room",
    20,
    "TBD from sheet",
    1.6,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
  ],
  [
    "dept_b2b",
    "Department of B2B",
    20,
    "PLACEHOLDER",
    1.5,
    0,
    0,
    15,
    0,
    1,
    0,
    0,
  ],
  [
    "break_room",
    "Break room",
    20,
    "PLACEHOLDER",
    1.5,
    0,
    0,
    0,
    25,
    1,
    0,
    0,
  ],
  [
    "social_media",
    "Social Media",
    20,
    "PLACEHOLDER",
    1.5,
    0,
    0,
    8,
    5,
    1,
    0,
    0,
  ],
  [
    "office_expansion",
    "Office Expansion",
    20,
    "PLACEHOLDER",
    1.55,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ],
  [
    "power_panel",
    "Power Panel",
    20,
    "PLACEHOLDER",
    1.8,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
  ],
  [
    "recruitment_desk",
    "Recruitment Desk",
    10,
    "PLACEHOLDER",
    1.65,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
  ],
  [],
  ["Starting wallet (Phase A)", "", "", "", "", "", "", "", "", "", "", ""],
  ["cash", 5000],
  ["supply", 200],
  ["connection", 200],
  ["mood", 100],
  ["reputation", 0],
  ["govReputation", 0],
];

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const ws = XLSX.utils.aoa_to_sheet(rows);
const existingIdx = wb.SheetNames.indexOf(SHEET_NAME);
if (existingIdx >= 0) {
  wb.Sheets[SHEET_NAME] = ws;
} else {
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
}
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Updated "${SHEET_NAME}" in ${workbookPath}`);

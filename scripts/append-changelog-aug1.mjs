/**
 * Appends 8/1/2026 changelog rows (Job Hub, recruitment polish, notes/logbook).
 * Run: node scripts/append-changelog-aug1.mjs
 * Close the workbook in Excel first if you get EBUSY.
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
    "8/1/2026",
    "Cursor AI: Recruitment expanded to 16 named tier-1 units (4 per category); game reads roster from Recruitment tab via build-recruitment-data.mjs.",
  ],
  [
    "",
    "Cursor AI: Job missions use per-unit crew picker (manual assignment) instead of category-only rosters.",
  ],
  [
    "",
    "Cursor AI: Dev Settings — Ignore costs toggle skips spending and unlocks all research for testing.",
  ],
  [
    "",
    "Cursor AI: World map — selecting a commercial lot no longer auto-opens branch office; lots stay visible after first branch.",
  ],
  [
    "",
    "Cursor AI: Tower job picker lists all towers (locked towers shown disabled).",
  ],
  [
    "8/1/2026",
    "Cursor AI: Added Job hub tab — 11 tower-scoped T1–T2 postings (unit-hour rates, hidden payout caps, expiration, bonus %). Sync script: update-balance-workbook-jobs.mjs; game data: build-job-data.mjs → jobHubData.ts.",
  ],
  [
    "",
    "Cursor AI: Replaced tower bid flow with Job Hub — engage units on postings, unit-hour progress, shift duration returns crew at 100% accrued pay; cancel/posting expire pays 50%; posting complete pays 100% + bonus.",
  ],
  [
    "",
    "Cursor AI: Research #20 Portfolio Management — +1 concurrent job engagement per level (base cap 3, max 5). Replaces placeholder research #20.",
  ],
  [
    "",
    "Cursor AI: Bid model copy — High school Grad renamed to Fresh Graduate.",
  ],
  [
    "",
    "Cursor AI: Logbook logs unit returns from jobs with payout amounts in the Gained column.",
  ],
  [
    "8/1/2026",
    "Cursor AI: Merged Notes and Logbook into one sidebar tab (Notes & logbook); player notes editor above activity sheet.",
  ],
  [
    "",
    "Cursor AI: Logbook table columns are player-resizable (drag header edge); widths persist in browser localStorage.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, { header: 1, defval: "" });

const already = rows.some((r) =>
  String(r[1] ?? "").includes("Added Job hub tab"),
);
if (already) {
  console.log("8/1/2026 changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

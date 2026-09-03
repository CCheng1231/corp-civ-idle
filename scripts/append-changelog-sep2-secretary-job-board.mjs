/**
 * Appends 9/2/2026 changelog rows (Secretary embedded job board polish).
 * Run: node scripts/append-changelog-sep2-secretary-job-board.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/2/2026",
    "SUMMARY (for other devs) — Secretary job board tab: SceneBanner (Secretary_Report.jpg), compact job reports rows, Filters popup overlay (no layout push), compact Sort beside Filters in tab toolbar with localStorage persistence; posting table scroll tail spacer above bottom nav (not row padding); engage closes drawer and clears crew; cancel task only outbound/working; MIN_TRAVEL_MS 10s; briefing tip points to Job board tab.",
  ],
  [
    "9/2/2026",
    "Cursor AI: JobBoard, SecretaryBriefing, OfficeView, App.css — embedded board layout, filter popup, toolbar sort, reports/board tabs.",
  ],
  [
    "",
    "Cursor AI: JobPostingCard, jobs.ts, mapTravel.ts, secretaryBriefing.ts — engage/cancel/travel/briefing fixes.",
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
  String(r[1] ?? "").includes("Secretary_Report.jpg"),
);
if (already) {
  console.log(
    "9/2/2026 Secretary job board polish changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

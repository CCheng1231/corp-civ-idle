/**
 * Appends 8/31/2026 changelog rows (Secretary task forces + job board posting drawer).
 * Run: node scripts/append-changelog-aug31-secretary-job-board.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/31/2026",
    "SUMMARY (for other devs) — Secretary task forces: compact two-line rows (job name + status); units/earnings in tooltip only; TaskForceStatusIcon (traveling vs on-site) beside rows; queue time labels min→m sec→s. Job board: filters 2-column grid (full width when expanded in Secretary); posting detail drawer fit-content height, compact type, crew picker −/+ / Max, upward tooltips without scroll, engage blocker → Not enough units, Larger/Smaller toggles drawer text scale.",
  ],
  [
    "8/31/2026",
    "Cursor AI: OfficeView, TaskForceStatusIcon, App.css — secretary-task-force-row layout and icons.",
  ],
  [
    "",
    "Cursor AI: JobBoard/JobPostingCard/MissionCrewPicker — 2-col filters, compact posting drawer, crew steppers; jobs.ts engage copy; timers.ts abbreviations.",
  ],
  [
    "",
    "Cursor AI: AGENTS.md + docs/ui-principles.md handoff for Secretary job board session.",
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
  String(r[1] ?? "").includes("TaskForceStatusIcon"),
);
if (already) {
  console.log(
    "8/31/2026 Secretary job board changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

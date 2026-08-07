/**
 * Appends 8/7/2026 changelog rows (Secretary/task forces, job catch-up, UI polish).
 * Run: node scripts/append-changelog-aug7-secretary-jobs-ui.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/7/2026",
    "SUMMARY (for other devs) — Secretary & jobs session. Renamed player-facing “job engagements” to task forces. Job reports show payout + return time and link to logbook row highlight; payout resolved from Shift complete row on older saves. Recruitment tab: staff-on-site summary per office; office expand button smaller; staff removed from structure site stats. Removed window-style borders on Secretary and world map views. Task force offline/dev skip fix: multi-pass job simulation, work/return clocks anchor to travelArrivesAt and shift endsAt (same class of bug as structure/research queue clock). Job completion toasts (Task force kind). Progression detail dialog on structure/research name click; queue timer chaining + visibility catch-up tick.",
  ],
  [
    "8/7/2026",
    "Cursor AI: SecretaryBriefing — Task forces panel; job reports with $ earned + returned timestamp; Full details opens logbook Jobs filter and highlights row (logbookHighlightEntryId). secretaryBriefing relatedJobPayoutLog for return rows missing gained.",
  ],
  [
    "",
    "Cursor AI: RecruitmentView — staff-at-office block with category summary; OfficeSiteSummary drops staff stat; office-expand-btn compact inline layout.",
  ],
  [
    "",
    "Cursor AI: jobs.ts — processJobEngagements multi-pass catch-up; startWorkingPhase uses travelArrivesAt; beginReturnTravel uses endsAt; shiftPayoutGained on return logs; completionAlerts.ts job toasts on crew return.",
  ],
  [
    "",
    "Cursor AI: engine/timers/structureBalance — queueClock for structure/research/recruitment sequential queues; reconcileStructureBuildTimers overdue completesAt; useGameLoop visibility/focus catch-up TICK.",
  ],
  [
    "",
    "Cursor AI: ProgressionDetailDialog + progressionDetailModel — name-click modal with upgrade path table; research/task force copy updates (Portfolio Management task force cap).",
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
  String(r[1] ?? "").includes("logbookHighlightEntryId"),
);
if (already) {
  console.log(
    "8/7/2026 secretary/jobs UI changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

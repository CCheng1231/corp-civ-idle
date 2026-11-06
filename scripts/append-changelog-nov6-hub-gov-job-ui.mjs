/**
 * Appends 11/6/2026 changelog — hub sticky selectors, Gov Program UX, secretary jobs/workbook.
 * Uses SheetJS (same as other changelog scripts).
 * Run: node scripts/append-changelog-nov6-hub-gov-job-ui.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER =
  "11/6/2026 hub sticky Section/Office width matches Overview (Info overlay)";

const NEW_ROWS = [
  [
    "11/6/2026",
    "SUMMARY — Progression frozen header: Section/Office dropdowns use the same main-column width as Overview (two-track portrait | main grid; Info stays top-left via overlay). Gov't Prog: interactive step guidance, secretary portrait tab BG, portrait-reveal spacer. Shared postings: fix task-forces stuck Finishing when a posting completes online. Secretary Job log: tap a report to expand full detail.",
  ],
  [
    "11/6/2026",
    `Cursor AI: 05-hub-tabs.css, ProgressionTabStickyChrome, GovernmentProgramView, GovProgramStepGuidance, 13-gov-program.css — ${MARKER}.`,
  ],
  [
    "11/6/2026",
    "Cursor AI: jobEngagementSim.ts, jobEngage.ts — online shared postings mark completed engagements so UI does not hang on Finishing.",
  ],
  [
    "11/6/2026",
    "Cursor AI: SecretaryBriefing.tsx, secretaryBriefing.ts, 05-hub-tabs.css — job report rows expandable.",
  ],
  [
    "11/6/2026",
    "Workbook scripts: embed-gov-program-quest-map-workbook.mjs writes Gov Program Map sheet as text only (no embedded image) to avoid Excel corrupt-package rewrites; append-changelog-nov5-info-button.mjs uses SheetJS like other changelog scripts.",
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
  console.log("11/6/2026 hub/Gov/job changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

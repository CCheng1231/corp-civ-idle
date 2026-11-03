/**
 * Appends 11/2/2026 changelog — progression lock nav, Office Expansion, tab UX.
 * Run: node scripts/append-changelog-nov2-progression-build-ui.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Progression lock Requires links + Office Expansion wired";

const NEW_ROWS = [
  [
    "11/2/2026",
    "SUMMARY — Build/Research/Recruit locked cards: clickable Requires lines (progressionLockNav, portrait overlay) with scroll+highlight to target card. Build: Space/Power summary row (left/right); Office Expansion first in Departments with pass2 JPG art; Collapse all on catalog. Recruit + Research: Collapse all toolbar; Research cards use same compact portrait strip layout as Build/Recruit. Review: office-expansion-review.html v1–v4 + crop export. Docs: ui-principles, player-view-ui.",
  ],
  [
    "11/2/2026",
    `Cursor AI: progressionLockNav.ts, ProgressionLockRequirements.tsx, ProgressionCardPortraitColumn.tsx, progressionFocusScroll.ts, OfficeSiteSummary, OfficeStructurePanel, ResearchView, RecruitmentView, structureDepartmentsArt (office_expansion), 06-job-board.css, 12-secretary-portrait.css — ${MARKER}.`,
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
  console.log("11/2/2026 progression/build UI changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

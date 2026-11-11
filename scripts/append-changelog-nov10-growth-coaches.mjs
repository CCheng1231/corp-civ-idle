/**
 * Appends 11/10/2026 changelog — Growth track step 1–2 coaches, live cues, replay flags.
 * Run: node scripts/append-changelog-nov10-growth-coaches.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Growth track coaches (Structure + Recruit)";

const NEW_ROWS = [
  [
    "11/10/2026",
    `SUMMARY — Government Program growth tutorial: Step 1 Structure coach (queue intro + Surtr reward on OK); Step 2 Recruit coach (set qty 10 → queue intro → first-hire coach → step reward); growth replay baseline (actions after replay only); hide executive UI during growth replay; GovProgramLiveCue top banner; Step 1 title Learning Basic; Step 3 Site survey body copy; VICTORY_BANNER_ENABLED off for playtest. UI: coach arrows/cards CSS, sticky portrait gap, horizontal scroll clip on progression tabs.`,
  ],
  [
    "11/10/2026",
    `Cursor AI: govProgram.ts, govProgramLiveCue.ts, OperationsView, OfficeStructurePanel, RecruitmentView, GovProgram* coach components, 13-gov-program.css — ${MARKER}.`,
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
  console.log("11/10/2026 growth coaches changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

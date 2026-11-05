/**
 * Appends 11/4/2026 changelog — map jobs filter, branch establish, save integrity, job UX.
 * Run: node scripts/append-changelog-nov4-map-jobs-branch-save.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Map job Type filter + branch establish return travel + save integrity";

const NEW_ROWS = [
  [
    "11/4/2026",
    "SUMMARY — Save integrity: quarantine failed loads, backup slot, protected local writes + Firestore private save guards (saveIntegrity.ts, docs/save-integrity.md). Map branch establish: planned name, BM cost line, confirm dialog portal; cancel establishment returns Branch Manager with refund on arrival. Map job filter: Tower → Type (tower / major hub / commercial lot / gov). Map hex drawer: hide empty Contracts, supply bonus copy, branch pad readability. Secretary: job board scroll-to-focus from map Send; crew unit links → Home Recruit with category expand + highlight. Overview staff counts use integers.",
  ],
  [
    "11/4/2026",
    `Cursor AI: saveIntegrity.ts, branchEstablishment*.ts, MapHexDrawer, WorldView, MapJobFilterPanel, jobBoard.ts, JobBoard, OfficeView, MissionCrewPicker, RecruitmentView, OverviewView, ConfirmDialog, 09-world-map-ground.css — ${MARKER}.`,
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
  console.log("11/4/2026 map/jobs/branch/save changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

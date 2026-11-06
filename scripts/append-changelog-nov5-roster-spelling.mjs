/**
 * Appends 11/5/2026 changelog — Roaster → Roster rename (UI + save ids).
 * Run: node scripts/append-changelog-nov5-roster-spelling.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Secretary hub Roaster renamed to Roster";

const NEW_ROWS = [
  [
    "11/5/2026",
    "SUMMARY — Secretary hub tab label and ids: Roaster → Roster (secretaryPanel / secretaryHubResume id roster; save load maps legacy roaster). Section collapse localStorage key corp-civ-idle-roster-section-open (migrates from roaster key). Portrait assets Secretary_*_Roaster.jpg → Secretary_*_Roster.jpg.",
  ],
  [
    "11/5/2026",
    `Cursor AI: types, save normalizeSecretaryPanel/HubResume, engineReducer, TabSiteHeader, SecretaryLandingView, officeCategoryOpen, secretaryAssets — ${MARKER}.`,
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
  console.log("11/5/2026 roster spelling changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

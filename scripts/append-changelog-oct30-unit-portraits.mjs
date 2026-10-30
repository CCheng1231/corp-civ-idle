/**
 * Appends 10/30/2026 changelog — defense, intel, and support contractor portraits.
 * Run: node scripts/append-changelog-oct30-unit-portraits.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "support janitor bike courier portraits";

const NEW_ROWS = [
  [
    "10/30/2026",
    "SUMMARY (for other devs) — Contractor portraits for Protection & defense, Intel & scouting, and Support are keyed and wired. Each unit has four switchable skins in Secretary -> Roaster -> Unit skins; Recruitment cards use the default. Defaults: Mall Cop kiosk, Night Watchman onigiri, Ex-bouncer aviators, Corporate Security peaked cap; Internet Surfer ramen, Office Gossip clipboard heart, LinkedIn Stalker holographic profile, Data Entry Snoop pen and printouts; Janitor mop, Bike Courier helmet, Junior Team Lead checklist, Office Mom/Dad thermos. Review pages: docs/unit-portrait-review/defense.html, intel.html, support.html. Chris will look over Support again later.",
  ],
  [
    "10/30/2026",
    `Cursor AI: unitPortraitAssets.ts, process-unit-portrait-demos.mjs, RecruitmentView.tsx, 06-job-board.css, docs/unit-art-bank.md, docs/unit-portrait-review — ${MARKER}, magenta silhouette key with pink-rim peel, dark card well.`,
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
  console.log("10/30/2026 portrait changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

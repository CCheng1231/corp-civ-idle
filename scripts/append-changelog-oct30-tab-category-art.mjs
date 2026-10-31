/**
 * Appends 10/30/2026 changelog — Build + Research Pass 2 category art wired.
 * Run: node scripts/append-changelog-oct30-tab-category-art.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Research tab Pass 2 category art wired";

const NEW_ROWS = [
  [
    "10/30/2026",
    "SUMMARY — Build (Structure) tab uses Essentials Pass 2 v4 finals plus Departments, Power & research, and Recruitment category banners and per-card portraits (recruitment set v1). Research tab: Resource efficiency v2, Project payouts v4, Discover structures v1, Operations v1 — each with pannable category strip and per-project card art. Review hubs: docs/structure-category-review/ and docs/research-category-review/ with crop JSON export. Category summary banner height on Structure, Recruit, and Research: 2.82rem (was 2.35rem, +20%). Next planned: Recruit tab unit/role card images refresh.",
  ],
  [
    "10/30/2026",
    `Cursor AI: structure*Art.ts, research*Art.ts, OfficeStructurePanel, ResearchView, RecruitmentView, StructureCardPortrait, SceneBanner, 06-job-board.css, docs/*-category-review — ${MARKER}, install-research-*-pass2-images.mjs, install-*-pass2-images.mjs.`,
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
  console.log("10/30/2026 tab category art changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

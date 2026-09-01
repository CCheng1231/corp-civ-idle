/**
 * Appends 8/31/2026 changelog rows (Home hub nav, Build/Recruit/R&D/Secretary tab UI).
 * Run: node scripts/append-changelog-aug31-tab-ui-home-hub.mjs
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
    "SUMMARY (for other devs) — Bottom nav reduced to World · Home · Secretary · Log · Set. Home opens vertical flyout for Build, Recruit, R&D (single tap; tap Home again → HQ overview). Build/Recruit/Research tabs: portrait + queue in right column; stats banner below portrait (space/power, unit count, firm-wide research); collapsible category sections with scene banners + session-persisted open state (officeCategoryOpen.ts). Recruit category art + clickable unit count → roster. Secretary renamed from Sec; task forces count + active deployment list below Office picker; Reports banner below portrait; Job reports/board compact tabs; job board Filters as link text (not pill button); embedded job board no top border. Office tab nav label Build; page title Building.",
  ],
  [
    "8/31/2026",
    "Cursor AI: ShortcutSidebar — HOME_HUB_ITEMS flyout, overflow/touch-action fixes; OfficeView/SecretaryBriefing/JobBoard secretary layout.",
  ],
  [
    "",
    "Cursor AI: OperationsView, RecruitmentView, ResearchView — TabPortraitLayout shell, ProgressionCategorySection, SceneBanner, compact queues.",
  ],
  [
    "",
    "Cursor AI: OfficeSiteSummary banner variant; recruit/research assets; build-research-data Office→Build copy; AGENTS.md + docs/ui-principles.md handoff.",
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
  String(r[1] ?? "").includes("Home opens vertical flyout"),
);
if (already) {
  console.log(
    "8/31/2026 tab UI / Home hub changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

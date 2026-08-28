/**
 * Appends 8/27/2026 changelog rows (portrait layouts, log tab, desktop layout).
 * Run: node scripts/append-changelog-aug27-portrait-desktop-ui.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/27/2026",
    "SUMMARY (for other devs) — Portrait column + desktop layout session. All progression tabs (Home, Office sites, Hire, R&D, Sec, Log) share dual portrait mode: compact = portrait lock with frozen header beside image; large = Hire-style stretch + main-panel parallax. Double-tap portrait toggles size (desktop dblclick; touch double-tap). Quotes always overlay portrait foot. Secretary header follows portrait size; job reports vs board panels stay mounted for stable height; work-tab persists in localStorage. Log tab: panel-top header when large; notes under header; activity sheet 50 rows/page, 250 max stored, Clear all; 2D sheet scroll (wheel + drag). Desktop: removed 960px content cap so tabs fill wide browsers; collapsed sidebar shortcut labels centered. cross-platform-layout.mdc + handoff doc updates.",
  ],
  [
    "8/27/2026",
    "Cursor AI: TabPortraitLayout + DraggableTabPortraitFrame + usePortraitPan — DUAL_PORTRAIT_TAB_PROPS, portrait lock page/body classes, per-size pan storage keys; double-tap toggle without desktop double-fire.",
  ],
  [
    "",
    "Cursor AI: OverviewView, OperationsView, RecruitmentView, ResearchView, OfficeView/SecretaryBriefing, LogbookView — portraitLarge moves LocationViewHeader (or log header) to panel top; compact uses portrait-lock-frozen-header + portrait-lock-scroll-body.",
  ],
  [
    "",
    "Cursor AI: LogbookView — CLEAR_ACTIVITY_LOG; paginated sheet; column resize; sheet-wrap as scroll container (fix overflow-y visible blocking wheel); log header title row with Clear all.",
  ],
  [
    "",
    "Cursor AI: App.css — portrait-lock viewport rules for log/secretary; logbook + secretary stack quote overlay; desktop main-view-panel width 100% (no 960px cap); shortcut-sidebar-collapsed label centering; office portrait asset office.jpg.",
  ],
  [
    "",
    "Cursor AI: ResourceBar polish; LocationSitePanel / OfficeStructurePanel tweaks; vite.config dev preview. Agent handoff: cross-platform-layout.mdc (Android/iOS/PC scaling, safe areas, 48px touch).",
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
  String(r[1] ?? "").includes("dual portrait mode"),
);
if (already) {
  console.log(
    "8/27/2026 portrait/desktop UI changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

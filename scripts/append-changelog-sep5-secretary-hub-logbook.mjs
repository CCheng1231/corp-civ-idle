/**
 * Appends 9/5/2026 changelog rows (Secretary hub tabs + compact logbook).
 * Run: node scripts/append-changelog-sep5-secretary-hub-logbook.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/5/2026",
    "SUMMARY (for other devs) — Secretary hub: Roaster / Job / Log tabs share hub-synced portrait layout (TabPortraitLayout spacer, hub-synced-tab-portrait-reveal, HubSyncedTabBackground + HubSyncedTabScrollBody). Roaster: COS banner + secretary roster from workbook data (build-secretary-data.mjs). Job: task forces moved below portrait; TabSiteHeader only in header row. Log: notes + activity log below portrait; table replaced with compact two-row cards (headline e.g. Crew returned: Job complete; meta row: date/time + Job/HQ pills + Cash pill); Effects column removed; horizontal drag-scroll on log sheet; Jobs category label → Job.",
  ],
  [
    "9/5/2026",
    "Cursor AI: SecretaryRosterView, SecretaryLandingView, SecretaryDetailDialog, secretaryData/secretaryAssets/secretaryRoles, HomeLandingView, HubSyncedTab* — hub tab shell, roster UI, portrait assets.",
  ],
  [
    "",
    "Cursor AI: LogbookView, logbook.ts, useDragScroll, App.css — compact log cards, logEntryHeadline/logEntryCashTag, filter toolbar, chief-of-staff synced backgrounds.",
  ],
  [
    "",
    "Cursor AI: OfficeView, TabSiteHeader, ShortcutSidebar, MainContent — Secretary hub nav (Roaster/Job/Log), job tab layout alignment with roster.",
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
  String(r[1] ?? "").includes("compact two-row cards"),
);
if (already) {
  console.log(
    "9/5/2026 Secretary hub + logbook changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

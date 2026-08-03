/**
 * Appends 8/3/2026 changelog rows (mobile nav, research/overview UI, world map drawer).
 * Run: node scripts/append-changelog-aug3.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
import { resolveWorkbookPath } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/3/2026",
    "Cursor AI: Mobile bottom nav — compact single-row tabs (no horizontal scroll); short labels only; centered text; reduced height/padding.",
  ],
  [
    "",
    "Cursor AI: Nav short labels renamed — World (was Map), Home (was HQ for Overview), Office (was Site for Office sites).",
  ],
  [
    "",
    "Cursor AI: Mobile nav overlap fix — 8-column grid, overflow hidden, responsive font size; desktop sidebar short-label column widened (World/Office no longer bleed into full labels).",
  ],
  [
    "8/3/2026",
    "Cursor AI: Structure / research / recruitment upgrade cards — effect preview on top; Cost + Time grouped in footer row (same pattern across all three tabs).",
  ],
  [
    "",
    "Cursor AI: Research cards — stacked title + level line; max shown as “Max level: N” (not Lv N/N slash format).",
  ],
  [
    "",
    "Cursor AI: Overview — structure levels use compact multi-column tiles (name + Lv N / max) instead of full-width rows or cramped 2-col list.",
  ],
  [
    "",
    "Cursor AI: Build queue — queued rows show duration only (e.g. “4 hr”), not “Starts in …”.",
  ],
  [
    "8/3/2026",
    "Cursor AI: World map — clicking a hex opens a slide-out detail panel (no auto-jump to Secretary on tower click). Any hex inspectable: towers, HQ/branch, commercial lots, gov seat, open terrain.",
  ],
  [
    "",
    "Cursor AI: Tower panel lists open job postings (tier, size, duration, $/hr) with optional “Open job board” to Secretary. Branch establishment moved into commercial-lot panel (bottom branch panel removed).",
  ],
  [
    "",
    "Cursor AI: Map detail panel flips side — hexes on the right half open panel on the left (and vice versa) so players can click adjacent hexes without closing the panel.",
  ],
  [
    "8/3/2026",
    "Cursor AI: Secretary — job board hybrid (filterable list + right slide-over detail); collapsible filters; mobile-friendly rows; job reports FYI under engagements with logbook link.",
  ],
  [
    "",
    "Cursor AI: World map — removed redundant tower Job Hub panel; map is geography + branch setup; tower filter syncs to Secretary job board when opened from map.",
  ],
  [
    "",
    "Cursor AI: Settings — Layout preview (Auto / Desktop / Mobile) for UI testing without resizing the browser.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, { header: 1, defval: "" });

const already = rows.some((r) =>
  String(r[1] ?? "").includes("Map detail panel flips side"),
);
if (already) {
  console.log("8/3/2026 changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

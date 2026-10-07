/**
 * Appends 10/6/2026 changelog rows (Z1 AI extend draft rim + composite --rim).
 * Run: node scripts/append-changelog-oct6-z1-world-extend-draft.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const MARKER = "world-extend-ai-rim-source";

const NEW_ROWS = [
  [
    "10/6/2026",
    "SUMMARY (for other devs) — Z1 world plate iteration: composite-z1-world-plate.mjs accepts --rim= for alternate margin art; AI extend draft rim (world-map-z1-hybrid-soft-world-extend-ai-rim-source.jpg) composited to world-extend-draft.png (v5 center + feather). In-game world-plate.png unchanged until Chris approves draft. Next: PR frame bundle (presentation viewBox to plate bounds, map-haze letterbox, tilt vs zoomRel, HQ-only pins at low zoom); then Z1→Z2 crossfade + Z2 regen aligned to v5 geography.",
  ],
  [
    "10/6/2026",
    "Cursor AI: scripts/composite-z1-world-plate.mjs, src/assets/reference/zoom-levels/world-map-z1-hybrid-soft-world-extend-draft.png, world-map-z1-hybrid-soft-world-extend-ai-rim-source.jpg — Z1 margin art pipeline draft; no hex/hub/viewBox engine changes.",
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

const already = rows.some((r) => String(r[1] ?? "").includes(MARKER));
if (already) {
  console.log("10/6/2026 Z1 world extend draft rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

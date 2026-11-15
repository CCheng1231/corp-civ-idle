/**
 * Appends 11/14/2026 changelog — player map region ground textures + job crew picker.
 * Run: node scripts/append-changelog-nov14-region-ground-crew.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER =
  "11/14/2026 player map county greenbelt iso-strong ground + engage crew filter";

const NEW_ROWS = [
  [
    "11/14/2026",
    "SUMMARY — Player world map: gov-centered iso-strong ground patterns for all four distance rings — Core (existing), Metro fringe (suburban), County (rural), Greenbelt (countryside). Shared 1024px field, 30° patternTransform about Gov. Reference previews for County/Greenbelt (top-down + iso variants) in src/assets/reference/. Job board Engage: MissionCrewPicker lists only unit types with at least one stationed at the selected office; empty roster shows a short hint instead of greyed-out rows.",
  ],
  [
    "11/14/2026",
    `Cursor AI: mapMetroFringeGround.ts, mapCountyGround.ts, mapGreenbeltGround.ts, WorldView.tsx, 09-world-map-ground.css, county-iso-preview-demos.html, greenbelt-iso-preview-demos.html, metro-fringe-iso-preview-demos.html, reference/map/*-iso-strong.jpg — ${MARKER}.`,
  ],
  [
    "11/14/2026",
    "Cursor AI: MissionCrewPicker.tsx — filter crew rows by office roster > 0 on engage/send-units UI.",
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
  console.log("11/14/2026 region ground / crew changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);
/**
 * Appends 10/9/2026 changelog — player map 3D HQ + office towers (Crossroads sketch).
 * Run: node scripts/append-changelog-oct9-map-3d-towers.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "MapOfficeTower3D Crossroads";

const NEW_ROWS = [
  [
    "10/9/2026",
    "SUMMARY (for other devs) — Player world map: CSS 3D extruded player HQs (solarpunk canopy A; mine=green pods / peer=blue) on untilted overlay; anchors from hex DOM. All four office towers use Crossroads rural sandstone sketch (MapOfficeTower3D) — pink hex-tile-tower hidden on player view at those coords. Dev map keeps schematic hex colors. Style alternates (metro/suburban/hillside/glass) stay in src/assets/reference/hq-tower-solarpunk-demos.html for future per-tower art.",
  ],
  [
    "10/9/2026",
    `Cursor AI: MapPlayerHqTower3D.tsx, MapOfficeTower3D.tsx, WorldView.tsx, mapViewport.ts (HQ tower tilt/sizing), mapWorld.ts (officeTowerMapSites), 09-world-map-ground.css, hq-tower-solarpunk-demos.html — ${MARKER}, HQ canopy 3D overlay.`,
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
  console.log("10/9/2026 map 3D towers changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

/**
 * Appends 10/27/2026 changelog — player map major hub supertall + baked Gov capitol.
 * Run: node scripts/append-changelog-oct27-gov-hub-map-art.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "MapGovCapitolMarker baked capitol";

const NEW_ROWS = [
  [
    "10/27/2026",
    "SUMMARY (for other devs) — Player world map landmarks: six Z1 major hubs render MapMajorHubSupertallMarker (glass supertall SVG in map viewBox; white hub hex hidden, hex-tile-major-hub-site ring). Gov at MAP_GOV uses baked PBR-style capitol PNG (MapGovCapitolMarker; green-screen key script; hex-tile-gov-site ring; sized via mapGovCapitolArtSizeFromHexRadius). Reference: major-hub-isometric-demos.html, gov-landmark-isometric-demos.html (+ preview PNG co-located for local HTML).",
  ],
  [
    "10/27/2026",
    `Cursor AI: MapMajorHubSupertallMarker.tsx, MapGovCapitolMarker.tsx, WorldView.tsx, mapViewport.ts, 09-world-map-ground.css, gov/major-hub reference HTML, scripts/key-gov-capitol-bake.mjs, src/assets/map/gov-capitol-isometric-bake.* — ${MARKER}, major hub supertall on map.`,
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
  console.log("10/27/2026 gov/hub map art changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

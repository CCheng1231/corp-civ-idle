/**
 * Appends 10/28/2026 changelog — baked player buildings on map, green key, job panel UX.
 * Run: node scripts/append-changelog-oct28-baked-buildings-map-jobs.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "bake-green-key olive backdrop";

const NEW_ROWS = [
  [
    "10/28/2026",
    "SUMMARY (for other devs) — Player map: major hub + four office towers + player HQ (mine/peer) + branch pads (compact/standard/campus) use keyed isometric bakes on MapBakedLandmarkOverlayLayer (replaces CSS 3D HQ/office overlay). scripts/key-map-landmark-bake.mjs + bake-green-key.mjs keys bright chroma and olive #528048 masters; foot presets in mapBakedLandmark.ts. Map Jobs panel lists postings nearest-first; panel width matches hex info drawer (--map-side-panel-width).",
  ],
  [
    "10/28/2026",
    `Cursor AI: mapPlayerBuildingLandmarks.ts, mapLandmarkArtRegistry.ts, WorldView.tsx, MapLandmarkArtLayer.tsx, mapBakedLandmark.ts, map assets, bake-green-key.mjs, key-map-landmark-bake.mjs, jobBoard.ts, MapJobFilterPanel.tsx, 09-world-map-ground.css — ${MARKER}, baked buildings overlay, job list distance sort.`,
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
  console.log("10/28/2026 baked buildings map changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

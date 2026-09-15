/**
 * Appends 9/14/2026 changelog rows (Z1 v5 map, dev layout, hub lock, world extend spec).
 * Run: node scripts/append-changelog-sep14-z1-world-map.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/14/2026",
    "SUMMARY (for other devs) — World map v0.1 Z1: in-game base art world-map-z1-hybrid-soft-pass1-v5.png; z1-layout-canonical.json (rasterAlign, majorHubHexes, markers). MAP_RADIUS 9, greenbelt ring 7. Dev toolbar: Z1 bake drag/scale, hex edit (movable landmarks), per-hex pixel nudge, export layout JSON. Gov + six major hubs locked in dev (mapLayoutLock.ts) but saved hub overrides still honored. Per-hex nudge for non-locked cells. Reverted experimental rim-terrain/viewBox expansion (layout drift). Next: Z1 world plate for zoom-out grey — docs/z1-world-extend-gen-spec.md, scripts/compute-z1-world-extend-margin.mjs (~2600 viewBox pad/side). Hybrid-soft Z2–Z4 rasters by zoomRel. worldMapMajorHubs, mapDevLayout, WorldMapDevToolbar/NudgeControls, Z1 align drag layer.",
  ],
  [
    "9/14/2026",
    "Cursor AI: WorldView.tsx, WorldMapBaseArt.tsx, worldMapV01.ts, worldMapZ1Layers.ts, mapWorld.ts, hexLayout.ts, mapViewport.ts — Z1 presentation, zoom bands, viewport cache, major hubs.",
  ],
  [
    "",
    "Cursor AI: mapDevLayout.ts, mapLayoutLock.ts, WorldMapDevToolbar.tsx, WorldMapDevNudgeControls.tsx, save.ts/types.ts — dev layout overrides, hub lock, settings persistence.",
  ],
  [
    "",
    "Cursor AI: z1-layout-canonical.json, scripts (sync-z1-v5-hub-layout, lock-z1-major-hub-hexes, update-z1-layout-canonical, compute-z1-world-extend-margin), docs/world-map-v0.1.md, docs/z1-world-extend-gen-spec.md, AGENTS.md handoff.",
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
  String(r[1] ?? "").includes("world-map-z1-hybrid-soft-pass1-v5"),
);
if (already) {
  console.log(
    "9/14/2026 Z1 world map changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

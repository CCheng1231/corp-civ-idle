/**
 * Appends 10/7/2026 changelog — Z1 frame bundle, Z1→Z2 blend, Z2 art, AI rim v2 plate.
 * Run: node scripts/append-changelog-oct7-z1-frame-z2-plate.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const MARKER = "Z1 frame bundle";

const NEW_ROWS = [
  [
    "10/7/2026",
    "SUMMARY (for other devs) — World map: Z1 player plate viewBox + map-haze letterbox + strategic pins (Gov+HQ ≤35%); Z1→Z2 smooth crossfade 100–120% with Z2 band at 120%; in-game Z2 replaced from v5-aligned draft; world-plate.png regen with AI rim v2 + v5 composite (--rim). Hex/hub coords unchanged.",
  ],
  [
    "10/7/2026",
    `Cursor AI: WorldView.tsx, WorldMapBaseArt.tsx, mapViewport.ts, worldMapZ1WorldPlate.ts, worldMapV01.ts, App CSS — ${MARKER}, blend fix, Z2 raster, plate rim v2.`,
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
  console.log("10/7/2026 Z1 frame changelog already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog`);

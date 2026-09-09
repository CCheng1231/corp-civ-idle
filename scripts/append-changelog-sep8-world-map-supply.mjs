/**
 * Appends 9/8/2026 changelog rows (world map player view + job supply travel).
 * Run: node scripts/append-changelog-sep8-world-map-supply.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/8/2026",
    "SUMMARY (for other devs) — Jobs: round-trip supply travel (1 supply × hex × unit × 2 legs); full cost required and charged on ENGAGE_JOB dispatch (return leg no longer deducts again). Job cards / crew picker show hex count + round-trip supply. World map: player view is illustrated base art (WorldMapBaseArt + worldMapArt.ts) with hidden hex tiles, Material-style landmark pins (MapLandmarkIcon), travel routes in blue (outbound) / green (return). Dev view keeps colored hex layout. Map art WIP — schematic organic roads/water aligned to landmark hex pixels; reference images folder restored (src/assets/reference/README.md). Online: save bootstrap / session gating tweaks (save.ts, useOnlineWorld). sharp devDep for map bake experiments.",
  ],
  [
    "9/8/2026",
    "Cursor AI: worldMapArt.ts, WorldMapBaseArt.tsx, MapLandmarkIcon.tsx, WorldView.tsx, App.css — player map presentation, landmark pins, illustrated roads/water, travel path colors.",
  ],
  [
    "",
    "Cursor AI: mapTravel.ts, jobs.ts, engine.ts, JobPostingCard.tsx, MissionCrewPicker — roundTripTravelSupplyCost, engage validation, UI copy for supply per hex.",
  ],
  [
    "",
    "Cursor AI: save.ts, useOnlineWorld.ts, App.tsx — online save session bootstrap and pull/sync guards.",
  ],
  [
    "",
    "Cursor AI: scripts/world-map-layout.mjs, world-map-layout.json — shared map bounds for art generation.",
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
  String(r[1] ?? "").includes("round-trip supply travel"),
);
if (already) {
  console.log(
    "9/8/2026 world map + supply changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

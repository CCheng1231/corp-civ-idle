/**
 * Write src/assets/z1-layout-canonical.json from exported dev JSON.
 * Usage: node scripts/update-z1-layout-canonical.mjs path/to/export.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outPath = resolve("src/assets/z1-layout-canonical.json");
const inPath = process.argv[2];
if (!inPath) {
  console.error("Usage: node scripts/update-z1-layout-canonical.mjs <export.json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inPath, "utf8"));
const markers = Array.isArray(raw.majorHubMarkers) ? raw.majorHubMarkers : [];
const align = raw.rasterAlign ?? {};

const hexes = Array.isArray(raw.majorHubHexes) ? raw.majorHubHexes : [];

const doc = {
  lockedAt: raw.lockedAt ?? new Date().toISOString().slice(0, 10),
  note:
    raw.note ??
    "Z1 pass-1 v3 bake alignment + six major hub targets (viewBox pixels).",
  rasterAlign: {
    offsetX: Number(align.offsetX) || 0,
    offsetY: Number(align.offsetY) || 0,
    scale: Number(align.scale) || 1,
    rotationDeg: Number(align.rotationDeg) || 0,
  },
  majorHubMarkers: markers
    .filter((m) => m && Number.isFinite(m.x) && Number.isFinite(m.y))
    .slice(0, 6)
    .map((m) => ({ x: m.x, y: m.y })),
  majorHubHexes: hexes
    .filter((h) => h && Number.isFinite(h.q) && Number.isFinite(h.r))
    .slice(0, 6)
    .map((h) => ({ q: h.q, r: h.r })),
};

writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${outPath} (${doc.majorHubMarkers.length} hubs)`);

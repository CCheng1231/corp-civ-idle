/**
 * Lock six major-hub hexes by clock angle (Z1 v5 bake) + landmark coords.
 * Writes z1-layout-canonical.json markers (pixel) and majorHubHexes.
 *
 * Run: npx tsx scripts/lock-z1-major-hub-hexes.mjs
 */
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAP_GOV,
  MAP_RADIUS,
  axialDistance,
  axialEquals,
  axialKey,
  generateHexagonMap,
} from "../src/game/hexLayout.ts";
import { worldMapAxialToPixel } from "../src/game/mapWorld.ts";
import { z1CanonicalRasterAlign } from "../src/game/z1LayoutCanonical.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const canonPath = resolve(__dirname, "../src/assets/z1-layout-canonical.json");

function clockToRad(hour) {
  return ((hour - 12) / 12) * Math.PI * 2;
}

function coordAngle(coord) {
  const { x, y } = worldMapAxialToPixel(coord);
  return Math.atan2(x, -y);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function pickByClock(
  cells,
  hour,
  minDist,
  maxDist,
  used,
  exclude = [],
) {
  const target = clockToRad(hour);
  let best = null;
  let bestScore = Infinity;
  for (const c of cells) {
    const k = axialKey(c);
    if (used.has(k)) continue;
    if (exclude.some((e) => axialEquals(c, e))) continue;
    const d = axialDistance(c, MAP_GOV);
    if (d < minDist || d > maxDist) continue;
    const score = angleDiff(coordAngle(c), target);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

const cells = generateHexagonMap(MAP_RADIUS);
const used = new Set([axialKey(MAP_GOV)]);

/** Locked with pass-1 v5 bake (clock positions on hex ring). */
const majorHubHexes = [
  { q: 0, r: -5 },
  { q: -7, r: 0 },
  { q: 0, r: 6 },
  { q: 7, r: -5 },
  { q: -7, r: 6 },
  { q: -3, r: -4 },
];
for (const c of majorHubHexes) {
  used.add(axialKey(c));
}

const LANDMARKS = {
  MAP_HQ: { hour: 7.25, minDist: 6, maxDist: 7 },
  CHRIS_HQ: { hour: 2.5, minDist: 4, maxDist: 6 },
  metro_central: { hour: 11, minDist: 2, maxDist: 4 },
  suburban_park: { hour: 4.5, minDist: 5, maxDist: 7 },
  rural_crossing: { hour: 8.5, minDist: 5, maxDist: 7 },
  country_estate: { hour: 1.25, minDist: 5, maxDist: 7 },
  suburban_strip: { hour: 3.5, minDist: 6, maxDist: 7 },
  rural_highway: { hour: 10.75, minDist: 6, maxDist: 7 },
  countryside_lot: { hour: 6.5, minDist: 5, maxDist: 7 },
};

const landmarkCoords = {};
for (const [id, spec] of Object.entries(LANDMARKS)) {
  const c = pickByClock(cells, spec.hour, spec.minDist, spec.maxDist, used);
  if (!c) throw new Error(`No hex for ${id}`);
  used.add(axialKey(c));
  landmarkCoords[id] = c;
}

const markers = majorHubHexes.map((c) => worldMapAxialToPixel(c));
const prev = JSON.parse(readFileSync(canonPath, "utf8"));

const doc = {
  lockedAt: new Date().toISOString().slice(0, 10),
  note:
    "Z1 v5 locked: rasterAlign + major hubs on hex ring (bake cornerstone). Gov 0,0 fixed.",
  rasterAlign: prev.rasterAlign ?? z1CanonicalRasterAlign(),
  majorHubMarkers: markers.map((m) => ({
    x: Math.round(m.x * 100) / 100,
    y: Math.round(m.y * 100) / 100,
  })),
  majorHubHexes,
};

writeFileSync(canonPath, `${JSON.stringify(doc, null, 2)}\n`);

console.log("majorHubHexes", majorHubHexes);
console.log("landmarkCoords", landmarkCoords);

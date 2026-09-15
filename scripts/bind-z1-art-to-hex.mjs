/**
 * Detect six teal majors on pass-1 v5 bake → viewBox markers + nearest hex coords.
 * Gov (0,0) fixed. Writes src/assets/z1-layout-canonical.json majorHubMarkers.
 *
 * Run: npx tsx scripts/bind-z1-art-to-hex.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAP_GOV,
  MAP_RADIUS,
  axialKey,
  generateHexagonMap,
} from "../src/game/hexLayout.ts";
import {
  worldMapAxialToPixel,
  worldMapHexBounds,
} from "../src/game/mapWorld.ts";
import { z1CanonicalRasterAlign } from "../src/game/z1LayoutCanonical.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bakePath = resolve(
  __dirname,
  "../src/assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass1-v5.png",
);
const canonPath = resolve(__dirname, "../src/assets/z1-layout-canonical.json");

function applySvgTransform(x, y, bounds, align) {
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const w = bounds.width;
  const h = bounds.height;
  const rad = (align.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const s = align.scale;

  let px = x + align.offsetX;
  let py = y + align.offsetY;
  px -= w / 2;
  py -= h / 2;
  const sx = px * s;
  const sy = py * s;
  const rx = sx * cos - sy * sin;
  const ry = sx * sin + sy * cos;
  return { x: rx + cx, y: ry + cy };
}

function imageNormToViewBox(nx, ny, bounds, align) {
  const lx = bounds.minX + nx * bounds.width;
  const ly = bounds.minY + ny * bounds.height;
  return applySvgTransform(lx, ly, bounds, align);
}

function distSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function nearestHex(target, cells, used) {
  let best = null;
  let bestD = Infinity;
  for (const c of cells) {
    const k = axialKey(c);
    if (used.has(k)) continue;
    if (c.q === MAP_GOV.q && c.r === MAP_GOV.r) continue;
    const p = worldMapAxialToPixel(c);
    const d = distSq(p, target);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

async function detectTealCentroids(data, width, height) {
  const samples = [];
  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g < 100 || g < r + 25) continue;
      if (b < 80 || b < r) continue;
      if (g + b < r + 120) continue;
      if (r > 200 && g > 160) continue;
      samples.push({ x, y });
    }
  }

  const clusters = [];
  const mergeR = width * 0.06;
  for (const s of samples) {
    let cluster = clusters.find(
      (c) => Math.hypot(c.x - s.x, c.y - s.y) < mergeR,
    );
    if (!cluster) {
      cluster = { x: 0, y: 0, n: 0 };
      clusters.push(cluster);
    }
    cluster.x += s.x;
    cluster.y += s.y;
    cluster.n += 1;
  }

  const centers = clusters
    .filter((c) => c.n > 40)
    .map((c) => ({ x: c.x / c.n, y: c.y / c.n, weight: c.n }));

  const cx = width / 2;
  const cy = height / 2;
  return centers
    .filter((c) => Math.hypot(c.x - cx, c.y - cy) > width * 0.12)
    .sort((a, b) => {
      const aa = Math.atan2(a.x - cx, -(a.y - cy));
      const bb = Math.atan2(b.x - cx, -(b.y - cy));
      return aa - bb;
    })
    .slice(0, 6);
}

const sharp = (await import("sharp")).default;
const { data, info } = await sharp(bakePath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const centroids = await detectTealCentroids(data, info.width, info.height);
if (centroids.length < 6) {
  console.error(`Expected 6 teal hubs, found ${centroids.length}`);
  process.exit(1);
}

const bounds = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const align = z1CanonicalRasterAlign();
const markers = centroids.map((c) =>
  imageNormToViewBox(c.x / info.width, c.y / info.height, bounds, align),
);

const cells = generateHexagonMap(MAP_RADIUS);
const used = new Set();
const assignments = [];
for (const m of markers) {
  const coord = nearestHex(m, cells, used);
  if (!coord) break;
  used.add(axialKey(coord));
  assignments.push({ marker: m, coord });
}

const prev = JSON.parse(readFileSync(canonPath, "utf8"));
const doc = {
  ...prev,
  lockedAt: new Date().toISOString().slice(0, 10),
  note:
    "Z1 pass-1 v5 locked: rasterAlign + six majorHubMarkers from bake detection; hex coords in mapWorld/worldMapMajorHubs.",
  majorHubMarkers: markers.map((m) => ({
    x: Math.round(m.x * 100) / 100,
    y: Math.round(m.y * 100) / 100,
  })),
};

writeFileSync(canonPath, `${JSON.stringify(doc, null, 2)}\n`);

console.log("Gov pixel", worldMapAxialToPixel(MAP_GOV));
console.log("Markers + hex assignments:");
for (let i = 0; i < assignments.length; i += 1) {
  const { marker, coord } = assignments[i];
  const p = worldMapAxialToPixel(coord);
  console.log(
    `  ${i + 1}: marker (${marker.x.toFixed(1)}, ${marker.y.toFixed(1)}) → hex ${coord.q},${coord.r} pixel (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) err=${Math.hypot(p.x - marker.x, p.y - marker.y).toFixed(1)}`,
  );
}

console.log("\nSuggested landmark coords (JSON):");
console.log(JSON.stringify(assignments.map((a) => a.coord), null, 2));

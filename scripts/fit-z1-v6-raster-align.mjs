/**
 * Estimate Z1 v6 draft rasterAlign (scale + offset) from PNG vs engine greenbelt radius.
 * Run: npx tsx scripts/fit-z1-v6-raster-align.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  generateHexagonMap,
  MAP_RADIUS,
  MAP_GOV,
} from "../src/game/hexLayout.ts";
import {
  worldMapHexBounds,
  worldMapAxialToPixel,
  worldMapOuterGreenbeltRadiusPx,
  MAP_PRESENTATION_HEX_SCALE,
} from "../src/game/mapWorld.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imgPath = resolve(
  __dirname,
  "../src/assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass1-v6-draft.png",
);

const cells = generateHexagonMap(MAP_RADIUS);
const bounds = worldMapHexBounds(cells);
const beltR = worldMapOuterGreenbeltRadiusPx();
const gov = worldMapAxialToPixel(MAP_GOV);

const { data, info } = await sharp(imgPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels } = info;
const cx = w / 2;
const cy = h / 2;

function px(ix, iy) {
  const i = (iy * w + ix) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function forestScore(r, g, b) {
  return g - (r + b) * 0.45;
}

/** Forest ring outer edge — peak green along rays from image center. */
function forestRadiusPx() {
  const rays = 24;
  const radii = [];
  const rMin = Math.floor(Math.min(w, h) * 0.14);
  const rMax = Math.floor(Math.min(w, h) * 0.46);
  for (let a = 0; a < rays; a++) {
    const ang = (a / rays) * Math.PI * 2;
    let bestR = rMin;
    let bestScore = -Infinity;
    for (let r = rMin; r < rMax; r += 2) {
      const ix = Math.round(cx + Math.cos(ang) * r);
      const iy = Math.round(cy + Math.sin(ang) * r);
      if (ix < 1 || iy < 1 || ix >= w - 1 || iy >= h - 1) break;
      const [red, green, blue] = px(ix, iy);
      const score = forestScore(red, green, blue);
      if (score > bestScore) {
        bestScore = score;
        bestR = r;
      }
    }
    radii.push(bestR);
  }
  radii.sort((a, b) => a - b);
  return radii[Math.floor(radii.length / 2)];
}

/** Symmetric v6 bake — Gov is geometric center of frame. */
const govC = { x: cx, y: cy };

const forestR = forestRadiusPx();

/** Image pixel → viewBox if image stretched to bounds (preserveAspectRatio none). */
const sx = bounds.width / w;
const sy = bounds.height / h;
const govWorldX = bounds.minX + govC.x * sx;
const govWorldY = bounds.minY + govC.y * sy;
const forestWorldR = forestR * (sx + sy) / 2;

const offsetX = (gov.x - govWorldX) / MAP_PRESENTATION_HEX_SCALE;
const offsetY = (gov.y - govWorldY) / MAP_PRESENTATION_HEX_SCALE;
const scale = beltR / forestWorldR;

const result = {
  beltR,
  forestRpx: forestR,
  forestWorldR,
  govCentroidPx: govC,
  govWorldBeforeAlign: { x: govWorldX, y: govWorldY },
  rasterAlign: {
    offsetX: Number(offsetX.toFixed(2)),
    offsetY: Number(offsetY.toFixed(2)),
    scale: Number(scale.toFixed(4)),
    rotationDeg: 0,
  },
};

console.log(JSON.stringify(result, null, 2));

/**
 * Z1 pass-1 v6 — constraint map from live engine hex layout (presentation scale).
 * Dots = Gov + six major hub hexes from z1-layout-canonical.json.
 * Output: SVG + 4096px-wide PNG for image-gen reference (no text on bake-guide).
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateHexagonMap,
  MAP_RADIUS,
  MAP_GOV,
} from "../src/game/hexLayout.ts";
import {
  worldMapHexBounds,
  worldMapAxialToPixel,
  worldMapOuterGreenbeltRadiusPx,
} from "../src/game/mapWorld.ts";
import { z1CanonicalMajorHubHexes } from "../src/game/z1LayoutCanonical.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../src/assets/reference/zoom-levels");
const RENDER_WIDTH = 4096;

const cells = generateHexagonMap(MAP_RADIUS);
const hexBounds = worldMapHexBounds(cells);
const beltR = worldMapOuterGreenbeltRadiusPx();
const majorHexes = z1CanonicalMajorHubHexes();
const gov = worldMapAxialToPixel(MAP_GOV);
const majors = majorHexes.map((h, i) => ({
  slot: i + 1,
  ...worldMapAxialToPixel(h),
}));

const pad = 48;
const bounds = {
  minX: hexBounds.minX - pad,
  minY: hexBounds.minY - pad,
  width: hexBounds.width + pad * 2,
  height: hexBounds.height + pad * 2,
};

function norm(x, y) {
  return {
    nx: ((x - bounds.minX) / bounds.width).toFixed(4),
    ny: ((y - bounds.minY) / bounds.height).toFixed(4),
  };
}

function bakeGuideSvg({ numbered }) {
  const hubDots = majors
    .map((m) => {
      const r = numbered ? 28 : 12;
      const fill = m.slot === 1 ? "#e8c040" : "#149aaa";
      const num = numbered
        ? `<text x="${m.x}" y="${m.y + 8}" text-anchor="middle" fill="#fff" font-size="26" font-weight="bold" font-family="sans-serif">${m.slot}</text>`
        : "";
      return `<circle cx="${m.x}" cy="${m.y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="${numbered ? 4 : 2}"/>${num}`;
    })
    .join("\n  ");

  const govDot = `<circle cx="${gov.x}" cy="${gov.y}" r="${numbered ? 32 : 14}" fill="#e8a040" stroke="#1a1a1a" stroke-width="3"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
  width="${RENDER_WIDTH}" height="${Math.round(RENDER_WIDTH * (bounds.height / bounds.width))}">
  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="#1e2420"/>
  <circle cx="${gov.x}" cy="${gov.y}" r="${beltR}" fill="#2d4a32" opacity="0.85"/>
  <circle cx="${gov.x}" cy="${gov.y}" r="${beltR * 0.5}" fill="#4a6048" opacity="0.5"/>
  <circle cx="${gov.x}" cy="${gov.y}" r="${beltR}" fill="none" stroke="#6a9a62" stroke-width="2.5" opacity="0.55"/>
  ${govDot}
  ${hubDots}
</svg>`;
}

async function writePng(svg, baseName) {
  const svgPath = resolve(outDir, `${baseName}.svg`);
  writeFileSync(svgPath, svg);
  console.log("Wrote", svgPath);
  const sharp = (await import("sharp")).default;
  const pngPath = resolve(outDir, `${baseName}.png`);
  await sharp(svgPath).png().toFile(pngPath);
  console.log("Wrote", pngPath);
}

const layoutMeta = {
  version: "z1-pass1-v6-engine",
  bounds,
  beltRadiusPx: beltR,
  gov: { ...gov, ...norm(gov.x, gov.y) },
  majors: majors.map((m) => ({
    slot: m.slot,
    px: { x: m.x, y: m.y },
    normalized: norm(m.x, m.y),
  })),
};

writeFileSync(
  resolve(outDir, "world-map-z1-pass1-v6-engine-layout.json"),
  JSON.stringify(layoutMeta, null, 2),
);
console.log("Wrote layout JSON");

await writePng(
  bakeGuideSvg({ numbered: true }),
  "world-map-z1-pass1-v6-engine-pin-layout",
);
await writePng(bakeGuideSvg({ numbered: false }), "world-map-z1-pass1-v6-engine-bake-guide");

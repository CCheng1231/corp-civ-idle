/**
 * Pin layout for pass 1 v5 — canon markers in engine viewBox space.
 * - pin-layout.png — numbered (for you in IDE)
 * - pin-layout-bake-guide.png — dots only, NO text (image-gen constraint ref)
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z1CanonicalMajorHubMarkers } from "../src/game/z1LayoutCanonical.ts";
import {
  worldMapHexBounds,
  worldMapOuterGreenbeltRadiusPx,
  Z1_MAJOR_HUB_OUTSIDE_BELT_PX,
} from "../src/game/mapWorld.ts";
import { MAP_RADIUS, generateHexagonMap } from "../src/game/hexLayout.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../src/assets/reference/zoom-levels");

const hexBounds = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const markers = z1CanonicalMajorHubMarkers();
const pad = 56;
const bounds = {
  minX: Math.min(hexBounds.minX, ...markers.map((m) => m.x)) - pad,
  minY: Math.min(hexBounds.minY, ...markers.map((m) => m.y)) - pad,
  width:
    Math.max(
      hexBounds.minX + hexBounds.width,
      ...markers.map((m) => m.x),
    ) -
    Math.min(hexBounds.minX, ...markers.map((m) => m.x)) +
    pad * 2,
  height:
    Math.max(
      hexBounds.minY + hexBounds.height,
      ...markers.map((m) => m.y),
    ) -
    Math.min(hexBounds.minY, ...markers.map((m) => m.y)) +
    pad * 2,
};
const beltR = worldMapOuterGreenbeltRadiusPx();
const outsideR = beltR + Z1_MAJOR_HUB_OUTSIDE_BELT_PX;
const innerR = beltR * 0.52;

const BELT_HUB_INDEX = 3;

function hubZone(x, y, index) {
  if (index === BELT_HUB_INDEX) return "belt";
  const d = Math.hypot(x, y);
  if (d > beltR + 80) return "outside";
  return "invalid-inside";
}

function ringMarkup({ numbered, caption }) {
  const hubDots = markers
    .map((m, i) => {
      const z = hubZone(m.x, m.y, i);
      const fill = numbered
        ? z === "belt"
          ? "#e8c040"
          : z === "invalid-inside"
            ? "#ff4444"
            : "#149aaa"
        : "#149aaa";
      const r = numbered ? 36 : 14;
      const stroke = numbered ? 5 : 2;
      const num = numbered
        ? `<text x="${m.x}" y="${m.y + 10}" text-anchor="middle" fill="#fff" font-size="32" font-weight="bold" font-family="sans-serif">${i + 1}</text>`
        : "";
      return `<circle cx="${m.x}" cy="${m.y}" r="${r}" fill="${fill}" stroke="#fff" stroke-width="${stroke}"/>${num}`;
    })
    .join("\n  ");

  const captionBlock = caption
    ? `<text x="${bounds.minX + 40}" y="${bounds.minY + 56}" fill="#e8e8e8" font-size="30" font-family="sans-serif">${caption}</text>`
    : "";

  const govLabel = numbered
    ? `<text x="0" y="-42" text-anchor="middle" fill="#f0e0c0" font-size="36" font-family="sans-serif">Gov</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"
  width="1200" height="1056">
  <rect x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" fill="#1e2420"/>
  <circle cx="0" cy="0" r="${beltR}" fill="#2d4a32"/>
  <circle cx="0" cy="0" r="${innerR}" fill="#4a6048"/>
  <circle cx="0" cy="0" r="${beltR}" fill="none" stroke="#6a9a62" stroke-width="3" opacity="0.6"/>
  <circle cx="0" cy="0" r="${outsideR}" fill="none" stroke="#8ac080" stroke-width="2" stroke-dasharray="12 10" opacity="0.45"/>
  <circle cx="0" cy="0" r="28" fill="#e8a040" stroke="#1a1a1a" stroke-width="3"/>
  ${govLabel}
  ${hubDots}
  ${captionBlock}
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

await writePng(
  ringMarkup({
    numbered: true,
    caption:
      "Pass 1 v5 — ONLY #4 amber in belt (12h); all other teal outside dashed ring; red = bad pin",
  }),
  "world-map-z1-pass1-v5-pin-layout",
);

await writePng(ringMarkup({ numbered: false, caption: "" }), "world-map-z1-pass1-v5-pin-layout-bake-guide");

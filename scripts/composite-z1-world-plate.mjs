/**
 * Composite v5 center + rim into Z1 world plate PNGs (visual-only margin art).
 *
 *   npx tsx scripts/composite-z1-world-plate.mjs
 *   npx tsx scripts/composite-z1-world-plate.mjs --tier ship
 *
 * Outputs (under src/assets/reference/zoom-levels/):
 *   world-map-z1-hybrid-soft-world-plate.png      (production tier, in-game underlay)
 *   world-map-z1-hybrid-soft-world-extend-draft.png (draft tier, quick review)
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { generateHexagonMap, MAP_RADIUS } from "../src/game/hexLayout.ts";
import { worldMapHexBounds } from "../src/game/mapWorld.ts";
import { MAP_Z1_WORLD_PLATE_PAD } from "../src/game/worldMapZ1WorldPlate.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../src/assets/reference/zoom-levels");

const V5 = resolve(outDir, "world-map-z1-hybrid-soft-pass1-v5.png");
const RIM = resolve(outDir, "world-map-z1-outside-option-b-rim.png");

const TIERS = {
  draft: { masterW: 2048, outFile: "world-map-z1-hybrid-soft-world-extend-draft.png" },
  production: {
    masterW: 4096,
    outFile: "world-map-z1-hybrid-soft-world-plate.png",
  },
  ship: { masterW: 8240, outFile: "world-map-z1-hybrid-soft-world-plate.png" },
};

const tierArg = process.argv.find((a) => a.startsWith("--tier="));
const tierName = tierArg?.split("=")[1] ?? "production";
const tier = TIERS[tierName];
if (!tier) {
  console.error("Unknown --tier; use draft | production | ship");
  process.exit(1);
}

const cornerstone = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const pad = MAP_Z1_WORLD_PLATE_PAD;
const extW = cornerstone.width + pad * 2;
const extH = cornerstone.height + pad * 2;
const scale = tier.masterW / extW;
const masterW = tier.masterW;
const masterH = Math.round(extH * scale);
const padPx = Math.round(pad * scale);
const innerW = Math.round(cornerstone.width * scale);
const innerH = Math.round(cornerstone.height * scale);

const v5Inner = await sharp(V5)
  .resize(innerW, innerH, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();

/** Soft edge so rim shows through ~10% at the v5 boundary. */
const featherPx = Math.max(8, Math.round(Math.min(innerW, innerH) * 0.1));
const v5Feathered = await sharp(v5Inner)
  .ensureAlpha()
  .composite([
    {
      input: Buffer.from(
        `<svg width="${innerW}" height="${innerH}">
          <defs>
            <radialGradient id="g" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="white" stop-opacity="1"/>
              <stop offset="${Math.max(55, 100 - (featherPx / Math.min(innerW, innerH)) * 200)}%" stop-color="white" stop-opacity="1"/>
              <stop offset="100%" stop-color="white" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>`,
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toBuffer();

const rimBase = await sharp(RIM)
  .resize(masterW, masterH, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();

const plate = await sharp(rimBase)
  .composite([{ input: v5Feathered, left: padPx, top: padPx }])
  .png()
  .toBuffer();

const platePath = resolve(outDir, tier.outFile);
writeFileSync(platePath, plate);

console.log(
  JSON.stringify(
    {
      tier: tierName,
      cornerstone,
      extended: { width: extW, height: extH },
      masterPx: { width: masterW, height: masterH },
      innerPx: { width: innerW, height: innerH, left: padPx, top: padPx },
      outputs: [platePath],
    },
    null,
    2,
  ),
);

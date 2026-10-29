/**
 * Key + alpha-trim isometric landmark masters (Gov/commercial pipeline).
 * Usage: node scripts/key-map-landmark-bake.mjs --id <assetId>
 */
import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import { applyGreenScreenKey } from "./bake-green-key.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** assetId → { label, masterName, outBase } */
export const MAP_LANDMARK_BAKE_CATALOG = {
  major_hub_supertall: {
    label: "Major hub supertall",
    masterName: "major-hub-supertall-isometric-bake-master",
    outBase: "major-hub-supertall-isometric-bake",
  },
  office_tower_metro_central: {
    label: "Central Exchange Tower",
    masterName: "office-tower-metro-central-isometric-bake-master",
    outBase: "office-tower-metro-central-isometric-bake",
  },
  office_tower_suburban_park: {
    label: "Parkview Office Tower",
    masterName: "office-tower-suburban-park-isometric-bake-master",
    outBase: "office-tower-suburban-park-isometric-bake",
  },
  office_tower_rural_crossing: {
    label: "Crossroads Business Tower",
    masterName: "office-tower-rural-crossing-isometric-bake-master",
    outBase: "office-tower-rural-crossing-isometric-bake",
  },
  office_tower_country_estate: {
    label: "Hillside Corporate Tower",
    masterName: "office-tower-country-estate-isometric-bake-master",
    outBase: "office-tower-country-estate-isometric-bake",
  },
  player_hq_mine: {
    label: "Player HQ (yours)",
    masterName: "player-hq-mine-isometric-bake-master",
    outBase: "player-hq-mine-isometric-bake",
  },
  player_hq_peer: {
    label: "Player HQ (peer)",
    masterName: "player-hq-peer-isometric-bake-master",
    outBase: "player-hq-peer-isometric-bake",
  },
  branch_pad_compact: {
    label: "Branch pad · compact",
    masterName: "branch-pad-compact-isometric-bake-master",
    outBase: "branch-pad-compact-isometric-bake",
  },
  branch_pad_standard: {
    label: "Branch pad · standard",
    masterName: "branch-pad-standard-isometric-bake-master",
    outBase: "branch-pad-standard-isometric-bake",
  },
  branch_pad_campus: {
    label: "Branch pad · campus",
    masterName: "branch-pad-campus-isometric-bake-master",
    outBase: "branch-pad-campus-isometric-bake",
  },
};

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const assetId = argValue("--id");
const asset = assetId ? MAP_LANDMARK_BAKE_CATALOG[assetId] : null;
if (!asset) {
  console.error(
    "Pass --id",
    Object.keys(MAP_LANDMARK_BAKE_CATALOG).join(" | "),
  );
  process.exit(1);
}

const masterArg = argValue("--master");
const mapDir = join(root, "src/assets/map");
const refDir = join(root, "src/assets/reference");

function resolveMasterPath() {
  if (masterArg) return masterArg;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const p = join(mapDir, `${asset.masterName}${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

const input = resolveMasterPath();
if (!input || !existsSync(input)) {
  console.error(
    "Missing master. Pass --master <path> or place",
    `${asset.masterName}.png|jpg in src/assets/map/`,
  );
  process.exit(1);
}

const outputMap = join(mapDir, `${asset.outBase}.png`);
const outputMap2x = join(mapDir, `${asset.outBase}@2x.png`);
const outputRef = join(refDir, `${asset.outBase}.png`);

mkdirSync(mapDir, { recursive: true });
mkdirSync(refDir, { recursive: true });

const inputLower = input.toLowerCase();
const isPngMaster =
  inputLower.endsWith(".png") || inputLower.endsWith(".webp");

let pipeline = sharp(input).ensureAlpha();

if (!isPngMaster) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  applyGreenScreenKey(px);
  pipeline = sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

const keyed = await pipeline.png({ compressionLevel: 9 }).toBuffer();
const trimmed = await sharp(keyed).trim({ threshold: 14 }).png().toBuffer();
const meta = await sharp(trimmed).metadata();
const baseW = meta.width ?? 864;
const baseH = meta.height ?? 1152;

await sharp(trimmed).toFile(outputRef);

async function measureFootAnchorHeightRatio(buf) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width ?? 1;
  const h = info.height ?? 1;
  let maxSpan = 0;
  let maxRow = h - 1;
  for (let y = 0; y < h; y += 1) {
    let minX = w;
    let maxX = 0;
    let n = 0;
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > 60) {
        n += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    const span = n ? maxX - minX : 0;
    if (span > maxSpan) {
      maxSpan = span;
      maxRow = y;
    }
  }
  return {
    ratio: ((h - 1 - maxRow) / h).toFixed(3),
    heightWidth: ((baseH / baseW).toFixed(4)),
  };
}

const measured = await measureFootAnchorHeightRatio(trimmed);

if (isPngMaster && baseW >= 1728) {
  await sharp(trimmed).toFile(outputMap2x);
  await sharp(trimmed)
    .resize(Math.round(baseW / 2), Math.round(baseH / 2), {
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toFile(outputMap);
} else {
  await sharp(trimmed).toFile(outputMap);
  await sharp(trimmed)
    .resize(baseW * 2, baseH * 2, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9 })
    .toFile(outputMap2x);
}

console.log("asset:", assetId, asset.label);
console.log("source:", input);
console.log(
  "heightWidthRatio:",
  measured.heightWidth,
  "footAnchorHeightRatio:",
  measured.ratio,
);
console.log("wrote", outputMap, outputMap2x, outputRef, baseW, "x", baseH);

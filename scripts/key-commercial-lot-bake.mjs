import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, copyFileSync, mkdirSync } from "node:fs";
import { applyGreenScreenKey } from "./bake-green-key.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const LOTS = {
  suburban_strip: {
    label: "Suburban strip parcel",
    masterName: "commercial-suburban-strip-isometric-bake-master",
    outBase: "commercial-suburban-strip-isometric-bake",
  },
  rural_highway: {
    label: "Rural highway frontage",
    masterName: "commercial-rural-highway-isometric-bake-master",
    outBase: "commercial-rural-highway-isometric-bake",
  },
  countryside_lot: {
    label: "Countryside lot",
    masterName: "commercial-countryside-lot-isometric-bake-master",
    outBase: "commercial-countryside-lot-isometric-bake",
  },
};

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const lotId = argValue("--id") ?? "suburban_strip";
const lot = LOTS[lotId];
if (!lot) {
  console.error("Unknown --id", lotId, "expected one of:", Object.keys(LOTS).join(", "));
  process.exit(1);
}

const masterArg = argValue("--master");
const mapDir = join(root, "src/assets/map");
const refDir = join(root, "src/assets/reference");

function resolveMasterPath() {
  if (masterArg) return masterArg;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const p = join(mapDir, `${lot.masterName}${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

const input = resolveMasterPath();
if (!input || !existsSync(input)) {
  console.error(
    "Missing master. Pass --master <path> or place",
    `${lot.masterName}.png|jpg in src/assets/map/`,
  );
  process.exit(1);
}

const outputMap = join(mapDir, `${lot.outBase}.png`);
const outputMap2x = join(mapDir, `${lot.outBase}@2x.png`);
const outputRef = join(refDir, `${lot.outBase}.png`);

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
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
  return ((h - 1 - maxRow) / h).toFixed(3);
}

const footAnchorHeightRatio = await measureFootAnchorHeightRatio(trimmed);

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

console.log("lot:", lotId, lot.label);
console.log("source:", input);
console.log("footAnchorHeightRatio (paste into mapBakedLandmark.ts):", footAnchorHeightRatio);
console.log("wrote", outputMap, outputMap2x, outputRef, baseW, "x", baseH);

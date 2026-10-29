import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { applyGreenScreenKey } from "./bake-green-key.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return undefined;
  return process.argv[i + 1];
}

const masterArg = argValue("--master");
const defaultJpg = join(root, "src/assets/map/gov-capitol-isometric-bake.jpg");
const defaultMasterPng = join(
  root,
  "src/assets/map/gov-capitol-isometric-bake-master.png",
);
const defaultMasterJpg = join(
  root,
  "src/assets/map/gov-capitol-isometric-bake-master.jpg",
);

const input =
  masterArg ??
  (existsSync(defaultMasterPng)
    ? defaultMasterPng
    : existsSync(defaultMasterJpg)
      ? defaultMasterJpg
      : defaultJpg);

const outputMap = join(root, "src/assets/map/gov-capitol-isometric-bake.png");
const outputMap2x = join(root, "src/assets/map/gov-capitol-isometric-bake@2x.png");
const outputRef = join(
  root,
  "src/assets/reference/gov-capitol-isometric-bake.png",
);

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

console.log(
  "source:",
  input,
  isPngMaster ? "(alpha master)" : "(green-key JPEG)",
);
console.log(
  "wrote",
  outputMap,
  outputRef,
  outputMap2x,
  baseW,
  "x",
  baseH,
);

import sharp from "sharp";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const input = join(root, "src/assets/map/gov-capitol-isometric-bake.jpg");
const outputMap = join(root, "src/assets/map/gov-capitol-isometric-bake.png");
const outputRef = join(
  root,
  "src/assets/reference/gov-capitol-isometric-bake.png",
);

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = Buffer.from(data);
for (let i = 0; i < px.length; i += 4) {
  const r = px[i];
  const g = px[i + 1];
  const b = px[i + 2];
  // Green-screen key (tolerance for JPEG artifacts)
  if (g > 140 && g > r + 35 && g > b + 35) {
    px[i + 3] = 0;
  } else if (g > 100 && g > r + 20 && g > b + 20) {
    px[i + 3] = Math.min(px[i + 3], Math.max(0, 255 - (g - 100) * 4));
  }
}

const png = sharp(px, {
  raw: { width: info.width, height: info.height, channels: 4 },
}).png({ compressionLevel: 9 });

await png.toFile(outputMap);
await png.clone().toFile(outputRef);

console.log("wrote", outputMap, outputRef, info.width, "x", info.height);

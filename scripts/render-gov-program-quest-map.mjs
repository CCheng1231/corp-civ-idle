/**
 * Render docs/gov-program-quest-map.svg → .jpg (and .png)
 * Run: node scripts/render-gov-program-quest-map.mjs
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "docs", "gov-program-quest-map.svg");
const svg = readFileSync(svgPath);

const pngPath = join(root, "docs", "gov-program-quest-map.png");
const jpgPath = join(root, "docs", "gov-program-quest-map.jpg");

await sharp(svg, { density: 144 })
  .png()
  .toFile(pngPath);

await sharp(svg, { density: 144 })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(jpgPath);

console.log("Wrote:", jpgPath);
console.log("Wrote:", pngPath);

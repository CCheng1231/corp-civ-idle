/**
 * Copy Pass 2 power-research JPGs from Cursor assets into review folders.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cursorAssetsDir =
  "C:/Users/T/.cursor/projects/d-OneDrive-Documents-GitHub-corp-civ-idle/assets";

const bannersDir = join(
  root,
  "docs/structure-category-review/images/power-research/pass2/banners",
);
const structuresDir = join(
  root,
  "docs/structure-category-review/images/power-research/pass2/structures",
);

mkdirSync(bannersDir, { recursive: true });
mkdirSync(structuresDir, { recursive: true });

const STRUCTURE_SLUGS = ["power-panel", "electricity-generator", "dept-rnd"];

const files = [];
for (let v = 1; v <= 4; v++) {
  files.push({ name: `power-research-banner-pass2-v${v}.jpg`, dir: bannersDir });
  for (const slug of STRUCTURE_SLUGS) {
    files.push({
      name: `power-research-${slug}-pass2-v${v}.jpg`,
      dir: structuresDir,
    });
  }
}

let copied = 0;
let missing = 0;
for (const { name, dir } of files) {
  const src = join(cursorAssetsDir, name);
  const dest = join(dir, name);
  if (!existsSync(src)) {
    console.warn(`[skip missing] ${name}`);
    missing++;
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[ok] ${name}`);
  copied++;
}

console.log(`Done: ${copied} copied, ${missing} missing (expected up to ${files.length}).`);

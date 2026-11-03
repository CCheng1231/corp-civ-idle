/**
 * Copy Office Expansion pass2 JPGs from Cursor generate-image assets into review folder.
 * Run after GenerateImage: departments-office-expansion-pass2-v1.jpg … v4.jpg
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cursorAssetsDir =
  "C:/Users/T/.cursor/projects/d-OneDrive-Documents-GitHub-corp-civ-idle/assets";
const destDir = join(
  root,
  "docs/structure-category-review/images/departments/pass2/structures",
);

mkdirSync(destDir, { recursive: true });

let copied = 0;
for (let v = 1; v <= 4; v++) {
  const name = `departments-office-expansion-pass2-v${v}.jpg`;
  const src = join(cursorAssetsDir, name);
  const dest = join(destDir, name);
  if (!existsSync(src)) {
    console.warn(`[skip missing] ${name}`);
    continue;
  }
  copyFileSync(src, dest);
  console.log(`[ok] ${name}`);
  copied++;
}
console.log(`Done: ${copied}/4 copied.`);

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cursorAssetsDir =
  "C:/Users/T/.cursor/projects/d-OneDrive-Documents-GitHub-corp-civ-idle/assets";
const bannersDir = join(root, "docs/research-category-review/images/payouts/pass2/banners");
const projectsDir = join(root, "docs/research-category-review/images/payouts/pass2/projects");
mkdirSync(bannersDir, { recursive: true });
mkdirSync(projectsDir, { recursive: true });

for (let v = 1; v <= 4; v++) {
  for (const [name, dir] of [
    [`research-payouts-banner-pass2-v${v}.jpg`, bannersDir],
    [`research-bid-modeling-pass2-v${v}.jpg`, projectsDir],
  ]) {
    const src = join(cursorAssetsDir, name);
    if (!existsSync(src)) {
      console.warn("[skip]", name);
      continue;
    }
    copyFileSync(src, join(dir, name));
    console.log("[ok]", name);
  }
}

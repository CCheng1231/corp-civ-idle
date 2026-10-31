import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cursorAssetsDir =
  "C:/Users/T/.cursor/projects/d-OneDrive-Documents-GitHub-corp-civ-idle/assets";
const bannersDir = join(
  root,
  "docs/research-category-review/images/resources/pass2/banners",
);
const projectsDir = join(
  root,
  "docs/research-category-review/images/resources/pass2/projects",
);
mkdirSync(bannersDir, { recursive: true });
mkdirSync(projectsDir, { recursive: true });

const slugs = [
  "eff-manuals-cash",
  "eff-manuals-sup",
  "eff-manuals-con",
  "eff-manuals-mood",
  "eff-manuals-rep",
  "eff-manuals-grep",
  "planning-ahead",
];

const files = [];
for (let v = 1; v <= 4; v++) {
  files.push({ name: `research-resources-banner-pass2-v${v}.jpg`, dir: bannersDir });
  for (const slug of slugs) {
    files.push({ name: `research-${slug}-pass2-v${v}.jpg`, dir: projectsDir });
  }
}

let copied = 0;
let missing = 0;
for (const { name, dir } of files) {
  const src = join(cursorAssetsDir, name);
  if (!existsSync(src)) {
    console.warn("[skip]", name);
    missing++;
    continue;
  }
  copyFileSync(src, join(dir, name));
  console.log("[ok]", name);
  copied++;
}
console.log(`Done: ${copied} copied, ${missing} missing (expected ${files.length}).`);

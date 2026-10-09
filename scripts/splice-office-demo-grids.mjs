import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(
  root,
  "src/assets/reference/hq-tower-solarpunk-demos.html",
);
const fragPath = path.join(
  root,
  "src/assets/reference/_office-grid-cards.fragment.html",
);

let s = fs.readFileSync(htmlPath, "utf8");
const a = s.indexOf("<h2>Central Exchange · metropolis</h2>");
const aStart = s.lastIndexOf("<article", a);
const b = s.indexOf("    </main>", aStart);
if (aStart < 0 || b < 0) {
  throw new Error("splice markers not found");
}
const ins = fs.readFileSync(fragPath, "utf8");
fs.writeFileSync(htmlPath, s.slice(0, aStart) + ins + "\n" + s.slice(b));
console.log("spliced office section", b - a, "chars removed");

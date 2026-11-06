/**
 * Embed docs/gov-program-quest-map.jpg on sheet "Gov Program Map".
 * Run after render-gov-program-quest-map.mjs. Close workbook if EBUSY.
 *
 *   node scripts/render-gov-program-quest-map.mjs
 *   node scripts/embed-gov-program-quest-map-workbook.mjs
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const jpgPath = join(root, "docs", "gov-program-quest-map.jpg");
const workbookPath = resolveWorkbookPath();
const SHEET = "Gov Program Map";
const DISPLAY_WIDTH_PX = 920;

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}
if (!existsSync(jpgPath)) {
  console.error("Quest map JPG missing — run: node scripts/render-gov-program-quest-map.mjs");
  process.exit(1);
}

const meta = await sharp(jpgPath).metadata();
const w = meta.width ?? 1;
const h = meta.height ?? 1;
const displayHeight = Math.round((DISPLAY_WIDTH_PX * h) / w);

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(workbookPath);

const existing = wb.getWorksheet(SHEET);
if (existing) {
  wb.removeWorksheet(existing.id);
}
const ws = wb.addWorksheet(SHEET);

ws.getCell("A1").value = "Regional Growth Program — quest flow (Growth + Executive sheets; fork at 10 hires).";
ws.getCell("A2").value =
  "Regenerate: node scripts/render-gov-program-quest-map.mjs && node scripts/embed-gov-program-quest-map-workbook.mjs";
ws.getRow(1).font = { bold: true, size: 12 };
ws.getColumn(1).width = 120;

const imageId = wb.addImage({
  filename: jpgPath,
  extension: "jpeg",
});
ws.addImage(imageId, {
  tl: { col: 0, row: 3 },
  ext: { width: DISPLAY_WIDTH_PX, height: displayHeight },
});

await wb.xlsx.writeFile(workbookPath);
console.log(`Embedded quest map on "${SHEET}" → ${workbookPath}`);

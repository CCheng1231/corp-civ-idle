/**
 * Gov Program Map sheet text only.
 * Do not embed the JPG inside the xlsx — ExcelJS rewrites the whole workbook
 * into a package Excel reports as corrupt.
 *
 * Picture to copy: docs/gov-program-quest-map.jpg
 * Run: node scripts/embed-gov-program-quest-map-workbook.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const SHEET = "Gov Program Map";

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
if (!wb.Sheets[SHEET]) {
  wb.SheetNames.push(SHEET);
  wb.Sheets[SHEET] = XLSX.utils.aoa_to_sheet([]);
}
const ws = wb.Sheets[SHEET];
ws.A1 = {
  t: "s",
  v: "Regional Growth Program — quest flow. The picture is a separate file so Excel can open this workbook.",
};
ws.A2 = {
  t: "s",
  v: "Open and copy the image from: docs/gov-program-quest-map.jpg",
};
ws.A3 = { t: "s", v: "PNG: docs/gov-program-quest-map.png" };
wb.Sheets[SHEET] = ws;
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(
  `Updated "${SHEET}" text only (no embedded image) → ${workbookPath}`,
);

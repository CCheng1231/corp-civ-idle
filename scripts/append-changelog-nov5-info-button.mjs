/**
 * Appends 11/5/2026 changelog — Info button matches Section row height.
 * Uses ExcelJS so the Gov Program Map image stays embedded.
 * Run: node scripts/append-changelog-nov5-info-button.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { existsSync } from "node:fs";
import ExcelJS from "exceljs";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();
const MARKER = "Info button matches Section dropdown row height";

const NEW_ROWS = [
  [
    "11/5/2026",
    "SUMMARY — Hub Info buttons (Structure, Recruit, Research, Gov't Prog, World map) are one row tall, matching the Section dropdown. Gov't Prog header uses the same frozen Info + Section/Office band as the Structure tab.",
  ],
  [
    "11/5/2026",
    `Cursor AI: GovernmentProgramView, 05-hub-tabs.css, 09-world-map-ground.css — ${MARKER}.`,
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(workbookPath);
const ws = wb.getWorksheet("ChangeLog");
if (!ws) {
  console.error("ChangeLog sheet missing");
  process.exit(1);
}

let already = false;
ws.eachRow((row) => {
  const text = String(row.getCell(2).value ?? "");
  if (text.includes(MARKER)) already = true;
});
if (already) {
  console.log("11/5/2026 Info button changelog already present — skipping.");
  process.exit(0);
}

for (const [date, summary] of NEW_ROWS) {
  ws.addRow([date, summary]);
}

await wb.xlsx.writeFile(workbookPath);
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

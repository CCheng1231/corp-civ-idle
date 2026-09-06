/**
 * Adds Report line column to Secretary Stat tab (column E).
 * Run: node scripts/patch-secretary-report-lines.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const REPORT_LINES_BY_CODE = {
  Secretary_01:
    "Good morning, Director. I've cleared your morning brief and the floor is running at pace—two contracts need your sign-off when you're ready.",
  Secretary_02:
    "Director, I tightened today's timelines and protected your afternoon block. Say the word if you want me to pull a task force off the board.",
  Secretary_03:
    "Director, recruiting quotes came in under forecast. I held the vendors to our numbers—approve the roster when you want hires moving.",
  Secretary_04:
    "Director, I can have the next cohort on-site Monday if you approve. I've already cut the waiting periods on our side.",
  Secretary_05:
    "Director, task-force routes are cleaner today. Nobody stays on the road longer than they need to—I kept the board moving.",
};

const wb = XLSX.read(readFileSync(workbookPath));
const sheet = wb.Sheets["Secretary Stat"];
if (!sheet) {
  console.error("Missing Secretary Stat sheet");
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
const header = rows[0] ?? [];
if (String(header[4] ?? "").trim() !== "Report line") {
  header[4] = "Report line";
  rows[0] = header;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const code = String(row[0] ?? "").trim();
  if (!code || !REPORT_LINES_BY_CODE[code]) continue;
  row[4] = REPORT_LINES_BY_CODE[code];
  rows[i] = row;
}

wb.Sheets["Secretary Stat"] = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Patched Report line column → ${workbookPath}`);

/**
 * Appends 8/4/2026 changelog rows (structure card layout + resource bar tooltips).
 * Run: node scripts/append-changelog-aug4-structure-resource-ui.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/4/2026",
    "SUMMARY (for other devs) — Structure tab polish + resource bar tooltips. Max level on its own line (Max: N); equal-height cards per grid row with Upgrade/Sell pinned to bottom (fixes Social Media preview box pushing buttons down). Top-bar resource chips: stable CSS hover tooltip (no flash on tick refresh) with cap line + rate breakdown (structures per office/site bonus, research %, staff passives).",
  ],
  [
    "8/4/2026",
    "Cursor AI: OfficeStructurePanel — structure-level-meta header (Lv X → Y + Max: N on separate line); structure-card-actions footer with margin-top auto for row-aligned buttons.",
  ],
  [
    "",
    "Cursor AI: ResourceBar — replaced native title tooltips with resource-chip-tip hover panel; resourceRateBreakdown.ts mirrors recomputeDerivedStats for per-source +/hr lines.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, {
  header: 1,
  defval: "",
});

const already = rows.some((r) =>
  String(r[1] ?? "").includes("resourceRateBreakdown.ts"),
);
if (already) {
  console.log(
    "8/4/2026 structure/resource UI changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

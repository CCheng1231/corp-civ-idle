/**
 * Optional dev sync: reference xlsx → committed src/game balance TS.
 * Game build does not run this script.
 *
 * Usage:
 *   node scripts/import-balance-from-workbook.mjs
 *   node scripts/import-balance-from-workbook.mjs --workbook "path/to/Corp Idle Working.xlsx"
 *   BALANCE_WORKBOOK_PATH=... node scripts/import-balance-from-workbook.mjs
 */
import { resolveBalanceWorkbookFromArgs } from "./lib/resolve-balance-workbook.mjs";
import { importStructureBalanceFromWorkbook } from "./build-structure-balance.mjs";
import { importResearchBalanceFromWorkbook } from "./build-research-data.mjs";
import { importJobBalanceFromWorkbook } from "./build-job-data.mjs";

const workbookPath = resolveBalanceWorkbookFromArgs();
if (!workbookPath) {
  console.error(
    "No reference workbook found. Pass --workbook or set BALANCE_WORKBOOK_PATH.",
  );
  console.error("Expected: Corp Idle Working.xlsx (Structure cost and rate, Research Cost, Job Hub tabs).");
  process.exit(1);
}

console.log("Importing balance from reference workbook (not used at runtime):");
console.log(workbookPath);

const structure = importStructureBalanceFromWorkbook(workbookPath);
console.log(`Structures: ${structure.costSheetName} → structureBalanceData.ts`);

const research = importResearchBalanceFromWorkbook(workbookPath);
console.log(`Research: ${research.count} nodes → researchData.ts`);

const jobs = importJobBalanceFromWorkbook(workbookPath);
console.log(`Jobs: ${jobs.sheetName}, ${jobs.count} postings → jobHubData.ts`);

console.log("Done. Optional milestone pass: node scripts/apply-balance-tuning.mjs");
console.log("Then: node scripts/balance-report.mjs — commit src/game/*Data.ts changes.");

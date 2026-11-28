/**
 * Adds Secretary Skills sheet (one row per skill node per secretary).
 * Run: node scripts/patch-secretary-skills-sheet.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const HEADERS = [
  "secretary_id",
  "tree",
  "node_id",
  "label",
  "pct_per_rank",
  "max_rank",
  "requires",
  "gate_rank",
  "column",
  "effect_kind",
];

/** MVP: identical trees for all five secretaries (edit per row in Excel later). */
const BASE_NODES = [
  ["chief", "chief_cash_supply", "Cash & supply", 0.01, 3, "", 1, "root", "officeProduction"],
  ["chief", "chief_build_time", "Build speed", -0.02, 3, "chief_cash_supply", 1, "left", "structureBuildTime"],
  ["chief", "chief_structure_cost", "Structure cash", -0.01, 3, "chief_build_time", 2, "left", "structureBuildCost"],
  ["chief", "chief_research_time", "Research speed", -0.02, 3, "chief_cash_supply", 1, "right", "researchBuildTime"],
  ["chief", "chief_research_cost", "Research cash", -0.01, 3, "chief_research_time", 2, "right", "researchBuildCost"],
  ["teamLead", "lead_work", "On-site work", -0.02, 3, "", 1, "root", "jobWorkTime"],
  ["teamLead", "lead_travel", "Travel", -0.02, 3, "lead_work", 1, "left", "travelTime"],
  ["teamLead", "lead_field_supply", "Field supply", -0.02, 3, "lead_travel", 2, "left", "jobSupplyCost"],
  ["teamLead", "lead_payout", "Payout", 0.02, 3, "lead_work", 1, "right", "jobIncome"],
  ["teamLead", "lead_unit_hours", "Unit hours", 0.02, 3, "lead_payout", 2, "right", "jobUnitHours"],
  ["onSite", "onsite_posted_office", "Posted office", 0.01, 3, "", 1, "root", "onSiteReputation"],
  ["onSite", "onsite_recruit_time", "Hire time", -0.02, 3, "onsite_posted_office", 1, "left", "onSiteRecruitTime"],
  ["onSite", "onsite_recruit_cost", "Hire cost", -0.01, 3, "onsite_recruit_time", 2, "left", "onSiteRecruitCost"],
  ["onSite", "onsite_structure_time", "Build time", -0.02, 3, "onsite_posted_office", 1, "right", "onSiteStructureBuildTime"],
  ["onSite", "onsite_structure_cost", "Build cost", -0.01, 3, "onsite_structure_time", 2, "right", "onSiteStructureBuildCost"],
];

const SECRETARY_IDS = [
  "secretary_01",
  "secretary_02",
  "secretary_03",
  "secretary_04",
  "secretary_05",
];

const HEADER_GUIDE = [
  [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Edit rows per secretary. pct is decimal fraction (0.01 = +1%).",
  ],
];

function buildRows() {
  const rows = [HEADERS, ...HEADER_GUIDE];
  for (const secretaryId of SECRETARY_IDS) {
    for (const node of BASE_NODES) {
      rows.push([secretaryId, ...node]);
    }
  }
  return rows;
}

const wb = XLSX.read(readFileSync(workbookPath));
if (wb.Sheets["Secretary Skills"]) {
  console.log("Secretary Skills sheet already exists — skipping body replace (delete sheet to regenerate).");
} else {
  const rows = buildRows();
  wb.Sheets["Secretary Skills"] = XLSX.utils.aoa_to_sheet(rows);
  wb.SheetNames.push("Secretary Skills");
  console.log(`Added Secretary Skills (${rows.length - 1} data rows).`);
}

XLSX.writeFile(wb, workbookPath);
console.log(`Updated ${workbookPath}`);
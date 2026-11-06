/**
 * Structure tab reorg + tier-1 SUP tuning in Corp Idle Working.xlsx
 * Run: node scripts/patch-structure-reorg-nov5.mjs
 * Close Excel first if EBUSY.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const RENAME = {
  "Office Vault": "Department of Finance",
  "Storage Room": "Department of Logistics",
  "Department of B2B": "Outreach Program",
};

const BUILD_TAB = {
  "Office desk": "Essentials",
  "Office supply": "Essentials",
  "Outreach Program": "Essentials",
  "Department of B2B": "Essentials",
  "Break room": "Essentials",
  "Social Media": "Essentials",
  "Video production studio": "Essentials",
  "Press Room": "Essentials",
  "Office Expansion": "Departments",
  "Department of Finance": "Departments",
  "Office Vault": "Departments",
  "Department of Logistics": "Departments",
  "Storage Room": "Departments",
  "Company Statue": "Departments",
  "Department of R&D": "Power & research",
  "Electrical Panel": "Power & research",
  "Electricity Generator": "Power & research",
  "Recruitment Desk (RD)": "Recruitment",
  "Recruitment Desk": "Recruitment",
  "MIT (Management in training) room": "Recruitment",
};

const COST_SHEET = "Structure Cost and rate";

function patchStructureSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (!String(rows[10]?.[1]).includes("Structure")) {
    console.warn("Structure sheet header row unexpected — skipping category column");
    return ws;
  }
  rows[10][8] = "Build tab category";
  for (let i = 11; i < rows.length; i++) {
    const name = String(rows[i][1] ?? "").trim();
    if (!name) continue;
    const renamed = RENAME[name] ?? name;
    if (RENAME[name]) rows[i][1] = renamed;
    const tab = BUILD_TAB[renamed] ?? BUILD_TAB[name];
    if (tab) rows[i][8] = tab;
    if (renamed === "Social Media") {
      rows[i][2] = "Resources generator (ReGen)";
    }
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function patchCostSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r?.[0]) continue;
    const name = String(r[0]).trim();
    if (RENAME[name]) r[0] = RENAME[name];
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function patchOfficeConcept(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i][0] ?? "").trim();
    if (RENAME[name]) rows[i][0] = RENAME[name];
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function scaleTier1SupInRecruitment(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  for (let i = 0; i < rows.length; i++) {
    const tier = Number(rows[i][3]);
    if (tier !== 1) continue;
    const cost = String(rows[i][2] ?? "");
    if (!cost) continue;
    const next = cost.replace(
      /([\d,.]+)\s*sup/gi,
      (_, n) => `${Math.max(1, Math.floor(parseFloat(n.replace(/,/g, "")) * 0.1))} sup`,
    );
    if (next !== cost) rows[i][2] = next;
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });

if (wb.Sheets.Structure) {
  wb.Sheets.Structure = patchStructureSheet(wb.Sheets.Structure);
}
if (wb.Sheets[COST_SHEET]) {
  wb.Sheets[COST_SHEET] = patchCostSheet(wb.Sheets[COST_SHEET]);
} else {
  console.warn(`Missing sheet "${COST_SHEET}"`);
}
if (wb.Sheets["Office Concept"]) {
  wb.Sheets["Office Concept"] = patchOfficeConcept(wb.Sheets["Office Concept"]);
}
if (wb.Sheets.Recruitment) {
  wb.Sheets.Recruitment = scaleTier1SupInRecruitment(wb.Sheets.Recruitment);
}

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Patched ${workbookPath}`);

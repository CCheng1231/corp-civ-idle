/**
 * Reads "Structure Cost and rate" (column C = Cost - Time per level),
 * syncs src/game/structureBalanceData.ts, adds engine mirror tabs.
 *
 * Run: node scripts/build-structure-balance.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

import { resolveWorkbookPath, WORKBOOK_CANDIDATES } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();

const outTs = join(__dirname, "..", "src", "game", "structureBalanceData.ts");
const COST_SHEET_CANDIDATES = [
  "Structure Cost and rate",
  "Structure Cost and passive rate",
];
const ENGINE_TIMES_SHEET = "Structure Build Times (engine)";

const NAME_TO_ID = {
  "Office desk": "office_desk",
  "Office Vault": "bank_account",
  "Bank account": "bank_account",
  "Office supply": "office_supply",
  "Storage Room": "storage_room",
  "Department of B2B": "dept_b2b",
  "Break room": "break_room",
  "Social Media": "social_media",
  "Office Expansion": "office_expansion",
  "Electrical Panel": "power_panel",
  "Power Panel": "power_panel",
  "Department of R&D": "dept_rnd",
  "Recruitment Desk (RD)": "recruitment_desk",
  "Recruitment Desk": "recruitment_desk",
};

const ID_TO_NAME = {
  office_desk: "Office desk",
  bank_account: "Office Vault",
  office_supply: "Office supply",
  storage_room: "Storage Room",
  dept_b2b: "Department of B2B",
  break_room: "Break room",
  social_media: "Social Media",
  office_expansion: "Office Expansion",
  power_panel: "Electrical Panel",
  dept_rnd: "Department of R&D",
  recruitment_desk: "Recruitment Desk (RD)",
};

const STRUCTURE_ORDER = [
  "office_desk",
  "bank_account",
  "office_supply",
  "storage_room",
  "dept_b2b",
  "break_room",
  "social_media",
  "office_expansion",
  "power_panel",
  "dept_rnd",
  "recruitment_desk",
];

/** Correct generation/holding totals when sheet copied power-panel effect column by mistake. */
const EFFECT_COLUMN_FIXES = {
  "Department of B2B": { header: "CON /hr", l1: 15, scale: 1.25 },
  "Break room": { header: "Mood /hr", l1: 25, scale: 1.25 },
  "Social Media": { header: "CON /hr", l1: 8, scale: 1.25 },
};

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function excelTimeToBuildHours(excelDayFraction) {
  return excelDayFraction * 24;
}

function excelTimeToSeconds(excelDayFraction) {
  return excelDayFraction * 86400;
}

function findCostSheet(wb) {
  return COST_SHEET_CANDIDATES.find((name) => wb.SheetNames.includes(name)) ?? null;
}

/** Patch wrong effect headers/values in the design sheet before parse. */
function fixEffectColumnsInSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  let currentName = null;
  let fixSpec = null;
  let levelIndex = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    if (r[0] && r[1] === "Level" && String(r[2]).includes("Cost")) {
      currentName = r[0];
      fixSpec = EFFECT_COLUMN_FIXES[currentName] ?? null;
      if (fixSpec) {
        r[16] = fixSpec.header;
      }
      levelIndex = 0;
      continue;
    }

    if (r[0] && NAME_TO_ID[r[0]] && num(r[1]) === 1) {
      currentName = r[0];
      fixSpec = EFFECT_COLUMN_FIXES[currentName] ?? null;
      levelIndex = 0;
    }

    const level = num(r[1]);
    if (!fixSpec || level < 1 || level > 20) continue;
    if (currentName && r[0] && r[0] !== currentName) continue;

    const effect = fixSpec.l1 * fixSpec.scale ** (level - 1);
    r[16] = Math.round(effect * 10000) / 10000;
    if (fixSpec.scale !== 1) {
      r[17] = fixSpec.scale;
    }
    levelIndex += 1;
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

function parseBlocks(rows) {
  const blocks = {};
  let currentId = null;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    if (r[1] === "Level" && String(r[2]).includes("Cost") && r[0]) {
      currentId = NAME_TO_ID[r[0]] ?? null;
      continue;
    }

    if (r[0] && num(r[1]) === 1 && NAME_TO_ID[r[0]]) {
      currentId = NAME_TO_ID[r[0]];
    }

    const level = num(r[1]);
    if (!currentId || level < 1 || level > 20) continue;

    if (!blocks[currentId]) blocks[currentId] = [];

    const excelTime = num(r[2]);
    blocks[currentId].push({
      level,
      excelTime,
      buildTimeHours: excelTimeToBuildHours(excelTime),
      timeScale: num(r[3]),
      cash: num(r[4]),
      cashScale: r[5],
      supply: num(r[6]),
      supplyScale: r[7],
      connection: num(r[8]),
      reputation: num(r[10]),
      govReputation: num(r[12]),
      electricity: num(r[14]),
      effect: num(r[16]),
      effectScale: r[17],
    });
  }

  for (const id of Object.keys(blocks)) {
    blocks[id].sort((a, b) => a.level - b.level);
  }
  return blocks;
}

function toEngineRow(r) {
  return {
    level: r.level,
    buildTimeHours: r.buildTimeHours,
    cash: r.cash,
    supply: r.supply,
    connection: r.connection,
    reputation: r.reputation,
    govReputation: r.govReputation,
    electricity: r.electricity,
    effect: r.effect,
  };
}

const EFFECT_KIND = {
  office_desk: "cash_per_hour",
  bank_account: "cash_holding",
  office_supply: "supply_per_hour",
  storage_room: "supply_holding",
  dept_b2b: "connection_per_hour",
  break_room: "mood_per_hour",
  social_media: "connection_per_hour",
  office_expansion: "office_space_bonus",
  power_panel: "power_capacity_bonus",
  dept_rnd: "none",
  recruitment_desk: "none",
};

function writeTs(tables) {
  const engineTables = {};
  for (const id of STRUCTURE_ORDER) {
    engineTables[id] = (tables[id] ?? []).map(toEngineRow);
  }

  const body = `/** Auto-generated by scripts/build-structure-balance.mjs — do not edit. */
/** Build duration: column C is Excel time (day fraction); buildTimeHours = C × 24 (real-time hours). */

import type { StructureId } from "./types";

export type StructureEffectKind =
  | "cash_per_hour"
  | "supply_per_hour"
  | "connection_per_hour"
  | "mood_per_hour"
  | "cash_holding"
  | "supply_holding"
  | "office_space_bonus"
  | "power_capacity_bonus"
  | "none";

export interface StructureLevelBalanceRow {
  level: number;
  buildTimeHours: number;
  cash: number;
  supply: number;
  connection: number;
  reputation: number;
  govReputation: number;
  electricity: number;
  effect: number;
}

export const STRUCTURE_EFFECT_KIND: Record<StructureId, StructureEffectKind> = ${JSON.stringify(EFFECT_KIND, null, 2)};

export const STRUCTURE_BALANCE_TABLES: Record<
  StructureId,
  StructureLevelBalanceRow[]
> = ${JSON.stringify(engineTables, null, 2)};
`;
  writeFileSync(outTs, body, "utf8");
}

function saveWorkbook(wb) {
  try {
    writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    return workbookPath;
  } catch (err) {
    if (err?.code !== "EBUSY" && err?.code !== "EPERM") throw err;
    const alt = join(__dirname, "..", "Corp-Civ-Balance-engine-sync.xlsx");
    writeFileSync(alt, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    console.warn(`Workbook locked; wrote engine tabs to ${alt}`);
    return alt;
  }
}

function buildEngineTimesSheetAoa(tables) {
  const aoa = [
    ["Structure Build Times (engine) — synced from column C, Cost - Time"],
    ["Column C: real seconds = C × 86,400; buildTimeHours = C × 24."],
    [],
    [
      "Structure",
      "Level",
      "Cost - Time (Excel)",
      "Real seconds",
      "Build hours",
      "Cash",
      "SUP",
      "CON",
      "Electricity",
      "Effect (total at level)",
    ],
  ];

  for (const id of STRUCTURE_ORDER) {
    const name = ID_TO_NAME[id] ?? id;
    for (const r of tables[id] ?? []) {
      aoa.push([
        r.level === 1 ? name : "",
        r.level,
        r.excelTime ?? (r.buildTimeHours > 0 ? r.buildTimeHours / 24 : 0),
        excelTimeToSeconds(r.excelTime ?? r.buildTimeHours / 24),
        r.buildTimeHours,
        r.cash,
        r.supply,
        r.connection,
        r.electricity,
        r.effect,
      ]);
    }
    aoa.push([]);
  }
  return aoa;
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const costSheetName = findCostSheet(wb);
if (!costSheetName) {
  console.error("Missing cost sheet. Expected one of:", COST_SHEET_CANDIDATES);
  process.exit(1);
}

wb.Sheets[costSheetName] = fixEffectColumnsInSheet(wb.Sheets[costSheetName]);

const costRows = XLSX.utils.sheet_to_json(wb.Sheets[costSheetName], {
  header: 1,
  defval: "",
});

const tables = parseBlocks(costRows);
const missing = STRUCTURE_ORDER.filter((id) => !tables[id]?.length);
if (missing.length) {
  console.error("Missing structure blocks in sheet:", missing.join(", "));
  process.exit(1);
}

writeTs(tables);

wb.Sheets[ENGINE_TIMES_SHEET] = XLSX.utils.aoa_to_sheet(
  buildEngineTimesSheetAoa(tables),
);
if (!wb.SheetNames.includes(ENGINE_TIMES_SHEET)) {
  wb.SheetNames.push(ENGINE_TIMES_SHEET);
}

const savedPath = saveWorkbook(wb);

console.log(`Workbook: ${workbookPath}`);
console.log(`Cost sheet: ${costSheetName}`);
console.log(`Saved: ${savedPath}`);
console.log(`Wrote ${outTs}`);
console.log("Structures:", STRUCTURE_ORDER.join(", "));
const deskL2 = tables.office_desk[1];
console.log(
  "Sample office_desk L2:",
  `cash=${deskL2.cash}, sup=${deskL2.supply}, ele=${deskL2.electricity}`,
);

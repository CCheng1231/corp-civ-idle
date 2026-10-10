/**
 * Optional dev import: reference workbook tab "Structure Cost and rate" → structureBalanceData.ts
 * Game build uses committed TS only. Prefer: node scripts/import-balance-from-workbook.mjs
 *
 * Run: node scripts/build-structure-balance.mjs [--workbook path]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

import { resolveBalanceWorkbookFromArgs } from "./lib/resolve-balance-workbook.mjs";

const outTs = join(__dirname, "..", "src", "game", "structureBalanceData.ts");
const BALANCE_TS_HEADER = `/** Game balance source of truth — edit in repo. Optional sync from reference xlsx: node scripts/import-balance-from-workbook.mjs */
/** Build duration: buildTimeHours = Excel day fraction × 24 (real-time hours). */`;
const COST_SHEET_CANDIDATES = [
  "Structure Cost and rate",
  "Structure Cost and passive rate",
];
const NAME_TO_ID = {
  "Office desk": "office_desk",
  "Office Vault": "bank_account",
  "Bank account": "bank_account",
  "Office supply": "office_supply",
  "Storage Room": "storage_room",
  "Department of B2B": "dept_b2b",
  "Break room": "break_room",
  "Social Media": "social_media",
  "Video production studio": "video_production_studio",
  "Press Room": "press_room",
  "Company Statue": "company_statue",
  "Office Expansion": "office_expansion",
  "Electrical Panel": "power_panel",
  "Power Panel": "power_panel",
  "Electricity Generator": "electricity_generator",
  "Department of R&D": "dept_rnd",
  "Recruitment Desk (RD)": "recruitment_desk",
  "Recruitment Desk": "recruitment_desk",
  "MIT (Management in training) room": "mit_room",
};

const STRUCTURE_ORDER = [
  "office_desk",
  "bank_account",
  "office_supply",
  "storage_room",
  "dept_b2b",
  "break_room",
  "social_media",
  "video_production_studio",
  "press_room",
  "company_statue",
  "office_expansion",
  "power_panel",
  "electricity_generator",
  "dept_rnd",
  "recruitment_desk",
  "mit_room",
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
  video_production_studio: "reputation_per_hour",
  press_room: "gov_reputation_per_hour",
  company_statue: "reputation_and_gov_holding",
  office_expansion: "office_space_bonus",
  power_panel: "power_capacity_bonus",
  electricity_generator: "power_capacity_bonus",
  dept_rnd: "none",
  recruitment_desk: "none",
  mit_room: "none",
};

/** Placeholder balance until Structure Cost sheet has full blocks (Discover unlocks). */
const PLACEHOLDER_SPECS = {
  video_production_studio: {
    maxLevel: 20,
    base: { cash: 200, supply: 150, electricity: 5, effect: 5 },
    costScale: 1.15,
    effectScale: 1.25,
    buildTimeHours: 0.001,
  },
  press_room: {
    maxLevel: 20,
    base: { cash: 220, supply: 160, electricity: 5, effect: 5 },
    costScale: 1.15,
    effectScale: 1.25,
    buildTimeHours: 0.001,
  },
  company_statue: {
    maxLevel: 20,
    base: { cash: 250, supply: 180, electricity: 5, effect: 50 },
    costScale: 1.15,
    effectScale: 1.2,
    buildTimeHours: 0.001,
  },
  electricity_generator: {
    maxLevel: 20,
    base: { cash: 180, supply: 120, electricity: 0, effect: 10 },
    costScale: 1.2,
    effectScale: 1.15,
    buildTimeHours: 0.001,
  },
  mit_room: {
    maxLevel: 10,
    base: { cash: 300, supply: 200, electricity: 8, effect: 0 },
    costScale: 1.15,
    effectScale: 1,
    buildTimeHours: 0.002,
  },
};

function generatePlaceholderTable(spec) {
  const rows = [];
  for (let level = 1; level <= spec.maxLevel; level++) {
    const scale = spec.costScale ** (level - 1);
    const effectScale = spec.effectScale ** (level - 1);
    rows.push({
      level,
      excelTime: spec.buildTimeHours * (1 + (level - 1) * 0.1) / 24,
      buildTimeHours: spec.buildTimeHours * (1 + (level - 1) * 0.1),
      cash: Math.round(spec.base.cash * scale),
      supply: Math.round(spec.base.supply * scale),
      connection: 0,
      reputation: 0,
      govReputation: 0,
      electricity: spec.base.electricity,
      effect: Math.round(spec.base.effect * effectScale * 100) / 100,
    });
  }
  return rows;
}

function writeTs(tables) {
  const engineTables = {};
  for (const id of STRUCTURE_ORDER) {
    engineTables[id] = (tables[id] ?? []).map(toEngineRow);
  }

  const body = `${BALANCE_TS_HEADER}

import type { StructureId } from "./types";

export type StructureEffectKind =
  | "cash_per_hour"
  | "supply_per_hour"
  | "connection_per_hour"
  | "mood_per_hour"
  | "reputation_per_hour"
  | "gov_reputation_per_hour"
  | "cash_holding"
  | "supply_holding"
  | "reputation_and_gov_holding"
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

export function importStructureBalanceFromWorkbook(workbookPath) {
  const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
  const costSheetName = findCostSheet(wb);
  if (!costSheetName) {
    throw new Error(`Missing cost sheet. Expected one of: ${COST_SHEET_CANDIDATES.join(", ")}`);
  }

  wb.Sheets[costSheetName] = fixEffectColumnsInSheet(wb.Sheets[costSheetName]);

  const costRows = XLSX.utils.sheet_to_json(wb.Sheets[costSheetName], {
    header: 1,
    defval: "",
  });

  const tables = parseBlocks(costRows);
  const missing = STRUCTURE_ORDER.filter((id) => !tables[id]?.length);
  for (const id of missing) {
    const spec = PLACEHOLDER_SPECS[id];
    if (!spec) {
      throw new Error(`Missing structure blocks in sheet: ${id}`);
    }
    tables[id] = generatePlaceholderTable(spec);
    console.warn(`Using placeholder balance for ${id} (not in cost sheet yet)`);
  }

  writeTs(tables);
  return { costSheetName, tables };
}

if (process.argv[1]?.includes("build-structure-balance.mjs")) {
  const workbookPath = resolveBalanceWorkbookFromArgs();
  if (!workbookPath) {
    console.error("No reference workbook. Pass --workbook path or set BALANCE_WORKBOOK_PATH.");
    process.exit(1);
  }
  const { costSheetName } = importStructureBalanceFromWorkbook(workbookPath);
  console.log(`Workbook: ${workbookPath}`);
  console.log(`Cost sheet: ${costSheetName}`);
  console.log(`Wrote ${outTs}`);
}

/**
 * Reads "Structure Cost and passive rate" (column C = Cost - Time per level),
 * syncs src/game/structureBalanceData.ts, adds tab
 * "Structure Build Times (engine)" without overwriting the design sheet.
 *
 * Run: node scripts/build-structure-balance.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

const WORKBOOK_CANDIDATES = [
  join(__dirname, "..", "..", "Corp-Civ-Balance-Reference-working.xlsx"),
  join(__dirname, "..", "..", "Corp-Civ-Balance-Reference.xlsx"),
  join(__dirname, "..", "Corp-Civ-Balance-Reference.xlsx"),
];

const workbookPath = WORKBOOK_CANDIDATES.find((p) => existsSync(p));
if (!workbookPath) {
  console.error("No balance workbook found. Expected one of:", WORKBOOK_CANDIDATES);
  process.exit(1);
}

const outTs = join(__dirname, "..", "src", "game", "structureBalanceData.ts");
const COST_SHEET = "Structure Cost and passive rate";
const ENGINE_TIMES_SHEET = "Structure Build Times (engine)";

const NAME_TO_ID = {
  "Office desk": "office_desk",
  "Bank account": "bank_account",
  "Office supply": "office_supply",
  "Storage Room": "storage_room",
  "Department of B2B": "dept_b2b",
  "Break room": "break_room",
  "Social Media": "social_media",
  "Office Expansion": "office_expansion",
  "Power Panel": "power_panel",
  "Recruitment Desk": "recruitment_desk",
};

const ID_TO_NAME = Object.fromEntries(
  Object.entries(NAME_TO_ID).map(([k, v]) => [v, k]),
);

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
  "recruitment_desk",
];

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Excel time format: fraction of a 24h day → real-time hours (game hours = real time). */
function excelTimeToBuildHours(excelDayFraction) {
  return excelDayFraction * 24;
}

function excelTimeToSeconds(excelDayFraction) {
  return excelDayFraction * 86400;
}

/** Parse blocks from design sheet; column C (index 2) = Cost - Time (Excel time). */
function parseAuthoritativeBlocks(rows) {
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

function mapRow(r, overrides = {}) {
  return {
    level: r.level,
    buildTimeHours: overrides.buildTimeHours ?? r.buildTimeHours,
    cash: overrides.cash ?? r.cash,
    supply: overrides.supply ?? r.supply,
    connection: overrides.connection ?? r.connection,
    reputation: overrides.reputation ?? r.reputation,
    govReputation: overrides.govReputation ?? r.govReputation,
    electricity: overrides.electricity ?? r.electricity,
    effect: overrides.effect ?? r.effect,
  };
}

function deriveTables(authoritative) {
  const desk = authoritative.office_desk;
  const bank = authoritative.bank_account;
  const supply = authoritative.office_supply;
  const storage = authoritative.storage_room;

  if (!desk?.length || !bank?.length || !supply?.length || !storage?.length) {
    throw new Error(
      "Sheet must include Office desk, Bank account, Office supply, and Storage Room blocks with column C times.",
    );
  }

  const dept_b2b = desk.map((r, i) =>
    mapRow(r, {
      supply: 0,
      connection: r.supply,
      effect:
        i === 0
          ? 15
          : Math.round(desk[i].effect * (15 / desk[0].effect) * 100) / 100,
    }),
  );

  const break_room = supply.map((r, i) =>
    mapRow(r, {
      effect:
        i === 0
          ? 25
          : Math.round(supply[i].effect * (25 / supply[0].effect) * 100) / 100,
    }),
  );

  const social_media = supply.map((r, i) =>
    mapRow(r, {
      effect: Math.round(supply[i].effect * (8 / 80) * 100) / 100,
    }),
  );

  const office_expansion = desk.map((r, i) =>
    mapRow(r, {
      effect: Math.max(0, i * 2),
      electricity: 0,
    }),
  );

  const power_panel = supply.map((r, i) =>
    mapRow(r, {
      effect: Math.max(0, i * 5),
      electricity: 0,
    }),
  );

  const recruitment_desk = bank.slice(0, 10).map((r) =>
    mapRow(r, { effect: 0, electricity: Math.max(0, r.electricity * 0.5) }),
  );

  return {
    office_desk: desk,
    bank_account: bank,
    office_supply: supply,
    storage_room: storage,
    dept_b2b,
    break_room,
    social_media,
    office_expansion,
    power_panel,
    recruitment_desk,
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
  recruitment_desk: "none",
};

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

function writeTs(tables) {
  const engineTables = {};
  for (const id of STRUCTURE_ORDER) {
    engineTables[id] = tables[id].map(toEngineRow);
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
    const alt = join(
      __dirname,
      "..",
      "Corp-Civ-Balance-Reference-engine-sync.xlsx",
    );
    writeFileSync(alt, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
    return alt;
  }
}

function buildEngineTimesSheetAoa(tables, authoritativeIds) {
  const aoa = [
    ["Structure Build Times (engine) — synced from column C, Cost - Time"],
    [
      "Column C uses Excel time format (fraction of day). Engine: real seconds = C × 86,400; hours = C × 24.",
    ],
    [
      "Levels 2–20: upgrade TO that level. Level 1 = starting tier (time 0).",
    ],
    [],
    [
      "Structure",
      "Level",
      "Cost - Time (Excel)",
      "Scale",
      "Real seconds (C×86400)",
      "Build hours (C×24)",
      "Source",
      "Cash",
      "SUP",
      "CON",
      "Electricity",
      "Effect (total at level)",
    ],
  ];

  for (const id of STRUCTURE_ORDER) {
    const name = ID_TO_NAME[id] ?? id;
    const source = authoritativeIds.has(id)
      ? "Sheet column C"
      : `Thematic template (${id === "dept_b2b" || id === "office_expansion" ? "office_desk" : id === "break_room" || id === "social_media" || id === "power_panel" ? "office_supply" : "bank_account"} times)`;

    for (const r of tables[id]) {
      aoa.push([
        r.level === 1 ? name : "",
        r.level,
        r.excelTime ?? (r.buildTimeHours > 0 ? r.buildTimeHours / 24 : 0),
        r.timeScale ?? "",
        excelTimeToSeconds(r.excelTime ?? r.buildTimeHours / 24),
        r.buildTimeHours,
        source,
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

function buildFullEngineCostSheetAoa(tables, authoritativeIds) {
  const header = [
    "Structure",
    "Level",
    "Cost - Time",
    "Scale",
    "Cash",
    "Scale",
    "SUP",
    "Scale",
    "CON",
    "Scale",
    "REP",
    "Scale",
    "GREP",
    "Scale",
    "Electricity",
    "Scale",
    "Effect (engine total at level)",
    "Scale",
    "Source row",
  ];

  const aoa = [
    ["Structure Cost and passive rate — ENGINE COPY (do not edit design sheet)"],
    [
      "Cost - Time = Excel time from design sheet column C (engine stores buildTimeHours = C × 24).",
    ],
    [],
    header,
  ];

  for (const id of STRUCTURE_ORDER) {
    const name = ID_TO_NAME[id] ?? id;
    const source = authoritativeIds.has(id) ? "design sheet" : "engine template";
    for (const r of tables[id]) {
      aoa.push([
        r.level === 1 ? name : "",
        r.level,
        r.excelTime ?? (r.buildTimeHours > 0 ? r.buildTimeHours / 24 : 0),
        r.timeScale ?? "",
        r.cash,
        r.cashScale ?? "",
        r.supply,
        r.supplyScale ?? "",
        r.connection,
        "",
        r.reputation,
        "",
        r.govReputation,
        "",
        r.electricity,
        "",
        r.effect,
        r.effectScale ?? "",
        source,
      ]);
    }
    aoa.push([]);
  }
  return aoa;
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const costRows = XLSX.utils.sheet_to_json(wb.Sheets[COST_SHEET], {
  header: 1,
  defval: "",
});

const authoritative = parseAuthoritativeBlocks(costRows);
const authoritativeIds = new Set(Object.keys(authoritative));
const tables = deriveTables(authoritative);

writeTs(tables);

wb.Sheets[ENGINE_TIMES_SHEET] = XLSX.utils.aoa_to_sheet(
  buildEngineTimesSheetAoa(tables, authoritativeIds),
);
if (!wb.SheetNames.includes(ENGINE_TIMES_SHEET)) {
  wb.SheetNames.push(ENGINE_TIMES_SHEET);
}

const ENGINE_COPY_SHEET = "Structure Cost (engine copy)";
wb.Sheets[ENGINE_COPY_SHEET] = XLSX.utils.aoa_to_sheet(
  buildFullEngineCostSheetAoa(tables, authoritativeIds),
);
if (!wb.SheetNames.includes(ENGINE_COPY_SHEET)) {
  wb.SheetNames.push(ENGINE_COPY_SHEET);
}

const savedPath = saveWorkbook(wb);

console.log(`Workbook: ${workbookPath}`);
console.log(`Saved tabs to: ${savedPath}`);
console.log(`Wrote ${outTs}`);
console.log(`Added/updated tabs: "${ENGINE_TIMES_SHEET}", "${ENGINE_COPY_SHEET}"`);
console.log(
  "Authoritative column C blocks:",
  [...authoritativeIds].join(", "),
);
const deskL2 = tables.office_desk[1];
console.log(
  "Sample office_desk L2 Excel C=",
  deskL2.excelTime,
  "→",
  Math.round(excelTimeToSeconds(deskL2.excelTime)),
  "sec (~1:26), buildTimeHours=",
  deskL2.buildTimeHours,
);

/**
 * Applies milestone-oriented tuning to committed balance TS (Oct 2026 pass).
 * Run once after import: node scripts/apply-balance-tuning.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadStructureBalanceTables,
  loadStructureEffectKind,
  loadResearchDefinitions,
  loadJobDefinitions,
} from "./lib/parse-game-balance-ts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gameDir = join(__dirname, "..", "src", "game");

const UPGRADE_COST_MULT = 2.5;
const CAP_COST_MULT = 2.0;

const RATE_KINDS = new Set([
  "cash_per_hour",
  "supply_per_hour",
  "connection_per_hour",
  "mood_per_hour",
  "reputation_per_hour",
  "gov_reputation_per_hour",
]);

const BALANCE_TS_HEADER = `/** Game balance source of truth — edit in repo. Optional sync: node scripts/import-balance-from-workbook.mjs */
/** Build duration: buildTimeHours = Excel day fraction × 24 (real-time hours). */`;

function scaleRowCosts(row, mult) {
  return {
    ...row,
    cash: row.cash > 0 ? Math.ceil(row.cash * mult) : row.cash,
    supply: row.supply > 0 ? Math.ceil(row.supply * mult) : row.supply,
    connection: row.connection > 0 ? Math.ceil(row.connection * mult) : row.connection,
    reputation: row.reputation > 0 ? Math.ceil(row.reputation * mult) : row.reputation,
    govReputation:
      row.govReputation > 0 ? Math.ceil(row.govReputation * mult) : row.govReputation,
    electricity: row.electricity > 0 ? Math.ceil(row.electricity * mult) : row.electricity,
  };
}

function tuneStructureTables(tables, kinds) {
  const out = {};
  for (const [id, rows] of Object.entries(tables)) {
    const kind = kinds[id];
    const mult = RATE_KINDS.has(kind) ? UPGRADE_COST_MULT : CAP_COST_MULT;
    out[id] = rows.map((row) => {
      if (row.level <= 1) return { ...row };
      return scaleRowCosts(row, mult);
    });
  }
  return out;
}

function writeStructureTs(tables, effectKind) {
  const path = join(gameDir, "structureBalanceData.ts");
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

export const STRUCTURE_EFFECT_KIND: Record<StructureId, StructureEffectKind> = ${JSON.stringify(effectKind, null, 2)};

export const STRUCTURE_BALANCE_TABLES: Record<
  StructureId,
  StructureLevelBalanceRow[]
> = ${JSON.stringify(tables, null, 2)};
`;
  writeFileSync(path, body, "utf8");
}

function tuneResearch(defs) {
  return defs.map((d) => {
    const next = { ...d, baseCost: { ...d.baseCost } };
    if (d.category === "resources" && d.id.startsWith("eff_manuals_")) {
      for (const k of Object.keys(next.baseCost)) {
        if (next.baseCost[k] > 0) {
          next.baseCost[k] = Math.ceil(next.baseCost[k] * 1.35);
        }
      }
      next.costScale = Math.max(d.costScale ?? 1.1, 1.12);
    }
    if (d.id === "portfolio_management") {
      next.baseCost.cash = Math.ceil((next.baseCost.cash ?? 0) * 1.25);
      next.baseCost.supply = Math.ceil((next.baseCost.supply ?? 0) * 1.25);
    }
    return next;
  });
}

function writeResearchTs(defs) {
  const path = join(gameDir, "researchData.ts");
  const header = `/** Game balance source of truth — edit in repo. Optional sync: node scripts/import-balance-from-workbook.mjs */`;
  writeFileSync(
    path,
    `${header}

import type { ResearchDefinition } from "./types";

export const RESEARCH_DEFINITIONS: ResearchDefinition[] = ${JSON.stringify(defs, null, 2)};
`,
    "utf8",
  );
}

function tuneJobs(jobs) {
  return jobs.map((j) => {
    if (j.tier !== 1) return j;
    const unitHoursTotal = Math.ceil(j.unitHoursTotal * 1.15);
    return {
      ...j,
      unitHoursTotal,
      bonusPercent: Math.max(j.bonusPercent ?? 0.1, 0.12),
    };
  });
}

function writeJobTs(jobs) {
  const path = join(gameDir, "jobHubData.ts");
  const header = `/** Game balance source of truth — edit in repo. Optional sync: node scripts/import-balance-from-workbook.mjs */`;
  writeFileSync(
    path,
    `${header}

import type { JobDefinition } from "./types";

export const JOB_DEFINITIONS: JobDefinition[] = ${JSON.stringify(jobs, null, 2)};
`,
    "utf8",
  );
}

const structPath = join(gameDir, "structureBalanceData.ts");
const tables = loadStructureBalanceTables(structPath);
const kinds = loadStructureEffectKind(structPath);
const tunedTables = tuneStructureTables(tables, kinds);
writeStructureTs(tunedTables, kinds);

if (!process.argv.includes("--structures-only")) {
  const research = tuneResearch(loadResearchDefinitions(join(gameDir, "researchData.ts")));
  writeResearchTs(research);

  const jobs = tuneJobs(loadJobDefinitions(join(gameDir, "jobHubData.ts")));
  writeJobTs(jobs);
}

console.log("Applied balance tuning (structure upgrade costs ×2.5 / caps ×2, research manuals +35%, T1 jobs +15% pool & 12% bonus).");
console.log("Run: node scripts/balance-report.mjs");

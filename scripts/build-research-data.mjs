/**
 * Reads Research + Research Cost tabs → src/game/researchData.ts
 * Run: node scripts/build-research-data.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

const workbookPath = join(__dirname, "..", "20260731 Corp Idle Working.xlsx");
if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const outTs = join(__dirname, "..", "src", "game", "researchData.ts");

/** v1 scope — Option-type and Discover unlocks deferred. */
const V1_SHEET_NUMBERS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 14]);

const ID_BY_NUMBER = {
  1: "eff_manuals_cash",
  2: "eff_manuals_sup",
  3: "eff_manuals_con",
  4: "eff_manuals_mood",
  5: "eff_manuals_rep",
  6: "eff_manuals_grep",
  7: "planning_ahead",
  8: "branch_management",
  9: "local_guidebook",
  10: "logistics_planning",
  11: "job_hunting",
  12: "five_sticky_fingers",
  13: "ethic_training",
  14: "bid_modeling",
  15: "discover_video_studio",
  16: "discover_press_room",
  17: "discover_company_statue",
  18: "discover_electricity_generator",
  19: "discover_mit_room",
};

function num(v) {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePreReq(text) {
  if (!text || text === "—" || text === "-") return [];
  const reqs = [];
  for (const part of String(text).split(",")) {
    const m = part.match(/level\s*(\d+)\s*(?:Resarch|Research)#(\d+)/i);
    if (m) {
      const reqId = ID_BY_NUMBER[Number(m[2])];
      if (reqId) reqs.push({ id: reqId, minLevel: Number(m[1]) });
    }
  }
  if (/Efficiency Manuals for CON/i.test(text)) {
    reqs.push({ id: "eff_manuals_con", minLevel: 1 });
  }
  return reqs;
}

function effectFromRow(type, effectText, name) {
  const pctMatch = effectText.match(/(\d+)%/);
  const pct = pctMatch ? Number(pctMatch[1]) / 100 : 0;

  if (type === "Resources") {
    if (/Manuals for \$|for \$/.test(name)) {
      return { ratePercentPerLevel: { cash: pct || 0.05 } };
    }
    if (/SUP/.test(name)) return { ratePercentPerLevel: { supply: pct || 0.05 } };
    if (/CON/.test(name)) return { ratePercentPerLevel: { connection: pct || 0.05 } };
    if (/Mood/.test(name)) return { ratePercentPerLevel: { mood: pct || 0.05 } };
    if (/REP/.test(name) && !/GREP/.test(name)) {
      return { ratePercentPerLevel: { reputation: pct || 0.05 } };
    }
    if (/GREP/.test(name)) {
      return { ratePercentPerLevel: { govReputation: pct || 0.05 } };
    }
    if (/storage/i.test(effectText)) {
      return { storagePercentPerLevel: pct || 0.03 };
    }
  }
  if (type === "Mult" && /payout/i.test(effectText)) {
    return { projectPayoutMultPerLevel: pct || 0.04 };
  }
  if (type === "Unlock" && /Branch/i.test(name)) {
    return {};
  }
  return {};
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const researchRows = XLSX.utils.sheet_to_json(wb.Sheets.Research, {
  header: 1,
  defval: "",
});
const costRows = XLSX.utils.sheet_to_json(wb.Sheets["Research Cost"], {
  header: 1,
  defval: "",
});

const metaByNum = {};
for (const r of researchRows) {
  const n = num(r[0]);
  if (n < 1 || !ID_BY_NUMBER[n]) continue;
  metaByNum[n] = {
    sheetNumber: n,
    id: ID_BY_NUMBER[n],
    name: String(r[1] ?? "").trim(),
    maxLevel: num(r[2]) || 1,
    type: String(r[3] ?? "").trim(),
    preReqText: String(r[4] ?? "").trim(),
    rndLevelRequired: num(r[5]) || 0,
    effectText: String(r[6] ?? "").trim(),
  };
}

const costByNum = {};
for (const r of costRows) {
  const n = num(r[0]);
  if (n < 1 || !metaByNum[n]) continue;
  costByNum[n] = {
    timeHours: excelTimeToHours(num(r[4])),
    cash: num(r[5]),
    supply: num(r[6]),
    connection: num(r[7]),
    mood: num(r[8]),
    reputation: num(r[9]),
    govReputation: num(r[10]),
    costScale: num(r[11]) || 1.1,
  };
}

function excelTimeToHours(v) {
  return v * 24;
}

const nodes = [];
for (const n of [...V1_SHEET_NUMBERS].sort((a, b) => a - b)) {
  const meta = metaByNum[n];
  const cost = costByNum[n];
  if (!meta || !cost) {
    console.warn(`Skipping research #${n} — missing meta or cost`);
    continue;
  }
  const requires = parsePreReq(meta.preReqText);
  nodes.push({
    id: meta.id,
    name: meta.name,
    description: meta.effectText || meta.type,
    maxLevel: meta.maxLevel,
    rndLevelRequired: meta.rndLevelRequired,
    baseCost: {
      cash: cost.cash,
      supply: cost.supply,
      connection: cost.connection,
      mood: cost.mood,
      reputation: cost.reputation,
      govReputation: cost.govReputation,
    },
    costScale: cost.costScale,
    requires: requires.length ? requires : undefined,
    effects: effectFromRow(meta.type, meta.effectText, meta.name),
  });
}

const body = `/** Auto-generated by scripts/build-research-data.mjs — do not edit. */

import type { ResearchDefinition } from "./types";

export const RESEARCH_DEFINITIONS: ResearchDefinition[] = ${JSON.stringify(nodes, null, 2)};
`;

writeFileSync(outTs, body, "utf8");
console.log(`Wrote ${outTs} (${nodes.length} v1 research nodes)`);

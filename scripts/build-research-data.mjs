/**
 * Reads Research + Research Cost tabs → src/game/researchData.ts
 * Run: node scripts/build-research-data.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));

const workbookPath = resolveWorkbookPath();

const outTs = join(__dirname, "..", "src", "game", "researchData.ts");

/** v1 scope — Option-type unlocks deferred; Discover (#15–19) included. */
const V1_SHEET_NUMBERS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 20, 21]);

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
  20: "portfolio_management",
  21: "massive_expansion",
  15: "discover_video_studio",
  16: "discover_press_room",
  17: "discover_company_statue",
  18: "discover_electricity_generator",
  19: "discover_mit_room",
};

/** Research tab # → structure unlocked (Discover nodes). */
const DISCOVER_UNLOCK_STRUCTURE = {
  15: "video_production_studio",
  16: "press_room",
  17: "company_statue",
  18: "electricity_generator",
  19: "mit_room",
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

function effectFromRow(type, effectText, name, sheetNumber) {
  const pctMatch = effectText.match(/(\d+)%/);
  const pct = pctMatch ? Number(pctMatch[1]) / 100 : 0;

  if (type === "Unlock" && DISCOVER_UNLOCK_STRUCTURE[sheetNumber]) {
    return { unlocksStructure: DISCOVER_UNLOCK_STRUCTURE[sheetNumber] };
  }

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
  if (type === "Unlock" && /Massive Expansion/i.test(name)) {
    return { branchSlotPerLevel: 1 };
  }
  if (type === "Unlock" && /Branch/i.test(name)) {
    return {};
  }
  if (/Portfolio Management|concurrent job engagement/i.test(name + effectText)) {
    return { engagementCapPerLevel: 1 };
  }
  if (/Portfolio Management|concurrent job engagement/i.test(effectText)) {
    return { engagementCapPerLevel: 1 };
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

/** Player-facing section in the Research tab (Discover split out from Unlock). */
function researchCategory(sheetNumber, sheetType) {
  if (DISCOVER_UNLOCK_STRUCTURE[sheetNumber]) return "discover";
  const t = String(sheetType).trim();
  if (t === "Resources") return "resources";
  if (t === "Mult") return "mult";
  if (t === "Unlock") return "unlock";
  return "unlock";
}

/** Immersive card copy — workbook effect text stays internal to the sheet. */
function playerDescription(id, name, maxLevel, effects) {
  const pct5Max = maxLevel * 5;
  const pct3Max = maxLevel * 3;
  const pct4Max = maxLevel * 4;

  const byId = {
    eff_manuals_cash:
      "Company-wide SOPs for cash handling — +5% Cash/hr from structures per level.",
    eff_manuals_sup:
      "Tighten supply closets and reorder rules — +5% SUP/hr from structures per level.",
    eff_manuals_con:
      "Networking playbooks for client outreach — +5% Connection/hr from structures per level.",
    eff_manuals_mood:
      "Morale guides for break-room culture — +5% Mood/hr from structures per level.",
    eff_manuals_rep:
      "PR templates and stakeholder maps — +5% REP/hr from structures per level.",
    eff_manuals_grep:
      "Government liaison procedures — +5% GREP/hr from structures per level.",
    planning_ahead:
      "Forecast storage needs before the next shipment — +3% Cash and SUP caps per level.",
    branch_management:
      "Train branch leads and open your first remote office from a commercial lot.",
    bid_modeling:
      "Spreadsheet models for tower bids — +4% cash payout on projects per level.",
    portfolio_management:
      "Run more jobs at once — +1 concurrent job engagement per level (base cap 3).",
    massive_expansion:
      "Scale the branch network — +1 branch office slot per level beyond your first.",
  };

  if (byId[id]) {
    if (id.startsWith("eff_manuals_") && maxLevel > 1) {
      return `${byId[id]} Max +${pct5Max}%.`;
    }
    if (id === "planning_ahead" && maxLevel > 1) {
      return `${byId[id]} Max +${pct3Max}%.`;
    }
    if (id === "bid_modeling" && maxLevel > 1) {
      return `${byId[id]} Max +${pct4Max}%.`;
    }
    return byId[id];
  }

  if (effects.unlocksStructure) {
    const structureNames = {
      video_production_studio: "video studio",
      press_room: "press room",
      company_statue: "company statue",
      electricity_generator: "an electricity generator",
      mit_room: "management training room",
    };
    const short =
      structureNames[effects.unlocksStructure] ??
      name.replace(/^Discover:\s*/i, "").toLowerCase();
    return `Scout a site plan for a ${short} — adds the build to your Office tab.`;
  }

  return name;
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
  const effects = effectFromRow(meta.type, meta.effectText, meta.name, n);
  nodes.push({
    id: meta.id,
    name: meta.name,
    description: playerDescription(meta.id, meta.name, meta.maxLevel, effects),
    category: researchCategory(n, meta.type),
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
    buildTimeHoursPerLevel: Array.from(
      { length: meta.maxLevel },
      () => cost.timeHours,
    ),
    requires: requires.length ? requires : undefined,
    effects,
  });
}

const body = `/** Auto-generated by scripts/build-research-data.mjs — do not edit. */

import type { ResearchDefinition } from "./types";

export const RESEARCH_DEFINITIONS: ResearchDefinition[] = ${JSON.stringify(nodes, null, 2)};
`;

writeFileSync(outTs, body, "utf8");
console.log(`Wrote ${outTs} (${nodes.length} v1 research nodes)`);

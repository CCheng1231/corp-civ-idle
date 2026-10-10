/**
 * Balance metrics from committed src/game balance TS (no xlsx).
 * Run: node scripts/balance-report.mjs
 */
import { writeFileSync } from "node:fs";
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
const outMd = join(__dirname, "..", "docs", "balance-report.md");

const MILESTONES = {
  M0: { label: "Start (HQ starters)", cashPerHour: 200 },
  M1: { label: "First expansion", cashPerHour: 500 },
  M2: { label: "Dept + research", cashPerHour: 1200 },
  M3: { label: "Mid tree", cashPerHour: 2500 },
};

const RATE_KINDS = new Set([
  "cash_per_hour",
  "supply_per_hour",
  "connection_per_hour",
  "mood_per_hour",
  "reputation_per_hour",
  "gov_reputation_per_hour",
]);

function resourceKeyForKind(kind) {
  switch (kind) {
    case "cash_per_hour":
      return "cash";
    case "supply_per_hour":
      return "supply";
    case "connection_per_hour":
      return "connection";
    case "mood_per_hour":
      return "mood";
    case "reputation_per_hour":
      return "reputation";
    case "gov_reputation_per_hour":
      return "govReputation";
    default:
      return null;
  }
}

function structurePaybackLines(tables, kinds) {
  const lines = [];
  for (const [id, rows] of Object.entries(tables)) {
    const kind = kinds[id];
    const resKey = resourceKeyForKind(kind);
    if (!resKey || !RATE_KINDS.has(kind)) continue;
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1];
      const row = rows[i];
      const delta = row.effect - prev.effect;
      if (delta <= 0) continue;
      const paybackCash = row.cash > 0 ? row.cash / delta : null;
      lines.push({
        id,
        level: row.level,
        delta,
        costCash: row.cash,
        paybackCashH: paybackCash,
        buildH: row.buildTimeHours,
      });
    }
  }
  return lines.sort((a, b) => a.id.localeCompare(b.id) || a.level - b.level);
}

function researchCostSummary(defs) {
  return defs.map((d) => {
    const scale = d.costScale ?? 1.1;
    const max = d.maxLevel ?? 1;
    let totalCash = 0;
    for (let lv = 0; lv < max; lv += 1) {
      totalCash += Math.ceil((d.baseCost?.cash ?? 0) * scale ** lv);
    }
    const pct = d.effects?.ratePercentPerLevel?.cash ?? 0;
    return {
      id: d.id,
      maxLevel: max,
      costScale: scale,
      totalCashToMax: totalCash,
      cashPctPerLevel: pct,
    };
  });
}

function jobSpikeLines(jobs) {
  return jobs.map((j) => {
    const hidden = j.cashPerUnitHour * j.unitHoursTotal;
    const withBonus = hidden * (1 + (j.bonusPercent ?? 0));
    const spikes = {};
    for (const [key, m] of Object.entries(MILESTONES)) {
      spikes[key] = withBonus / m.cashPerHour;
    }
    return {
      id: j.id,
      tier: j.tier,
      title: j.title,
      hidden,
      withBonus,
      spikes,
    };
  });
}

const tables = loadStructureBalanceTables(join(gameDir, "structureBalanceData.ts"));
const kinds = loadStructureEffectKind(join(gameDir, "structureBalanceData.ts"));
const research = loadResearchDefinitions(join(gameDir, "researchData.ts"));
const jobs = loadJobDefinitions(join(gameDir, "jobHubData.ts"));

const paybacks = structurePaybackLines(tables, kinds);
const desk = paybacks.filter((p) => p.id === "office_desk").slice(0, 5);
const jobLines = jobSpikeLines(jobs);
const researchSummary = researchCostSummary(research);

const md = [
  "# Balance report (generated)",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "Source: committed `src/game/*Data.ts` (not xlsx).",
  "",
  "## Milestones (cash passive /hr for spike math)",
  "",
  ...Object.entries(MILESTONES).map(
    ([k, v]) => `- **${k}** — ${v.label}: **${v.cashPerHour}** cash/hr`,
  ),
  "",
  "## Office desk — cash payback (upgrade cost / Δ cash/hr)",
  "",
  "| Level | Δ cash/hr | Cost cash | Payback (h) | Build (h) |",
  "| ----- | --------- | --------- | ----------- | --------- |",
  ...desk.map(
    (p) =>
      `| L${p.level} | ${p.delta} | ${p.costCash} | ${p.paybackCashH?.toFixed(2) ?? "—"} | ${p.buildH} |`,
  ),
  "",
  "## All passive structures — payback (first 40 rows)",
  "",
  "| Structure | L | Δ effect | Cash payback (h) |",
  "| --------- | - | -------- | ---------------- |",
  ...paybacks.slice(0, 40).map(
    (p) =>
      `| ${p.id} | ${p.level} | ${p.delta} | ${p.paybackCashH?.toFixed(2) ?? "—"} |`,
  ),
  "",
  "## Research — cost to max (cash only)",
  "",
  "| id | levels | costScale | total cash | cash %/lvl |",
  "| -- | ------ | --------- | ---------- | ---------- |",
  ...researchSummary.map(
    (r) =>
      `| ${r.id} | ${r.maxLevel} | ${r.costScale} | ${r.totalCashToMax} | ${r.cashPctPerLevel || "—"} |`,
  ),
  "",
  "## Jobs — completion spike (hours of milestone passive)",
  "",
  "| Tier | Job | Hidden | w/ bonus | M0 | M1 | M2 |",
  "| ---- | --- | ------ | -------- | -- | -- | -- |",
  ...jobLines.map(
    (j) =>
      `| ${j.tier} | ${j.title} | ${j.hidden.toFixed(0)} | ${j.withBonus.toFixed(0)} | ${j.spikes.M0.toFixed(1)} | ${j.spikes.M1.toFixed(1)} | ${j.spikes.M2.toFixed(1)} |`,
  ),
  "",
  "### Target bands (design)",
  "",
  "- T1 at M0: ~4–8 h passive equivalent",
  "- T1 at M1: ~2–4 h",
  "- T2 at M1: ~15–25 h",
  "- T2 at M2: ~8–15 h",
  "- Desk upgrades at M0: ~2–6 h cash payback",
  "",
];

writeFileSync(outMd, md.join("\n"), "utf8");
console.log(`Wrote ${outMd}`);
console.log("Sample office_desk L2 payback (cash h):", desk[1]?.paybackCashH?.toFixed(2) ?? desk[0]?.paybackCashH);

/**
 * Generates Corp-Civ-Balance-Reference.xlsx from current design values.
 * Run: node scripts/export-balance-spreadsheet.mjs
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "Corp-Civ-Balance-Reference.xlsx");

function sheet(name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return { name, ws };
}

const meta = [
  ["Corp Civ Idle — Balance Reference"],
  ["Generated from game data (constants.ts, mapWorld.ts)"],
  ["Cost formula: next level pays base × scale^currentLevel (each resource, rounded up)"],
  [],
];

const sheets = [
  sheet("Global Resources", [
    ...meta,
    ["Resource ID", "UI Label", "Starting Value", "Role"],
    ["money", "Cash", 250, "Primary currency; passive $/s from rates"],
    ["influence", "Influence", 0, "Bids, research, recruitment; passive +/s"],
    ["reputation", "Rep", 0, "Structures, research, contracts; passive +/s"],
    ["govReputation", "Gov Rep", 0, "Late-game gov track; passive +/s"],
  ]),
  sheet("Office Sites", [
    ["Concept", "Value", "Notes"],
    ["Base power per office", 30, "HQ and branch each start here"],
    ["Base office space", 10, "Before Office Expansion"],
    [
      "electricity in costs",
      "Site power pool",
      "Spent from free power at selected office (not passive gen)",
    ],
    ["Structure build time (sec)", 5, "Max 2 queued per site"],
    ["Sell structure level", "50% cash refund", "Full power refund if level cost included power"],
    ["Recruit timer (sec per hire)", 1, "Queued per site"],
    ["Max recruit batch", 25, "Per click per type"],
  ]),
  sheet("Passive Rates", [
    ["Source", "Effect per level (or start)"],
    ["Starting firm", "$2/s cash · 0.05 influence/s · 0 rep · 0 gov rep"],
    ["Office Expansion (structure)", "+$0.8/s cash per level per site"],
    ["Recruitment Desk", "+0.02 rep/s per level per site"],
    ["Analyst Wing", "+0.15 influence/s per level per site"],
    ["Power Grid", "+0.02 rep/s per level per site"],
    ["Efficiency Manuals (research)", "+$0.25/s per level"],
    ["Bid Modeling", "+0.08 influence/s per level"],
    ["Public Relations", "+0.035 rep/s per level"],
    ["Government Liaison", "+0.012 gov rep/s per level"],
    [],
    ["Note", "Structure rate bonuses sum across HQ + branch. Research is firm-wide."],
  ]),
  sheet("Structures", [
    [
      "Structure",
      "Max Level",
      "Base Cost (level N→N+1)",
      "Cost Scale",
      "Office Space / Level",
      "Per Level Effect",
    ],
    [
      "Office Expansion",
      10,
      "$75 cash",
      1.55,
      0,
      "+4 office space; +$0.8/s cash",
    ],
    [
      "Recruitment Desk",
      8,
      "$120 cash, 2 rep",
      1.65,
      2,
      "+0.02 rep/s",
    ],
    [
      "Analyst Wing",
      6,
      "$200 cash, 5 influence",
      1.7,
      3,
      "+0.15 influence/s",
    ],
    [
      "Power Grid",
      8,
      "$150 cash (no power spent on build)",
      1.8,
      2,
      "+18 site power capacity; +0.02 rep/s",
    ],
  ]),
  sheet("Research", [
    [
      "Research",
      "Max Level",
      "Requires",
      "Base Cost (level N→N+1)",
      "Cost Scale",
      "Effect per Level",
    ],
    [
      "Efficiency Manuals",
      5,
      "—",
      "$100 cash, 3 influence",
      1.6,
      "+$0.25/s cash",
    ],
    [
      "Logistics Planning",
      4,
      "—",
      "$90 cash, 20 power @ selected office",
      1.65,
      "−5% project duration (multiplicative per level)",
    ],
    [
      "Bid Modeling",
      4,
      "Efficiency Manuals",
      "$160 cash, 8 influence",
      1.75,
      "+0.08 influence/s; +4% project payout mult per level",
    ],
    [
      "Public Relations",
      5,
      "Efficiency Manuals",
      "$140 cash, 2 rep",
      1.7,
      "+0.035 rep/s",
    ],
    [
      "Government Liaison",
      3,
      "Bid Modeling + Public Relations",
      "$300 cash, 15 influence, 6 rep",
      2.0,
      "+0.012 gov rep/s",
    ],
    [
      "Branch Management",
      1,
      "Efficiency Manuals",
      "$400 cash, 10 influence, 5 rep",
      1.0,
      "Unlock branch on map (no passive rate)",
    ],
  ]),
  sheet("Recruitment", [
    ["Contractor", "Flat Cost per Hire", "Notes"],
    [
      "Resource Farming",
      "$70 cash, 1 rep",
      "Tower contracts; batch = cost × count",
    ],
    [
      "Protection / Defense",
      "$95 cash, 5 power @ site",
      "Phase 2 espionage defense",
    ],
    [
      "Intel Gathering",
      "$110 cash, 4 influence",
      "Unlocks tower projects by intel requirement",
    ],
    [
      "Support Units",
      "$60 cash, 1 rep",
      "Faster jobs + payout bonus with farming crew",
    ],
  ]),
  sheet("Branch & Contracts", [
    ["Action", "Cost", "Notes"],
    [
      "Open branch",
      "$650 cash, 15 influence, 8 rep, 25 power @ HQ",
      "Requires Branch Management + commercial lot",
    ],
    [
      "Accept tower contract",
      "Project min bid + 2 influence fee",
      "Plus farming crew deployed; power from selected office",
    ],
  ]),
  sheet("Net Worth", [
    ["Component", "Weight"],
    ["Cash", "1×"],
    ["Total power capacity (all sites)", "2× per point"],
    ["Influence", "15×"],
    ["Reputation", "25×"],
    ["Gov reputation", "100×"],
    ["Win condition", "$100,000,000 net worth"],
  ]),
  sheet("Tower Projects", [
    [
      "Tower",
      "Project",
      "Duration (s)",
      "Min Bid",
      "Total Payout",
      "Intel Req",
      "Rep on Complete",
    ],
    [
      "Central Exchange",
      "Lobby modernization",
      60,
      "$80 cash, 20 power",
      "$320 cash, 5 rep, 4 influence",
      0,
      5,
    ],
    [
      "Central Exchange",
      "In-building data suite",
      120,
      "$200 cash, 45 power, 5 influence",
      "$580 cash, 18 influence, 8 rep",
      2,
      8,
    ],
    [
      "Parkview",
      "Anchor tenant build-out",
      75,
      "$55 cash, 18 power",
      "$210 cash, 4 rep",
      0,
      4,
    ],
    [
      "Parkview",
      "Flex office expansion",
      90,
      "$90 cash, 25 power, 2 rep",
      "$340 cash, 6 rep, 1 gov rep",
      1,
      6,
    ],
    [
      "Crossroads",
      "Warehouse shell",
      50,
      "$35 cash, 12 power",
      "$140 cash, 3 rep",
      0,
      3,
    ],
    [
      "Crossroads",
      "Clinic fit-out",
      70,
      "$50 cash, 15 power, 1 rep",
      "$195 cash, 4 rep, 2 gov rep",
      1,
      4,
    ],
    [
      "Hillside",
      "Conference wing",
      65,
      "$45 cash, 14 power",
      "$175 cash, 5 rep",
      0,
      5,
    ],
    [
      "Hillside",
      "Rooftop solar install",
      100,
      "$110 cash, 30 power, 3 rep",
      "$390 cash, 7 rep, 2 gov rep",
      1,
      7,
    ],
  ]),
];

const wb = XLSX.utils.book_new();
for (const { name, ws } of sheets) {
  XLSX.utils.book_append_sheet(wb, ws, name);
}

const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);

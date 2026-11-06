/**
 * Adds Government Program sheets + Secretary Stat pct column.
 * Run: node scripts/patch-gov-program-excel.mjs
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

function sheetFromRows(name, rows) {
  return { name, rows };
}

const sheets = [
  sheetFromRows("Gov Program Readme", [
    ["Government Program — edit guide"],
    [""],
    ["Sheet", "Purpose"],
    ["Gov Program Growth", "Main tutorial steps (decline = hidden in game, not in sheet)"],
    ["Gov Program Executive", "Full-path only: Gessesa intro through Chief switch"],
    ["Gov Program Charter Job", "Single player-only charter posting (full path)"],
    ["Gov Program Daily", "Daily quest pool — objectiveType + param + rewards"],
    ["Gov Program Weekly", "Weekly quest pool"],
    ["Gov Program Monthly", "Monthly quest pool"],
    [
      "Gov Program Map",
      "Quest flow JPG (embedded); regen SVG→JPG: node scripts/render-gov-program-quest-map.mjs then node scripts/embed-gov-program-quest-map-workbook.mjs",
    ],
    [""],
    ["Magnitudes", "Edit reward columns and pct columns here; run build-gov-program-data.mjs"],
    ["Secretary Stat", "chiefEffectPct + teamLeadTravelPct per secretary"],
    [""],
    ["objectiveType examples", "recruit_units | engage_job | complete_charter | switch_chief | structure_queue | open_map | research_queue | hire_unit_id"],
  ]),
  sheetFromRows("Gov Program Growth", [
    [
      "stepId",
      "sortOrder",
      "title",
      "body",
      "objectiveType",
      "param",
      "rewardCash",
      "rewardSupply",
      "rewardConnection",
      "autoAdvance",
    ],
    [
      "growth_structure",
      1,
      "Facility stipend",
      "Queue or complete one structure upgrade at HQ.",
      "structure_queue",
      "1",
      150,
      50,
      0,
      "Y",
    ],
    [
      "growth_recruit_push",
      2,
      "Workforce grant",
      "Hire contractors toward a headcount of 10 (lifetime recruits).",
      "recruit_units",
      "10",
      200,
      100,
      0,
      "N",
    ],
    [
      "growth_map",
      3,
      "Site survey",
      "Open the World map and inspect a contract site.",
      "open_map",
      "1",
      100,
      0,
      25,
      "Y",
    ],
    [
      "growth_job",
      4,
      "First contract",
      "Engage a task force from the Job board or map.",
      "engage_job",
      "1",
      250,
      75,
      0,
      "N",
    ],
    [
      "growth_report",
      5,
      "After-action",
      "Read or dismiss a job report on Secretary → Job.",
      "job_report",
      "1",
      100,
      0,
      0,
      "Y",
    ],
    [
      "growth_research",
      6,
      "R&D voucher",
      "Queue one research project.",
      "research_queue",
      "1",
      150,
      0,
      50,
      "Y",
    ],
    [
      "growth_bm_hint",
      7,
      "Branch lead (optional)",
      "When ready: research Branch Management and recruit a Branch Manager.",
      "hint_only",
      "branch_manager",
      0,
      0,
      0,
      "Y",
    ],
    [
      "growth_bm_hired",
      8,
      "Branch lead hired",
      "Recruit a Branch Manager to your roster.",
      "hire_unit_id",
      "branch_manager",
      500,
      200,
      0,
      "Y",
    ],
  ]),
  sheetFromRows("Gov Program Executive", [
    [
      "stepId",
      "sortOrder",
      "title",
      "body",
      "objectiveType",
      "param",
      "rewardCash",
      "rewardSupply",
      "blocksOtherEngages",
    ],
    [
      "exec_unlock",
      1,
      "Regional attach",
      "Ten contractors on payroll — regional office assigns Gessesa to your firm.",
      "recruit_units",
      "10",
      0,
      0,
      "N",
    ],
    [
      "exec_intro",
      2,
      "Meet Gessesa",
      "Full-screen intro — Continue.",
      "dialog",
      "gessesa_intro",
      0,
      0,
      "N",
    ],
    [
      "exec_roster",
      3,
      "Roster",
      "Open Secretary → Roster and confirm Gessesa is listed.",
      "open_roster",
      "1",
      100,
      50,
      "N",
    ],
    [
      "exec_charter_engage",
      4,
      "Charter contract",
      "Deploy 10 available units. Gessesa leads this task force. One-time instant deployment.",
      "complete_charter",
      "engage",
      0,
      0,
      "Y",
    ],
    [
      "exec_charter_return",
      5,
      "Charter complete",
      "Instant return — stipend paid.",
      "complete_charter",
      "return",
      400,
      150,
      "N",
    ],
    [
      "exec_lafe_beat",
      6,
      "Office tension",
      "Lafe wanted to lead the field team — dialogue.",
      "dialog",
      "lafe_complains",
      0,
      0,
      "N",
    ],
    [
      "exec_chief_switch",
      7,
      "Chief of Staff",
      "Assign Chief of Staff on Roster (required once). You can switch back anytime if they are at HQ and not on a task force.",
      "switch_chief",
      "1",
      150,
      0,
      "N",
    ],
  ]),
  sheetFromRows("Gov Program Charter Job", [
    [
      "definitionId",
      "title",
      "description",
      "durationSec",
      "cashPerUnitHour",
      "unitHoursTotal",
      "minCrew",
      "requiresTeamLeadSecretary",
      "instantTeleport",
      "payoutCashFlat",
      "payoutSupplyFlat",
    ],
    [
      "gov_charter_introduction",
      "Regional orientation charter",
      "One-time government charter — instant deployment (program only).",
      3600,
      10,
      100,
      10,
      "Y",
      "Y",
      300,
      100,
    ],
  ]),
  sheetFromRows("Gov Program Daily", [
    ["questId", "weight", "title", "objectiveType", "param", "rewardCash", "rewardSupply"],
    ["daily_job_return_1", 1, "Daily: one return", "job_return", "1", 200, 50],
    ["daily_recruit_3", 1, "Daily: hire 3", "recruit_units", "3", 150, 75],
  ]),
  sheetFromRows("Gov Program Weekly", [
    ["questId", "weight", "title", "objectiveType", "param", "rewardCash", "rewardSupply"],
    ["weekly_jobs_5", 1, "Weekly: 5 returns", "job_return", "5", 800, 200],
  ]),
  sheetFromRows("Gov Program Monthly", [
    ["questId", "weight", "title", "objectiveType", "param", "rewardCash", "rewardSupply"],
    ["monthly_cash_50k", 1, "Monthly: earn job cash", "earn_job_cash", "50000", 2000, 500],
  ]),
];

const wb = XLSX.read(readFileSync(workbookPath));

for (const { name, rows } of sheets) {
  wb.Sheets[name] = XLSX.utils.aoa_to_sheet(rows);
  if (!wb.SheetNames.includes(name)) {
    wb.SheetNames.push(name);
  }
}

const stat = wb.Sheets["Secretary Stat"];
if (stat) {
  const rows = XLSX.utils.sheet_to_json(stat, { header: 1, defval: "" });
  const header = rows[0] ?? [];
  if (String(header[7] ?? "").trim() !== "chiefEffectPct") {
    header[7] = "chiefEffectPct";
    header[8] = "teamLeadTravelPct";
    rows[0] = header;
    const pctByCode = {
      Secretary_01: [0.01, -0.05],
      Secretary_02: [-0.01, -0.05],
      Secretary_03: [-0.01, -0.05],
      Secretary_04: [-0.01, -0.05],
      Secretary_05: [-0.01, -0.05],
    };
    for (let i = 1; i < rows.length; i++) {
      const code = String(rows[i][0] ?? "").trim();
      const p = pctByCode[code];
      if (p) {
        rows[i][7] = p[0];
        rows[i][8] = p[1];
      }
    }
    wb.Sheets["Secretary Stat"] = XLSX.utils.aoa_to_sheet(rows);
  }
}

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Patched Gov Program sheets + Secretary Stat pct → ${workbookPath}`);

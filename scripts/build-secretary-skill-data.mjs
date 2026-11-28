/**
 * Secretary Skills sheet → src/game/secretarySkillData.ts
 * Run: node scripts/build-secretary-skill-data.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outTs = join(__dirname, "..", "src", "game", "secretarySkillData.ts");

const SECRETARY_IDS = [
  "secretary_01",
  "secretary_02",
  "secretary_03",
  "secretary_04",
  "secretary_05",
];

const FALLBACK_ROWS = [];
for (const secretaryId of SECRETARY_IDS) {
  const nodes = [
    ["chief", "chief_cash_supply", "Cash & supply", 0.01, 3, "", 1, "root", "officeProduction"],
    ["chief", "chief_build_time", "Build speed", -0.02, 3, "chief_cash_supply", 1, "left", "structureBuildTime"],
    ["chief", "chief_structure_cost", "Structure cash", -0.01, 3, "chief_build_time", 2, "left", "structureBuildCost"],
    ["chief", "chief_research_time", "Research speed", -0.02, 3, "chief_cash_supply", 1, "right", "researchBuildTime"],
    ["chief", "chief_research_cost", "Research cash", -0.01, 3, "chief_research_time", 2, "right", "researchBuildCost"],
    ["teamLead", "lead_work", "On-site work", -0.02, 3, "", 1, "root", "jobWorkTime"],
    ["teamLead", "lead_travel", "Travel", -0.02, 3, "lead_work", 1, "left", "travelTime"],
    ["teamLead", "lead_field_supply", "Field supply", -0.02, 3, "lead_travel", 2, "left", "jobSupplyCost"],
    ["teamLead", "lead_payout", "Payout", 0.02, 3, "lead_work", 1, "right", "jobIncome"],
    ["teamLead", "lead_unit_hours", "Unit hours", 0.02, 3, "lead_payout", 2, "right", "jobUnitHours"],
    ["onSite", "onsite_posted_office", "Posted office", 0.01, 3, "", 1, "root", "onSiteReputation"],
    ["onSite", "onsite_recruit_time", "Hire time", -0.02, 3, "onsite_posted_office", 1, "left", "onSiteRecruitTime"],
    ["onSite", "onsite_recruit_cost", "Hire cost", -0.01, 3, "onsite_recruit_time", 2, "left", "onSiteRecruitCost"],
    ["onSite", "onsite_structure_time", "Build time", -0.02, 3, "onsite_posted_office", 1, "right", "onSiteStructureBuildTime"],
    ["onSite", "onsite_structure_cost", "Build cost", -0.01, 3, "onsite_structure_time", 2, "right", "onSiteStructureBuildCost"],
  ];
  for (const n of nodes) {
    const row = [secretaryId, ...n];
    const parsed = parseNodeRow(row);
    FALLBACK_ROWS.push(parsed);
  }
}

function cell(row, i) {
  const v = row[i];
  return v == null ? "" : String(v).trim();
}

function num(row, i, fallback) {
  const n = Number(row[i]);
  return Number.isFinite(n) ? n : fallback;
}

function parseNodeRow(row) {
  return {
    secretaryId: cell(row, 0),
    tree: cell(row, 1),
    nodeId: cell(row, 2),
    label: cell(row, 3),
    pctPerRank: num(row, 4, 0),
    maxRank: Math.max(1, Math.floor(num(row, 5, 3))),
    requires: cell(row, 6),
    gateRank: Math.max(1, Math.floor(num(row, 7, 1))),
    column: cell(row, 8) || "left",
    effectKind: cell(row, 9),
  };
}

function loadRows() {
  try {
    const wb = XLSX.read(readFileSync(resolveWorkbookPath()));
    const sheet = wb.Sheets["Secretary Skills"];
    if (!sheet) {
      console.warn("No Secretary Skills sheet — using embedded MVP rows.");
      return FALLBACK_ROWS;
    }
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const parsed = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const secretaryId = cell(row, 0);
      const nodeId = cell(row, 2);
      if (!secretaryId || !nodeId || !secretaryId.startsWith("secretary_")) continue;
      parsed.push(parseNodeRow(row));
    }
    if (parsed.length === 0) {
      console.warn("Secretary Skills empty — using embedded MVP rows.");
      return FALLBACK_ROWS;
    }
    return parsed;
  } catch (err) {
    console.warn("Workbook read failed — using embedded MVP rows.", err?.message ?? err);
    return FALLBACK_ROWS;
  }
}

function groupBySecretary(rows) {
  const map = {};
  for (const id of SECRETARY_IDS) {
    map[id] = { chief: [], teamLead: [], onSite: [] };
  }
  for (const row of rows) {
    const bucket = map[row.secretaryId];
    if (!bucket) continue;
    const tree =
      row.tree === "chief"
        ? "chief"
        : row.tree === "onSite" || row.tree === "onsite"
          ? "onSite"
          : "teamLead";
    bucket[tree].push(row);
  }
  return map;
}

function emitNode(n) {
  const col = ["root", "left", "right"].includes(n.column) ? n.column : "left";
  return `      {
        id: ${JSON.stringify(n.nodeId)},
        label: ${JSON.stringify(n.label)},
        pctPerRank: ${n.pctPerRank},
        maxRank: ${n.maxRank},
        requires: ${JSON.stringify(n.requires)},
        gateRank: ${n.gateRank},
        column: ${JSON.stringify(col)},
        effectKind: ${JSON.stringify(n.effectKind)},
      }`;
}

function emitTs(grouped) {
  const allChief = new Set();
  const allLead = new Set();
  const allOnSite = new Set();
  for (const id of SECRETARY_IDS) {
    for (const n of grouped[id].chief) allChief.add(n.nodeId);
    for (const n of grouped[id].teamLead) allLead.add(n.nodeId);
    for (const n of grouped[id].onSite) allOnSite.add(n.nodeId);
  }

  const chiefUnion = [...allChief].sort();
  const leadUnion = [...allLead].sort();
  const onSiteUnion = [...allOnSite].sort();

  const perSecretary = SECRETARY_IDS.map((id) => {
    const g = grouped[id];
    return `  ${JSON.stringify(id)}: {
    chief: {
      title: "Chief of Staff",
      note: "Active while she is Chief of Staff",
      nodes: [
${g.chief.map(emitNode).join(",\n")}
      ],
    },
    teamLead: {
      title: "Team lead",
      note: "Active while she leads a team",
      nodes: [
${g.teamLead.map(emitNode).join(",\n")}
      ],
    },
    onSite: {
      title: "On site bonus",
      note: "At her posted office only",
      nodes: [
${g.onSite.map(emitNode).join(",\n")}
      ],
    },
  }`;
  }).join(",\n");

  return `/** Generated by scripts/build-secretary-skill-data.mjs — do not edit. */
import type { SecretaryId } from "./types";

export const SECRETARY_MAX_LEVEL = 10;
export const SKILL_POINTS_PER_LEVEL = 2;
export const MAX_SKILL_RANK = 3;

export const RECRUITMENT_NET_WORTH_MILESTONE = 250_000;

export const GACHA_SECRETARY_IDS: SecretaryId[] = [
  "secretary_03",
  "secretary_04",
  "secretary_05",
];

export type SkillTreeColumn = "root" | "left" | "right";

export type ChiefSkillEffectKind =
  | "officeProduction"
  | "structureBuildTime"
  | "structureBuildCost"
  | "researchBuildTime"
  | "researchBuildCost";

export type TeamLeadSkillEffectKind =
  | "jobWorkTime"
  | "travelTime"
  | "jobSupplyCost"
  | "jobIncome"
  | "jobUnitHours";

export type OnSiteSkillEffectKind =
  | "onSiteReputation"
  | "onSiteRecruitTime"
  | "onSiteRecruitCost"
  | "onSiteStructureBuildTime"
  | "onSiteStructureBuildCost";

export type ChiefSkillNodeId =
${chiefUnion.map((id) => `  | ${JSON.stringify(id)}`).join("\n")};

export type TeamLeadSkillNodeId =
${leadUnion.map((id) => `  | ${JSON.stringify(id)}`).join("\n")};

export type OnSiteSkillNodeId =
${onSiteUnion.map((id) => `  | ${JSON.stringify(id)}`).join("\n")};

export interface SkillNodeDef<K extends string = string> {
  id: K;
  label: string;
  pctPerRank: number;
  maxRank: number;
  requires: string;
  gateRank: number;
  column: SkillTreeColumn;
  effectKind: string;
}

export interface SkillTreeDef<K extends string = string> {
  title: string;
  note: string;
  nodes: SkillNodeDef<K>[];
}

export interface SecretarySkillTrees {
  chief: SkillTreeDef<ChiefSkillNodeId>;
  teamLead: SkillTreeDef<TeamLeadSkillNodeId>;
  onSite: SkillTreeDef<OnSiteSkillNodeId>;
}

export const CHIEF_SKILL_NODES: readonly ChiefSkillNodeId[] = [
${chiefUnion.map((id) => `  ${JSON.stringify(id)},`).join("\n")}
];

export const TEAM_LEAD_SKILL_NODES: readonly TeamLeadSkillNodeId[] = [
${leadUnion.map((id) => `  ${JSON.stringify(id)},`).join("\n")}
];

export const ON_SITE_SKILL_NODES: readonly OnSiteSkillNodeId[] = [
${onSiteUnion.map((id) => `  ${JSON.stringify(id)},`).join("\n")}
];

export const SECRETARY_SKILL_TREES: Record<SecretaryId, SecretarySkillTrees> = {
${perSecretary}
};

export function skillTreesFor(secretaryId: SecretaryId): SecretarySkillTrees {
  const trees = SECRETARY_SKILL_TREES[secretaryId];
  if (!trees) {
    throw new Error(\`Unknown secretary skill trees: \${secretaryId}\`);
  }
  return trees;
}

export const EXP_TO_ADVANCE: number[] = [
  0, 100, 140, 190, 250, 320, 400, 490, 590, 700,
];

export function expRequiredForNextLevel(level: number): number {
  if (level >= SECRETARY_MAX_LEVEL) return 0;
  const next = EXP_TO_ADVANCE[level];
  return typeof next === "number" ? next : 400 + level * 100;
}

function emptyRanks<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

export function emptyChiefSkillRanks(): Record<ChiefSkillNodeId, number> {
  return emptyRanks(CHIEF_SKILL_NODES);
}

export function emptyTeamLeadSkillRanks(): Record<TeamLeadSkillNodeId, number> {
  return emptyRanks(TEAM_LEAD_SKILL_NODES);
}

export function emptyOnSiteSkillRanks(): Record<OnSiteSkillNodeId, number> {
  return emptyRanks(ON_SITE_SKILL_NODES);
}

export function skillRankPct(
  ranks: Record<string, number>,
  tree: SecretarySkillTrees,
  treeKey: keyof SecretarySkillTrees,
  nodeId: string,
): number {
  const def = tree[treeKey].nodes.find((n) => n.id === nodeId);
  if (!def) return 0;
  const rank = Math.min(def.maxRank, Math.max(0, ranks[nodeId] ?? 0));
  return def.pctPerRank * rank;
}

export function summedSkillPctByEffect(
  ranks: Record<string, number>,
  tree: SecretarySkillTrees,
  treeKey: keyof SecretarySkillTrees,
  effectKind: string,
): number {
  let total = 0;
  for (const node of tree[treeKey].nodes) {
    if (node.effectKind !== effectKind) continue;
    total += skillRankPct(ranks, tree, treeKey, node.id);
  }
  return total;
}
`;
}

const rows = loadRows();
const grouped = groupBySecretary(rows);
writeFileSync(outTs, emitTs(grouped), "utf8");
console.log(`Wrote ${outTs}`);
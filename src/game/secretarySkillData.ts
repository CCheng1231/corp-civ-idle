import type { SecretaryId } from "./types";

export const SECRETARY_MAX_LEVEL = 10;
export const SKILL_POINTS_PER_LEVEL = 2;
export const MAX_SKILL_RANK = 3;

export const RECRUITMENT_NET_WORTH_MILESTONE = 250_000;

/** Gacha pool — not granted by gov program. */
export const GACHA_SECRETARY_IDS: SecretaryId[] = [
  "secretary_03",
  "secretary_04",
  "secretary_05",
];

export type ChiefSkillNodeId =
  | "chief_cash_supply"
  | "chief_build_time"
  | "chief_research_time";

export type TeamLeadSkillNodeId =
  | "lead_travel"
  | "lead_work_time"
  | "lead_job_income";

export const CHIEF_SKILL_NODES: readonly ChiefSkillNodeId[] = [
  "chief_cash_supply",
  "chief_build_time",
  "chief_research_time",
];

export const TEAM_LEAD_SKILL_NODES: readonly TeamLeadSkillNodeId[] = [
  "lead_travel",
  "lead_work_time",
  "lead_job_income",
];

export interface SkillNodeDef {
  id: ChiefSkillNodeId | TeamLeadSkillNodeId;
  label: string;
  /** Effect per rank (fractional, e.g. 0.01 = +1%). Negative where reduction. */
  pctPerRank: number;
  maxRank: number;
}

export const CHIEF_SKILL_DEFS: Record<ChiefSkillNodeId, SkillNodeDef> = {
  chief_cash_supply: {
    id: "chief_cash_supply",
    label: "Cash & supply throughput",
    pctPerRank: 0.01,
    maxRank: MAX_SKILL_RANK,
  },
  chief_build_time: {
    id: "chief_build_time",
    label: "Structure build speed",
    pctPerRank: -0.02,
    maxRank: MAX_SKILL_RANK,
  },
  chief_research_time: {
    id: "chief_research_time",
    label: "Research speed",
    pctPerRank: -0.02,
    maxRank: MAX_SKILL_RANK,
  },
};

export const TEAM_LEAD_SKILL_DEFS: Record<TeamLeadSkillNodeId, SkillNodeDef> = {
  lead_travel: {
    id: "lead_travel",
    label: "Travel time",
    pctPerRank: -0.02,
    maxRank: MAX_SKILL_RANK,
  },
  lead_work_time: {
    id: "lead_work_time",
    label: "On-site work speed",
    pctPerRank: -0.02,
    maxRank: MAX_SKILL_RANK,
  },
  lead_job_income: {
    id: "lead_job_income",
    label: "Job payout",
    pctPerRank: 0.02,
    maxRank: MAX_SKILL_RANK,
  },
};

/** EXP required to advance from level L to L+1. */
export const EXP_TO_ADVANCE: number[] = [
  0,
  100,
  140,
  190,
  250,
  320,
  400,
  490,
  590,
  700,
];

export function expRequiredForNextLevel(level: number): number {
  if (level >= SECRETARY_MAX_LEVEL) return 0;
  const next = EXP_TO_ADVANCE[level];
  return typeof next === "number" ? next : 400 + level * 100;
}

export function emptyChiefSkillRanks(): Record<ChiefSkillNodeId, number> {
  return {
    chief_cash_supply: 0,
    chief_build_time: 0,
    chief_research_time: 0,
  };
}

export function emptyTeamLeadSkillRanks(): Record<TeamLeadSkillNodeId, number> {
  return {
    lead_travel: 0,
    lead_work_time: 0,
    lead_job_income: 0,
  };
}

export function chiefSkillPct(
  ranks: Record<ChiefSkillNodeId, number>,
  nodeId: ChiefSkillNodeId,
): number {
  const def = CHIEF_SKILL_DEFS[nodeId];
  const rank = Math.min(def.maxRank, Math.max(0, ranks[nodeId] ?? 0));
  return def.pctPerRank * rank;
}

export function teamLeadSkillPct(
  ranks: Record<TeamLeadSkillNodeId, number>,
  nodeId: TeamLeadSkillNodeId,
): number {
  const def = TEAM_LEAD_SKILL_DEFS[nodeId];
  const rank = Math.min(def.maxRank, Math.max(0, ranks[nodeId] ?? 0));
  return def.pctPerRank * rank;
}

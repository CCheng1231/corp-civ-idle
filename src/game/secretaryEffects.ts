import { SECRETARIES, secretaryById } from "./secretaryData";
import {
  createInitialSecretaryProgress,
  secretaryIsUnlocked,
} from "./secretaryProgress";
import {
  chiefSkillPct,
  CHIEF_SKILL_DEFS,
  type ChiefSkillNodeId,
  teamLeadSkillPct,
  TEAM_LEAD_SKILL_DEFS,
  type TeamLeadSkillNodeId,
} from "./secretarySkillData";
import type {
  ChiefOfStaffEffectKind,
  GameState,
  JobEngagement,
  ResourceCost,
  SecretaryId,
  SecretaryProgress,
  TeamLeadEffectKind,
} from "./types";

export type { ChiefOfStaffEffectKind, TeamLeadEffectKind };

export interface ChiefOfStaffEffect {
  kind: ChiefOfStaffEffectKind;
  pct: number;
}

const TEAM_LEAD_TREE_TO_KIND: Record<
  TeamLeadSkillNodeId,
  TeamLeadEffectKind
> = {
  lead_travel: "travelTime",
  lead_work_time: "jobWorkTime",
  lead_job_income: "jobIncome",
};

/** Skill-tree node that stacks with each team-lead identity kind. */
const TEAM_LEAD_KIND_SKILL_NODE: Record<
  TeamLeadEffectKind,
  TeamLeadSkillNodeId
> = {
  travelTime: "lead_travel",
  jobWorkTime: "lead_work_time",
  jobIncome: "lead_job_income",
  jobSupplyCost: "lead_travel",
  jobUnitHours: "lead_work_time",
};

function progressFor(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): SecretaryProgress {
  return state.secretaryProgress[secretaryId] ?? createInitialSecretaryProgress();
}

function chiefEffectFromData(chiefId: SecretaryId): ChiefOfStaffEffect | null {
  const def = secretaryById(chiefId);
  if (!def.chiefEffectKind) return null;
  return {
    kind: def.chiefEffectKind,
    pct: def.chiefEffectPct,
  };
}

export function chiefOfStaffEffect(chiefId: SecretaryId): ChiefOfStaffEffect | null {
  return chiefEffectFromData(chiefId);
}

export function secretaryVisibleOnRoster(
  def: (typeof SECRETARIES)[number],
  unlocks: GameState["secretaryUnlocks"],
): boolean {
  return unlocks[def.id] === true;
}

function identityChiefPct(
  chiefId: SecretaryId,
  kind: ChiefOfStaffEffectKind,
): number {
  const effect = chiefOfStaffEffect(chiefId);
  if (!effect || effect.kind !== kind) return 0;
  return effect.pct;
}

function totalChiefPct(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  kind: ChiefOfStaffEffectKind,
  treeNode?: ChiefSkillNodeId,
): number {
  let pct = identityChiefPct(state.chiefOfStaffId, kind);
  if (treeNode) {
    const ranks = progressFor(state, state.chiefOfStaffId).chiefSkillRanks;
    pct += chiefSkillPct(ranks, treeNode);
  }
  return pct;
}

function identityTeamLeadPctForKind(
  secretaryId: SecretaryId,
  kind: TeamLeadEffectKind,
): number {
  const def = secretaryById(secretaryId);
  if (def.teamLeadEffectKind !== kind) return 0;
  return def.teamLeadEffectPct;
}

function totalTeamLeadPctForKind(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
  kind: TeamLeadEffectKind,
): number {
  const ranks = progressFor(state, secretaryId).teamLeadSkillRanks;
  const skillNode = TEAM_LEAD_KIND_SKILL_NODE[kind];
  return (
    identityTeamLeadPctForKind(secretaryId, kind) +
    teamLeadSkillPct(ranks, skillNode)
  );
}

function totalTeamLeadPct(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
  treeNode: TeamLeadSkillNodeId,
): number {
  return totalTeamLeadPctForKind(
    state,
    secretaryId,
    TEAM_LEAD_TREE_TO_KIND[treeNode],
  );
}

function multFromPct(pct: number, base = 1): number {
  if (pct === 0) return base;
  return base * (1 + pct);
}

export function chiefOfficeProductionMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(
    totalChiefPct(state, "officeProduction", "chief_cash_supply"),
  );
}

export function chiefCashSupplyRateMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(chiefSkillPct(
    progressFor(state, state.chiefOfStaffId).chiefSkillRanks,
    "chief_cash_supply",
  ));
}

export function chiefStructureBuildTimeMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(
    chiefSkillPct(
      progressFor(state, state.chiefOfStaffId).chiefSkillRanks,
      "chief_build_time",
    ),
  );
}

export function chiefResearchBuildTimeMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(
    chiefSkillPct(
      progressFor(state, state.chiefOfStaffId).chiefSkillRanks,
      "chief_research_time",
    ),
  );
}

export function chiefRecruitCostMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(identityChiefPct(state.chiefOfStaffId, "recruitCost"));
}

function chiefScaledDurationMs(
  chiefId: SecretaryId,
  _state: Pick<GameState, "secretaryProgress">,
  baseMs: number,
  kind: ChiefOfStaffEffectKind,
  minMs = 1,
): number {
  const pct = identityChiefPct(chiefId, kind);
  if (pct === 0) return baseMs;
  return Math.max(minMs, Math.round(baseMs * (1 + pct)));
}

export function chiefTravelDurationMs(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  baseMs: number,
  minMs: number,
): number {
  return chiefScaledDurationMs(
    state.chiefOfStaffId,
    state,
    baseMs,
    "travelTime",
    minMs,
  );
}

export function recruitmentOrderDurationMsForChief(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  baseMs: number,
): number {
  return chiefScaledDurationMs(
    state.chiefOfStaffId,
    state,
    baseMs,
    "recruitTime",
    1000,
  );
}

export function teamLeadTravelDurationMs(
  state: Pick<GameState, "secretaryProgress">,
  teamLeadId: SecretaryId,
  baseMs: number,
  minMs: number,
): number {
  const pct = totalTeamLeadPct(state, teamLeadId, "lead_travel");
  if (pct === 0) return baseMs;
  return Math.max(minMs, Math.round(baseMs * (1 + pct)));
}

export function jobTravelDurationMsForPreview(
  state: GameState,
  _officeId: GameState["jobEngagements"][number]["officeId"],
  baseMs: number,
  teamLeadSecretaryId?: SecretaryId | null,
): number {
  const minMs = 1_000;
  if (teamLeadSecretaryId && secretaryIsUnlocked(state, teamLeadSecretaryId)) {
    return teamLeadTravelDurationMs(state, teamLeadSecretaryId, baseMs, minMs);
  }
  return Math.max(minMs, baseMs);
}

export function jobWorkDurationMsForEngagement(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  durationSec: number,
  engagement?: Pick<JobEngagement, "teamLeadSecretaryId">,
): number {
  const baseMs = Math.max(0, durationSec) * 1000;
  const teamLeadId = engagement?.teamLeadSecretaryId;
  if (teamLeadId) {
    const pct = totalTeamLeadPct(state, teamLeadId, "lead_work_time");
    if (pct !== 0) {
      return Math.max(1000, Math.round(baseMs * (1 + pct)));
    }
    return baseMs;
  }
  return chiefScaledDurationMs(
    state.chiefOfStaffId,
    state,
    baseMs,
    "jobWorkTime",
    1000,
  );
}

export function jobWorkDurationMs(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  durationSec: number,
): number {
  return jobWorkDurationMsForEngagement(state, durationSec);
}

export function jobWorkDurationSec(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  durationSec: number,
  engagement?: Pick<JobEngagement, "teamLeadSecretaryId">,
): number {
  return jobWorkDurationMsForEngagement(state, durationSec, engagement) / 1000;
}

export function teamLeadJobIncomeMult(
  state: Pick<GameState, "secretaryProgress">,
  teamLeadId: SecretaryId,
): number {
  return multFromPct(totalTeamLeadPctForKind(state, teamLeadId, "jobIncome"));
}

export function teamLeadTravelSupplyMult(
  state: Pick<GameState, "secretaryProgress">,
  teamLeadId: SecretaryId,
): number {
  return multFromPct(totalTeamLeadPctForKind(state, teamLeadId, "jobSupplyCost"));
}

export function teamLeadUnitHoursMult(
  state: Pick<GameState, "secretaryProgress">,
  teamLeadId: SecretaryId,
): number {
  return multFromPct(totalTeamLeadPctForKind(state, teamLeadId, "jobUnitHours"));
}

export function applyTeamLeadTravelSupplyCost(
  state: Pick<GameState, "secretaryProgress">,
  baseSupply: number,
  teamLeadSecretaryId?: SecretaryId | null,
): number {
  if (baseSupply <= 0 || !teamLeadSecretaryId) return baseSupply;
  return Math.max(
    0,
    Math.round(baseSupply * teamLeadTravelSupplyMult(state, teamLeadSecretaryId)),
  );
}

export function scaleResourceCost(
  cost: ResourceCost,
  mult: number,
): ResourceCost {
  if (mult === 1) return cost;
  const next: ResourceCost = {};
  for (const [key, val] of Object.entries(cost)) {
    if (val == null || val <= 0) continue;
    const k = key as keyof ResourceCost;
    next[k] = Math.max(0, Math.round(val * mult));
  }
  return next;
}

export function chiefOfStaffRateBreakdownLabel(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): string | null {
  const mult = chiefOfficeProductionMult(state);
  if (mult === 1) return null;
  const name = secretaryById(state.chiefOfStaffId).name;
  const pct = Math.round((mult - 1) * 100);
  return `Chief of Staff: ${name} (${pct}%)`;
}

export function effectiveChiefBonusLabel(
  chiefState: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  chiefId: SecretaryId,
): string {
  const def = secretaryById(chiefId);
  const progress = progressFor(chiefState, chiefId);
  const skillBits = CHIEF_SKILL_DEFS.chief_cash_supply
    ? Object.keys(CHIEF_SKILL_DEFS).filter(
        (node) => (progress.chiefSkillRanks[node as ChiefSkillNodeId] ?? 0) > 0,
      )
    : [];
  if (skillBits.length === 0) return def.chiefOfStaffBonus;
  return `${def.chiefOfStaffBonus} (+ skill tree)`;
}

export function effectiveTeamLeadBonusLabel(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): string {
  const def = secretaryById(secretaryId);
  const progress = progressFor(state, secretaryId);
  const trained = Object.keys(TEAM_LEAD_SKILL_DEFS).some(
    (node) => (progress.teamLeadSkillRanks[node as TeamLeadSkillNodeId] ?? 0) > 0,
  );
  if (!trained) return def.teamLeadBonus;
  return `${def.teamLeadBonus} (+ skill tree)`;
}

export function teamLeadTravelPctForSecretary(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): number {
  return totalTeamLeadPct(state, secretaryId, "lead_travel");
}

export function teamLeadIdentityBonusLabel(secretaryId: SecretaryId): string {
  return secretaryById(secretaryId).teamLeadBonus;
}

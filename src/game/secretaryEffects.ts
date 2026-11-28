import { SECRETARIES, secretaryById, SECRETARY_IDS } from "./secretaryData";
import {
  createInitialSecretaryProgress,
  ensureSecretaryProgressShape,
  secretaryIsUnlocked,
} from "./secretaryProgress";
import { secretaryPostedOffice } from "./secretaryPosting";
import {
  skillTreesFor,
  summedSkillPctByEffect,
} from "./secretarySkillData";
import { secretarySkinOnSiteWorkPctForEngagement } from "./secretarySkins";
import type {
  ChiefOfStaffEffectKind,
  GameState,
  JobEngagement,
  OfficeLocationId,
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

const TEAM_LEAD_SKILL_EFFECT: Record<TeamLeadEffectKind, string> = {
  travelTime: "travelTime",
  jobWorkTime: "jobWorkTime",
  jobIncome: "jobIncome",
  jobSupplyCost: "jobSupplyCost",
  jobUnitHours: "jobUnitHours",
};

function progressFor(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): SecretaryProgress {
  const raw = state.secretaryProgress[secretaryId];
  if (!raw) return createInitialSecretaryProgress();
  return ensureSecretaryProgressShape(raw);
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

function activeChiefSkillPct(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  effectKind: string,
): number {
  const ranks = progressFor(state, state.chiefOfStaffId).chiefSkillRanks;
  const trees = skillTreesFor(state.chiefOfStaffId);
  return summedSkillPctByEffect(ranks, trees, "chief", effectKind);
}

function totalChiefIdentityAndSkill(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
  identityKind: ChiefOfStaffEffectKind,
  treeEffectKind: string,
): number {
  return identityChiefPct(state.chiefOfStaffId, identityKind) +
    activeChiefSkillPct(state, treeEffectKind);
}

function identityTeamLeadPctForKind(
  secretaryId: SecretaryId,
  kind: TeamLeadEffectKind,
): number {
  const def = secretaryById(secretaryId);
  if (def.teamLeadEffectKind !== kind) return 0;
  return def.teamLeadEffectPct;
}

function activeTeamLeadSkillPct(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
  effectKind: string,
): number {
  const ranks = progressFor(state, secretaryId).teamLeadSkillRanks;
  const trees = skillTreesFor(secretaryId);
  return summedSkillPctByEffect(ranks, trees, "teamLead", effectKind);
}

function totalTeamLeadPctForKind(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
  kind: TeamLeadEffectKind,
): number {
  const effectKind = TEAM_LEAD_SKILL_EFFECT[kind];
  return (
    identityTeamLeadPctForKind(secretaryId, kind) +
    activeTeamLeadSkillPct(state, secretaryId, effectKind)
  );
}

export function onSiteEffectPctAtOffice(
  state: Pick<
    GameState,
  | "secretaryUnlocks"
  | "secretaryProgress"
  | "secretaryPostedOffice"
  | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
  effectKind: string,
): number {
  let total = 0;
  for (const id of SECRETARY_IDS) {
    if (!state.secretaryUnlocks[id]) continue;
    if (secretaryPostedOffice(state, id) !== officeId) continue;
    const ranks = progressFor(state, id).onSiteSkillRanks;
    const trees = skillTreesFor(id);
    total += summedSkillPctByEffect(ranks, trees, "onSite", effectKind);
  }
  return total;
}

function multFromPct(pct: number, base = 1): number {
  if (pct === 0) return base;
  return base * (1 + pct);
}

export function chiefOfficeProductionMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(
    totalChiefIdentityAndSkill(state, "officeProduction", "officeProduction"),
  );
}

export function chiefStructureBuildTimeMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(activeChiefSkillPct(state, "structureBuildTime"));
}

export function chiefStructureBuildCostMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(activeChiefSkillPct(state, "structureBuildCost"));
}

export function chiefResearchBuildTimeMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(activeChiefSkillPct(state, "researchBuildTime"));
}

export function chiefResearchBuildCostMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(activeChiefSkillPct(state, "researchBuildCost"));
}

export function chiefRecruitCostMult(
  state: Pick<GameState, "chiefOfStaffId" | "secretaryProgress">,
): number {
  return multFromPct(
    totalChiefIdentityAndSkill(state, "recruitCost", "recruitCost"),
  );
}

export function onSiteReputationMultAtOffice(
  state: Pick<
    GameState,
    | "secretaryUnlocks"
    | "secretaryProgress"
    | "secretaryPostedOffice"
    | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
): number {
  return multFromPct(onSiteEffectPctAtOffice(state, officeId, "onSiteReputation"));
}

export function onSiteRecruitTimeMultAtOffice(
  state: Pick<
    GameState,
    | "secretaryUnlocks"
    | "secretaryProgress"
    | "secretaryPostedOffice"
    | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
): number {
  return multFromPct(onSiteEffectPctAtOffice(state, officeId, "onSiteRecruitTime"));
}

export function onSiteRecruitCostMultAtOffice(
  state: Pick<
    GameState,
    | "secretaryUnlocks"
    | "secretaryProgress"
    | "secretaryPostedOffice"
    | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
): number {
  return multFromPct(onSiteEffectPctAtOffice(state, officeId, "onSiteRecruitCost"));
}

export function onSiteStructureBuildTimeMultAtOffice(
  state: Pick<
    GameState,
    | "secretaryUnlocks"
    | "secretaryProgress"
    | "secretaryPostedOffice"
    | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
): number {
  return multFromPct(
    onSiteEffectPctAtOffice(state, officeId, "onSiteStructureBuildTime"),
  );
}

export function onSiteStructureBuildCostMultAtOffice(
  state: Pick<
    GameState,
    | "secretaryUnlocks"
    | "secretaryProgress"
    | "secretaryPostedOffice"
    | "structureLevelsByLocation"
  >,
  officeId: OfficeLocationId,
): number {
  return multFromPct(
    onSiteEffectPctAtOffice(state, officeId, "onSiteStructureBuildCost"),
  );
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

export function recruitOrderDurationMsForOffice(
  state: GameState,
  officeId: OfficeLocationId,
  baseMs: number,
): number {
  const chiefMs = recruitmentOrderDurationMsForChief(state, baseMs);
  const onSiteMult = onSiteRecruitTimeMultAtOffice(state, officeId);
  return Math.max(1000, Math.round(chiefMs * onSiteMult));
}

export function teamLeadTravelDurationMs(
  state: Pick<GameState, "secretaryProgress">,
  teamLeadId: SecretaryId,
  baseMs: number,
  minMs: number,
): number {
  const pct = totalTeamLeadPctForKind(state, teamLeadId, "travelTime");
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

type JobWorkDurationState = Pick<
  GameState,
  "chiefOfStaffId" | "secretaryProgress"
> & {
  secretarySkins?: GameState["secretarySkins"];
};

export function jobWorkDurationMsForEngagement(
  state: JobWorkDurationState,
  durationSec: number,
  engagement?: Pick<JobEngagement, "teamLeadSecretaryId" | "definitionId">,
): number {
  const baseMs = Math.max(0, durationSec) * 1000;
  const teamLeadId = engagement?.teamLeadSecretaryId;
  if (teamLeadId) {
    let pct = totalTeamLeadPctForKind(state, teamLeadId, "jobWorkTime");
    pct += secretarySkinOnSiteWorkPctForEngagement(
      state,
      teamLeadId,
      engagement?.definitionId,
    );
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
  state: JobWorkDurationState,
  durationSec: number,
): number {
  return jobWorkDurationMsForEngagement(state, durationSec);
}

export function jobWorkDurationSec(
  state: JobWorkDurationState,
  durationSec: number,
  engagement?: Pick<JobEngagement, "teamLeadSecretaryId" | "definitionId">,
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

export function scaleResourceCostMultipliers(
  cost: ResourceCost,
  ...multipliers: number[]
): ResourceCost {
  return multipliers.reduce(
    (acc, mult) => scaleResourceCost(acc, mult),
    cost,
  );
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
  const trained = progress.chiefSkillRanks &&
    Object.values(progress.chiefSkillRanks).some((r) => (r ?? 0) > 0);
  if (!trained) return def.chiefOfStaffBonus;
  return `${def.chiefOfStaffBonus} (+ skill tree)`;
}

export function effectiveTeamLeadBonusLabel(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): string {
  const def = secretaryById(secretaryId);
  const progress = progressFor(state, secretaryId);
  const trained = Object.values(progress.teamLeadSkillRanks).some(
    (r) => (r ?? 0) > 0,
  );
  if (!trained) return def.teamLeadBonus;
  return `${def.teamLeadBonus} (+ skill tree)`;
}

export function teamLeadTravelPctForSecretary(
  state: Pick<GameState, "secretaryProgress">,
  secretaryId: SecretaryId,
): number {
  return totalTeamLeadPctForKind(state, secretaryId, "travelTime");
}

export function teamLeadIdentityBonusLabel(secretaryId: SecretaryId): string {
  return secretaryById(secretaryId).teamLeadBonus;
}
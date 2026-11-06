import { SECRETARIES, secretaryById } from "./secretaryData";
import type {
  ChiefOfStaffEffectKind,
  GameState,
  ResourceCost,
  SecretaryId,
} from "./types";

export type { ChiefOfStaffEffectKind };

export interface ChiefOfStaffEffect {
  kind: ChiefOfStaffEffectKind;
  pct: number;
}

/** Default team-lead travel when sheet missing (Secretary Stat: teamLeadTravelPct). */
export const TEAM_LEAD_TRAVEL_TIME_PCT = -0.05;

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

export function teamLeadTravelPctForSecretary(secretaryId: SecretaryId): number {
  return secretaryById(secretaryId).teamLeadTravelPct;
}

export function chiefOfficeProductionMult(chiefId: SecretaryId): number {
  const effect = chiefOfStaffEffect(chiefId);
  if (!effect || effect.kind !== "officeProduction") return 1;
  return 1 + effect.pct;
}

function chiefDurationMult(
  chiefId: SecretaryId,
  kind: Exclude<
    ChiefOfStaffEffectKind,
    "officeProduction" | "recruitCost"
  >,
): number {
  const effect = chiefOfStaffEffect(chiefId);
  if (!effect || effect.kind !== kind) return 1;
  return 1 + effect.pct;
}

export function chiefRecruitCostMult(chiefId: SecretaryId): number {
  const effect = chiefOfStaffEffect(chiefId);
  if (!effect || effect.kind !== "recruitCost") return 1;
  return 1 + effect.pct;
}

export function chiefScaledDurationMs(
  chiefId: SecretaryId,
  baseMs: number,
  kind: Exclude<
    ChiefOfStaffEffectKind,
    "officeProduction" | "recruitCost"
  >,
  minMs = 1,
): number {
  const mult = chiefDurationMult(chiefId, kind);
  if (mult === 1) return baseMs;
  return Math.max(minMs, Math.round(baseMs * mult));
}

export function chiefTravelDurationMs(
  state: Pick<GameState, "chiefOfStaffId">,
  baseMs: number,
  minMs: number,
): number {
  return chiefScaledDurationMs(
    state.chiefOfStaffId,
    baseMs,
    "travelTime",
    minMs,
  );
}

export function jobWorkDurationMs(
  state: Pick<GameState, "chiefOfStaffId">,
  durationSec: number,
): number {
  return chiefScaledDurationMs(
    state.chiefOfStaffId,
    Math.max(0, durationSec) * 1000,
    "jobWorkTime",
    1000,
  );
}

export function jobWorkDurationSec(
  state: Pick<GameState, "chiefOfStaffId">,
  durationSec: number,
): number {
  return jobWorkDurationMs(state, durationSec) / 1000;
}

export function recruitmentOrderDurationMsForChief(
  state: Pick<GameState, "chiefOfStaffId">,
  baseMs: number,
): number {
  return chiefScaledDurationMs(state.chiefOfStaffId, baseMs, "recruitTime", 1000);
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

/** Top resource-bar rate breakdown — only when Chief buffs /hr from structures. */
export function chiefOfStaffRateBreakdownLabel(chiefId: SecretaryId): string | null {
  const effect = chiefOfStaffEffect(chiefId);
  if (!effect || effect.kind !== "officeProduction") return null;
  const name = secretaryById(chiefId).name;
  const pct = Math.round(Math.abs(effect.pct) * 100);
  return `Chief of Staff: ${name} (${pct}%)`;
}

/** Roster visibility — gov unlock can override sheet in save (implementation). */
export function secretaryVisibleOnRoster(
  def: (typeof SECRETARIES)[number],
  gessesaUnlocked: boolean,
): boolean {
  if (def.id === "secretary_02" && gessesaUnlocked) return true;
  return def.inRoster;
}

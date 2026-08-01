import { crewPayoutMultiplier } from "./mapWorld";
import {
  RECRUITMENT_UNITS,
  type RecruitmentUnitDefinition,
} from "./recruitmentData";
import type {
  ContractorCategoryId,
  ContractorsByLocation,
  ProductionRates,
  ProjectDefinition,
  UnitAssignment,
  UnitId,
  UnitRoster,
} from "./types";

/** Jobs shorter than this (seconds) count as "short" for Part-timer. */
export const SHORT_JOB_DURATION_SEC = 75;

const unitByIdMap = new Map<UnitId, RecruitmentUnitDefinition>(
  RECRUITMENT_UNITS.map((u) => [u.id, u]),
);

export function unitDefinition(unitId: UnitId): RecruitmentUnitDefinition {
  const def = unitByIdMap.get(unitId);
  if (!def) throw new Error(`Unknown unit ${unitId}`);
  return def;
}

export function unitCategory(unitId: UnitId): ContractorCategoryId {
  return unitDefinition(unitId).category;
}

export function unitsInCategory(category: ContractorCategoryId): RecruitmentUnitDefinition[] {
  return RECRUITMENT_UNITS.filter((u) => u.category === category);
}

export function countInCategory(
  roster: UnitRoster,
  category: ContractorCategoryId,
): number {
  return unitsInCategory(category).reduce(
    (sum, def) => sum + (roster[def.id] ?? 0),
    0,
  );
}

export function assignmentCount(
  assignment: UnitAssignment,
  unitId: UnitId,
): number {
  return Math.max(0, Math.floor(assignment[unitId] ?? 0));
}

export function totalAssigned(assignment: UnitAssignment): number {
  return Object.values(assignment).reduce(
    (sum, count) => sum + Math.max(0, Math.floor(count ?? 0)),
    0,
  );
}

export function farmingAssigned(assignment: UnitAssignment): number {
  return countInCategoryFromAssignment(assignment, "farming");
}

function countInCategoryFromAssignment(
  assignment: UnitAssignment,
  category: ContractorCategoryId,
): number {
  let total = 0;
  for (const def of unitsInCategory(category)) {
    total += assignmentCount(assignment, def.id);
  }
  return total;
}

export function mergeAssignments(
  a: UnitAssignment,
  b: UnitAssignment,
): UnitAssignment {
  const merged: UnitAssignment = { ...a };
  for (const [key, val] of Object.entries(b)) {
    const unitId = key as UnitId;
    merged[unitId] = (merged[unitId] ?? 0) + Math.max(0, Math.floor(val ?? 0));
  }
  return merged;
}

export function subtractAssignmentFromRoster(
  roster: UnitRoster,
  assignment: UnitAssignment,
): UnitRoster {
  const next = { ...roster };
  for (const [key, val] of Object.entries(assignment)) {
    const unitId = key as UnitId;
    const count = Math.max(0, Math.floor(val ?? 0));
    if (count <= 0) continue;
    next[unitId] = Math.max(0, (next[unitId] ?? 0) - count);
  }
  return next;
}

export function addAssignmentToRoster(
  roster: UnitRoster,
  assignment: UnitAssignment,
): UnitRoster {
  const next = { ...roster };
  for (const [key, val] of Object.entries(assignment)) {
    const unitId = key as UnitId;
    const count = Math.max(0, Math.floor(val ?? 0));
    if (count <= 0) continue;
    next[unitId] = (next[unitId] ?? 0) + count;
  }
  return next;
}

export function canAssignFromRoster(
  roster: UnitRoster,
  assignment: UnitAssignment,
): boolean {
  for (const [key, val] of Object.entries(assignment)) {
    const unitId = key as UnitId;
    const count = Math.max(0, Math.floor(val ?? 0));
    if (count <= 0) continue;
    if ((roster[unitId] ?? 0) < count) return false;
  }
  return farmingAssigned(assignment) >= 1;
}

const INTEL_WEIGHT: Partial<Record<UnitId, number>> = {
  internet_surfer: 1,
  office_gossip: 0.8,
  linkedin_stalker: 1.5,
  data_entry_snoop: 0.5,
};

export function intelPointsForRoster(roster: UnitRoster): number {
  let total = 0;
  for (const def of unitsInCategory("intel")) {
    const weight = INTEL_WEIGHT[def.id] ?? 1;
    total += (roster[def.id] ?? 0) * weight;
  }
  return total;
}

export function firmIntelPoints(contractorsByLocation: ContractorsByLocation): number {
  return (
    intelPointsForRoster(contractorsByLocation.hq) +
    intelPointsForRoster(contractorsByLocation.branch)
  );
}

/** Active-contract intel drip from Data Entry Snoop (stub-friendly). */
export function missionIntelBonus(assignment: UnitAssignment): number {
  const snoops = assignmentCount(assignment, "data_entry_snoop");
  if (snoops <= 0) return 0;
  return snoops * farmingAssigned(assignment) * 0.3;
}

const DEFENSE_WEIGHT: Partial<Record<UnitId, number>> = {
  mall_cop: 3,
  night_watchman: 4,
  ex_bouncer: 8,
  corporate_security: 6,
};

export function espionageDefensePoints(roster: UnitRoster): number {
  let total = 0;
  for (const def of unitsInCategory("defense")) {
    total += (roster[def.id] ?? 0) * (DEFENSE_WEIGHT[def.id] ?? 0);
  }
  return total;
}

export function firmEspionageDefensePoints(
  contractorsByLocation: ContractorsByLocation,
): number {
  return (
    espionageDefensePoints(contractorsByLocation.hq) +
    espionageDefensePoints(contractorsByLocation.branch)
  );
}

export function espionageDefensePercentFromUnits(
  contractorsByLocation: ContractorsByLocation,
): number {
  return Math.min(75, firmEspionageDefensePoints(contractorsByLocation));
}

export function officePassiveMoodRates(roster: UnitRoster): number {
  let moodPerHour = 0;
  moodPerHour += (roster.janitor ?? 0) * 0.01;
  moodPerHour += (roster.office_gossip ?? 0) * 0.02;
  moodPerHour += (roster.office_mom_dad ?? 0) * 0.03;
  return moodPerHour;
}

export function officePassiveRatesForLocation(
  roster: UnitRoster,
): Partial<ProductionRates> {
  const mood = officePassiveMoodRates(roster);
  if (mood <= 0) return {};
  return { mood };
}

export interface MissionModifierResult {
  durationMult: number;
  payoutMult: number;
  farmingCount: number;
  supportCount: number;
  defenseCount: number;
  /** Phase 2+: incident / failure mitigation */
  failureRiskReduction: number;
  /** Phase 2+: minor incident mitigation */
  incidentReduction: number;
}

function projectHasTag(project: ProjectDefinition, tag: string): boolean {
  return project.tags?.includes(tag as NonNullable<ProjectDefinition["tags"]>[number]) ?? false;
}

export function computeMissionModifiers(
  assignment: UnitAssignment,
  project: ProjectDefinition,
  optimalCrew: number,
): MissionModifierResult {
  let durationMult = 1;
  let payoutMult = 1;
  let failureRiskReduction = 0;
  let incidentReduction = 0;

  const farmingCount = farmingAssigned(assignment);
  let supportCount = 0;
  let defenseCount = 0;

  payoutMult *= crewPayoutMultiplier(farmingCount, optimalCrew);

  const freshGrads = assignmentCount(assignment, "fresh_graduate");
  if (freshGrads > 0 && farmingCount <= optimalCrew) {
    payoutMult *= 0.85;
  }

  const partTimers = assignmentCount(assignment, "part_timer");
  if (partTimers > 0 && project.durationSec < SHORT_JOB_DURATION_SEC) {
    durationMult *= Math.pow(0.9, partTimers);
  }

  const clerks = assignmentCount(assignment, "office_clerk");
  if (clerks > 0) {
    payoutMult *= 1 + 0.05 * clerks;
  }

  const veterans = assignmentCount(assignment, "call_center_veteran");
  if (veterans > 0 && projectHasTag(project, "service")) {
    payoutMult *= 1 + 0.1 * veterans;
  }

  const bikeCouriers = assignmentCount(assignment, "bike_courier");
  if (bikeCouriers > 0) {
    durationMult *= Math.pow(0.92, bikeCouriers);
  }

  const teamLeads = assignmentCount(assignment, "junior_team_lead");
  if (teamLeads > 0) {
    const boostedFarming = Math.min(farmingCount, 3);
    if (boostedFarming > 0) {
      payoutMult *= 1 + 0.08 * teamLeads * (boostedFarming / 3);
    }
  }

  const officeParents = assignmentCount(assignment, "office_mom_dad");
  if (officeParents > 0) {
    durationMult *= Math.pow(0.95, officeParents);
  }

  const bouncers = assignmentCount(assignment, "ex_bouncer");
  if (bouncers > 0 && projectHasTag(project, "highRisk")) {
    failureRiskReduction += 0.1 * bouncers;
  }

  const corpSecurity = assignmentCount(assignment, "corporate_security");
  if (corpSecurity > 0 && projectHasTag(project, "official")) {
    payoutMult *= 1 + 0.05 * corpSecurity;
  }

  supportCount = countInCategoryFromAssignment(assignment, "support");
  defenseCount = countInCategoryFromAssignment(assignment, "defense");

  const mallCops = assignmentCount(assignment, "mall_cop");
  if (mallCops > 0) {
    incidentReduction += 0.05 * mallCops;
  }

  const janitors = assignmentCount(assignment, "janitor");
  if (janitors > 0) {
    incidentReduction += 0.01 * janitors;
  }

  return {
    durationMult,
    payoutMult,
    farmingCount,
    supportCount,
    defenseCount,
    failureRiskReduction: Math.min(0.5, failureRiskReduction),
    incidentReduction: Math.min(0.25, incidentReduction),
  };
}

export function transferHexBonus(unitId: UnitId, count: number): number {
  if (unitId !== "bike_courier" || count <= 0) return 0;
  return count;
}

export function formatAssignmentSummary(assignment: UnitAssignment): string {
  const parts: string[] = [];
  for (const def of RECRUITMENT_UNITS) {
    const count = assignmentCount(assignment, def.id);
    if (count > 0) parts.push(`${count}× ${def.name}`);
  }
  return parts.join(", ") || "none";
}

export function previewMissionModifiers(
  assignment: UnitAssignment,
  project: ProjectDefinition,
  optimalCrew: number,
): { durationSec: number; payoutPercent: number } {
  const { durationMult, payoutMult } = computeMissionModifiers(
    assignment,
    project,
    optimalCrew,
  );
  return {
    durationSec: Math.max(1, Math.round(project.durationSec * durationMult)),
    payoutPercent: Math.round(payoutMult * 100),
  };
}

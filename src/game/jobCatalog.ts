import { totalAssigned, unitDefinition } from "./unitEffects";
import { requiredMinUnitTierForJob } from "./jobUnitTier";
import { activePlayerId } from "../multiplayer/playerHq";
import {
  JOB_ENGAGE_CAPPED_SHIFT_HINT,
  jobDefinitionFromPosting,
  jobDefinitionForEngagement,
  jobDefinitionById as definitionByIdFromPostings,
} from "./jobDefinitions";
export { jobDefinitionForEngagement };
import { seedProceduralJobWorld } from "./jobSlots";
import type { JobLocationType } from "./jobSites";
import type {
  CommercialLotId,
  CompletionBand,
  GameState,
  JobDefinition,
  JobPosting,
  MajorHubId,
  TowerId,
  UnitAssignment,
  UnitId,
} from "./types";

export { JOB_ENGAGE_CAPPED_SHIFT_HINT };

export const BASE_JOB_ENGAGEMENT_CAP = 3;
export const LOCAL_PLAYER_ID = "local";

export function resolveJobDefinition(
  state: GameState,
  ref: { postingId?: string; definitionId?: string },
): JobDefinition {
  if (ref.postingId) {
    const posting = state.jobPostings.find((p) => p.id === ref.postingId);
    if (posting) return jobDefinitionForPosting(posting);
  }
  const posting = state.jobPostings.find(
    (p) => p.definitionId === ref.definitionId,
  );
  if (posting) return jobDefinitionForPosting(posting);
  return definitionByIdFromPostings(ref.definitionId ?? "", state.jobPostings);
}

/** @deprecated Prefer resolveJobDefinition(state, { definitionId }) or jobDefinitionForPosting. */
export function jobDefinitionById(state: GameState, id: string): JobDefinition {
  return resolveJobDefinition(state, { definitionId: id });
}

export function jobDefinitionForPosting(posting: JobPosting): JobDefinition {
  return jobDefinitionFromPosting(posting);
}

export function postingsForMajorHub(
  state: GameState,
  majorHubId: MajorHubId,
): JobPosting[] {
  return state.jobPostings.filter((p) => {
    if (p.status !== "open") return false;
    if (p.majorHubId === majorHubId) return true;
    try {
      const def = jobDefinitionForPosting(p);
      return def.majorHubId === majorHubId && !p.commercialLotId;
    } catch {
      return false;
    }
  });
}

export function postingsForTower(
  state: GameState,
  towerId: TowerId,
): JobPosting[] {
  return state.jobPostings.filter((p) => {
    if (p.status !== "open") return false;
    if (p.towerId === towerId) return true;
    try {
      const def = jobDefinitionForPosting(p);
      return def.towerId === towerId && !p.commercialLotId;
    } catch {
      return false;
    }
  });
}

export function postingsForCommercialLot(
  state: GameState,
  commercialLotId: CommercialLotId,
): JobPosting[] {
  return state.jobPostings.filter((p) => {
    if (p.status !== "open") return false;
    if (p.commercialLotId === commercialLotId) return true;
    try {
      const def = jobDefinitionForPosting(p);
      return def.commercialLotId === commercialLotId;
    } catch {
      return false;
    }
  });
}

export function postingsForLocationId(
  state: GameState,
  locationId: string,
): JobPosting[] {
  return state.jobPostings.filter(
    (p) => p.status === "open" && p.locationId === locationId,
  );
}

export function postingById(
  state: GameState,
  postingId: string,
): JobPosting | undefined {
  return state.jobPostings.find((p) => p.id === postingId);
}

export function maxJobEngagements(state: GameState): number {
  return (
    BASE_JOB_ENGAGEMENT_CAP + (state.researchLevels.portfolio_management ?? 0)
  );
}

export function activeBranchEstablishmentTransitCount(
  state: GameState,
): number {
  const owner = activePlayerId(state);
  return state.branchEstablishmentTransits.filter(
    (t) => t.ownerPlayerId === owner,
  ).length;
}

export function activeEngagementCount(state: GameState): number {
  return (
    state.jobEngagements.length + activeBranchEstablishmentTransitCount(state)
  );
}

export function canEngageMoreJobs(state: GameState): boolean {
  return activeEngagementCount(state) < maxJobEngagements(state);
}

export function completionBand(
  unitHoursCompleted: number,
  unitHoursTotal: number,
): CompletionBand {
  if (unitHoursTotal <= 0) return "none";
  const pct = (unitHoursCompleted / unitHoursTotal) * 100;
  if (pct <= 0) return "none";
  if (pct <= 20) return "minimal";
  if (pct <= 40) return "in_progress";
  if (pct <= 60) return "midway";
  if (pct <= 80) return "almost";
  return "finishing";
}

export const COMPLETION_BAND_RANK: Record<CompletionBand, number> = {
  none: 0,
  minimal: 1,
  in_progress: 2,
  midway: 3,
  almost: 4,
  finishing: 5,
};

export function completionBandLabel(band: CompletionBand): string {
  switch (band) {
    case "none":
      return "None";
    case "minimal":
      return "Minimal";
    case "in_progress":
      return "In progress";
    case "midway":
      return "Midway";
    case "almost":
      return "Almost";
    case "finishing":
      return "Finishing";
    default:
      return band;
  }
}

export const COMPLETION_BANDS: CompletionBand[] = [
  "none",
  "minimal",
  "in_progress",
  "midway",
  "almost",
  "finishing",
];

export function jobCompletionSupplyBonus(def: JobDefinition): number {
  return Math.max(0, Math.floor(def.completionPayout?.supply ?? 0));
}

export function jobCompletionConnectionBonus(def: JobDefinition): number {
  return Math.max(0, Math.floor(def.completionPayout?.connection ?? 0));
}

export function hiddenTotalCash(def: JobDefinition): number {
  return def.cashPerUnitHour * def.unitHoursTotal;
}

export function returnPerHour(def: JobDefinition, unitCount: number): number {
  return def.cashPerUnitHour * Math.max(0, unitCount);
}

export function actualShiftReturnPerHour(
  def: JobDefinition,
  posting: Pick<JobPosting, "unitHoursCompleted">,
  unitCount: number,
): number {
  const crew = Math.max(0, unitCount);
  if (crew <= 0 || def.durationSec <= 0) return 0;
  const shiftHours = def.durationSec / 3600;
  const offered = crew * shiftHours;
  const remaining = Math.max(0, def.unitHoursTotal - posting.unitHoursCompleted);
  const effective = Math.min(offered, remaining);
  return (effective * def.cashPerUnitHour) / shiftHours;
}

export function assignmentMeetsJobRequirements(
  assignment: UnitAssignment,
  def: JobDefinition,
): boolean {
  const minUnitTier = requiredMinUnitTierForJob(def);
  if (totalAssigned(assignment) < 1) return false;
  for (const [key, val] of Object.entries(assignment)) {
    const count = Math.max(0, Math.floor(val ?? 0));
    if (count <= 0) continue;
    const unitId = key as UnitId;
    const unit = unitDefinition(unitId);
    if (unit.tier < minUnitTier) return false;
  }
  return true;
}

export function mergeMissingJobPostings(
  existing: JobPosting[],
  _now: number,
): JobPosting[] {
  return existing;
}

export function initializeJobPostings(
  now: number,
  settings?: GameState["settings"],
  worldSeed?: string,
): JobPosting[] {
  return seedProceduralJobWorld({ settings, worldSeed }, now).jobPostings;
}

export const LOCATION_TYPE_LABELS: Record<JobLocationType, string> = {
  police_station: "Police station",
  hospital: "Hospital",
  tower: "Tower",
  major_hub: "Major hub",
  city_hall: "City Hall",
};

/** @deprecated Use LOCATION_TYPE_LABELS */
export const BUSINESS_TYPE_LABELS = LOCATION_TYPE_LABELS as unknown as Record<
  string,
  string
>;

export const JOB_SIZE_LABELS: Record<JobDefinition["size"], string> = {
  small: "Small",
  mid: "Mid",
  huge: "Huge",
};

export const JOB_SIZES: JobDefinition["size"][] = ["small", "mid", "huge"];
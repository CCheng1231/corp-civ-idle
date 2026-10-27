import { JOB_DEFINITIONS } from "./jobHubData";
import { totalAssigned, unitDefinition } from "./unitEffects";
import { requiredMinUnitTierForJob } from "./jobUnitTier";
import type {
  CommercialLotId,
  CompletionBand,
  GameState,
  JobDefinition,
  JobPosting,
  TowerId,
  UnitAssignment,
  UnitId,
} from "./types";

export const BASE_JOB_ENGAGEMENT_CAP = 3;
export const LOCAL_PLAYER_ID = "local";

const definitionById = new Map(JOB_DEFINITIONS.map((d) => [d.id, d]));

export function jobDefinitionById(id: string): JobDefinition {
  const def = definitionById.get(id);
  if (!def) throw new Error(`Unknown job definition ${id}`);
  return def;
}

export function jobDefinitionForPosting(posting: JobPosting): JobDefinition {
  return jobDefinitionById(posting.definitionId);
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

export function activeEngagementCount(state: GameState): number {
  return state.jobEngagements.length;
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

/** Ordered bands for UI tooltips / legends. */
export const COMPLETION_BANDS: CompletionBand[] = [
  "none",
  "minimal",
  "in_progress",
  "midway",
  "almost",
  "finishing",
];

export function hiddenTotalCash(def: JobDefinition): number {
  return def.cashPerUnitHour * def.unitHoursTotal;
}

/** Full crew rate if the posting always has work left (expected). */
export function returnPerHour(def: JobDefinition, unitCount: number): number {
  return def.cashPerUnitHour * Math.max(0, unitCount);
}

/**
 * Average $/hr over one full shift for this crew on this posting.
 * Caps at remaining job work — idle time after the posting fills pays nothing.
 */
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
    if (unit.category !== def.requiredCategory) return false;
    if (unit.tier < minUnitTier) return false;
  }
  return true;
}

function newPostingId(definitionId: string, now: number): string {
  return `${definitionId}_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createPostingFromDefinition(
  def: JobDefinition,
  now: number,
): JobPosting {
  return {
    id: newPostingId(def.id, now),
    definitionId: def.id,
    towerId: def.towerId ?? null,
    commercialLotId: def.commercialLotId ?? null,
    spawnedAt: now,
    expiresAt: now + def.expirationSec * 1000,
    unitHoursCompleted: 0,
    status: "open",
    contributors: [],
  };
}

export function initializeJobPostings(now: number): JobPosting[] {
  return JOB_DEFINITIONS.map((def) => createPostingFromDefinition(def, now));
}

export const BUSINESS_TYPE_LABELS: Record<JobDefinition["businessType"], string> = {
  theme_park: "Theme park",
  hospital: "Hospital",
  science_lab: "Science lab",
  restaurant: "Restaurant",
  retail_shop: "Retail shop",
  research_lab: "Research lab",
  big_corp: "Big Corp",
  start_up: "Start up",
  gov: "Gov",
  family_business: "Family business",
  mall_management: "Mall management",
};

export const JOB_SIZE_LABELS: Record<JobDefinition["size"], string> = {
  small: "Small",
  mid: "Mid",
  huge: "Huge",
};

/** Ordered sizes for UI tooltips / legends. */
export const JOB_SIZES: JobDefinition["size"][] = ["small", "mid", "huge"];

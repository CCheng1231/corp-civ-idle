import {
  BUSINESS_TYPE_LABELS,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
  returnPerHour,
} from "./jobs";
import { OFFICE_TOWERS, REGION_LABELS, towerById } from "./mapWorld";
import type {
  BusinessType,
  ContractorCategoryId,
  GameState,
  JobPosting,
  JobSize,
  JobTier,
  MapRegion,
  TowerId,
} from "./types";

export type JobBoardSort =
  | "expires_soon"
  | "expires_late"
  | "payout_high"
  | "payout_low"
  | "duration_short"
  | "duration_long"
  | "tier_high"
  | "title_az";

export interface JobBoardFilters {
  region: MapRegion | "all";
  towerId: TowerId | "all";
  businessType: BusinessType | "all";
  tier: JobTier | "all";
  size: JobSize | "all";
  category: ContractorCategoryId | "all";
}

export const DEFAULT_JOB_BOARD_FILTERS: JobBoardFilters = {
  region: "all",
  towerId: "all",
  businessType: "all",
  tier: "all",
  size: "all",
  category: "all",
};

export function countActiveJobBoardFilters(filters: JobBoardFilters): number {
  let count = 0;
  if (filters.region !== "all") count++;
  if (filters.towerId !== "all") count++;
  if (filters.businessType !== "all") count++;
  if (filters.tier !== "all") count++;
  if (filters.size !== "all") count++;
  if (filters.category !== "all") count++;
  return count;
}

export interface JobBoardFilterSummary {
  key: keyof JobBoardFilters;
  label: string;
}

/** Human-readable labels for each non-default filter (toolbar chips). */
export function activeJobBoardFilterSummaries(
  filters: JobBoardFilters,
): JobBoardFilterSummary[] {
  const summaries: JobBoardFilterSummary[] = [];
  const categories = jobBoardFilterOptions().categories;

  if (filters.region !== "all") {
    summaries.push({
      key: "region",
      label: REGION_LABELS[filters.region],
    });
  }
  if (filters.towerId !== "all") {
    summaries.push({
      key: "towerId",
      label: towerById(filters.towerId).name,
    });
  }
  if (filters.businessType !== "all") {
    summaries.push({
      key: "businessType",
      label: BUSINESS_TYPE_LABELS[filters.businessType],
    });
  }
  if (filters.tier !== "all") {
    summaries.push({
      key: "tier",
      label: `Tier ${filters.tier}`,
    });
  }
  if (filters.size !== "all") {
    summaries.push({
      key: "size",
      label: JOB_SIZE_LABELS[filters.size],
    });
  }
  if (filters.category !== "all") {
    const category = categories.find((entry) => entry.id === filters.category);
    summaries.push({
      key: "category",
      label: category?.label ?? filters.category,
    });
  }

  return summaries;
}

export const JOB_BOARD_SORT_LABELS: Record<JobBoardSort, string> = {
  expires_soon: "Expiration (soonest)",
  expires_late: "Expiration (latest)",
  payout_high: "Payout rate (high)",
  payout_low: "Payout rate (low)",
  duration_short: "Shift length (short)",
  duration_long: "Shift length (long)",
  tier_high: "Tier (high first)",
  title_az: "Title (A–Z)",
};

export function openJobPostings(state: GameState): JobPosting[] {
  return state.jobPostings.filter((posting) => posting.status === "open");
}

export function filterAndSortJobPostings(
  postings: JobPosting[],
  filters: JobBoardFilters,
  sort: JobBoardSort,
  now = Date.now(),
): JobPosting[] {
  const filtered = postings.filter((posting) => {
    const def = jobDefinitionForPosting(posting);
    const tower = towerById(posting.towerId);

    if (filters.region !== "all" && tower.region !== filters.region) {
      return false;
    }
    if (filters.towerId !== "all" && posting.towerId !== filters.towerId) {
      return false;
    }
    if (filters.businessType !== "all" && def.businessType !== filters.businessType) {
      return false;
    }
    if (filters.tier !== "all" && def.tier !== filters.tier) {
      return false;
    }
    if (filters.size !== "all" && def.size !== filters.size) {
      return false;
    }
    if (filters.category !== "all" && def.requiredCategory !== filters.category) {
      return false;
    }
    if (posting.expiresAt <= now) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const defA = jobDefinitionForPosting(a);
    const defB = jobDefinitionForPosting(b);

    switch (sort) {
      case "expires_soon":
        return a.expiresAt - b.expiresAt;
      case "expires_late":
        return b.expiresAt - a.expiresAt;
      case "payout_high":
        return defB.cashPerUnitHour - defA.cashPerUnitHour;
      case "payout_low":
        return defA.cashPerUnitHour - defB.cashPerUnitHour;
      case "duration_short":
        return defA.durationSec - defB.durationSec;
      case "duration_long":
        return defB.durationSec - defA.durationSec;
      case "tier_high":
        return defB.tier - defA.tier || defA.title.localeCompare(defB.title);
      case "title_az":
        return defA.title.localeCompare(defB.title);
      default:
        return 0;
    }
  });

  return filtered;
}

export function jobBoardFilterOptions() {
  return {
    regions: Object.entries(REGION_LABELS) as [MapRegion, string][],
    towers: OFFICE_TOWERS.map((tower) => ({
      id: tower.id,
      label: tower.name,
      region: tower.region,
    })),
    businessTypes: Object.entries(BUSINESS_TYPE_LABELS) as [
      BusinessType,
      string,
    ][],
    tiers: [1, 2] as JobTier[],
    sizes: ["small", "mid", "huge"] as JobSize[],
    categories: [
      { id: "farming" as const, label: "Farming" },
      { id: "defense" as const, label: "Defense" },
      { id: "intel" as const, label: "Intel" },
      { id: "support" as const, label: "Support" },
    ],
  };
}

export function formatJobDurationSec(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)} hr`;
  if (sec >= 60) return `${Math.round(sec / 60)} min`;
  return `${sec}s`;
}

/** Preview payout per hour for one unit on this job. */
export function jobPayoutPerHour(posting: JobPosting): number {
  return returnPerHour(jobDefinitionForPosting(posting), 1);
}

import {
  LOCATION_TYPE_LABELS,
  JOB_SIZE_LABELS,
  jobDefinitionForPosting,
  returnPerHour,
} from "./jobs";
import {
  OFFICE_TOWERS,
  REGION_LABELS,
  hexDistanceFromMainOfficeForState,
  jobSiteCoordForPosting,
  jobSiteRegionForPosting,
  towerById,
} from "./mapWorld";
import type {
  GameState,
  JobDefinition,
  JobLocationType,
  JobPosting,
  JobSize,
  JobTier,
  MapRegion,
  TowerId,
} from "./types";

export type JobSiteKindFilter = JobLocationType;

export const JOB_SITE_KIND_FILTER_LABELS: Record<JobSiteKindFilter, string> = {
  police_station: "Police station",
  hospital: "Hospital",
  tower: "Tower",
  major_hub: "Major hub",
  city_hall: "City Hall",
};

/** @deprecated Alias for location-type filters. */
export const JOB_LOCATION_TYPE_FILTER_LABELS = JOB_SITE_KIND_FILTER_LABELS;

export function jobSiteKindForPosting(
  posting: JobPosting,
  def: JobDefinition,
): JobSiteKindFilter {
  const t =
    posting.locationType ?? def.locationType ?? inferLocationType(posting, def);
  return t ?? "tower";
}

function inferLocationType(
  posting: JobPosting,
  def: JobDefinition,
): JobLocationType | undefined {
  if (def.majorHubId || posting.majorHubId) return "major_hub";
  if (def.towerId || posting.towerId) return "tower";
  return def.locationType;
}

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
  siteType: JobSiteKindFilter | "all";
  locationType: JobLocationType | "all";
  tier: JobTier | "all";
  size: JobSize | "all";
}

export const DEFAULT_JOB_BOARD_FILTERS: JobBoardFilters = {
  region: "all",
  towerId: "all",
  siteType: "all",
  locationType: "all",
  tier: "all",
  size: "all",
};

export function countActiveJobBoardFilters(filters: JobBoardFilters): number {
  let count = 0;
  if (filters.region !== "all") count++;
  if (filters.towerId !== "all") count++;
  if (filters.siteType !== "all") count++;
  if (filters.locationType !== "all") count++;
  if (filters.tier !== "all") count++;
  if (filters.size !== "all") count++;
  return count;
}

export interface JobBoardFilterSummary {
  key: keyof JobBoardFilters;
  label: string;
}

export function activeJobBoardFilterSummaries(
  filters: JobBoardFilters,
): JobBoardFilterSummary[] {
  const summaries: JobBoardFilterSummary[] = [];

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
  if (filters.siteType !== "all") {
    summaries.push({
      key: "siteType",
      label: JOB_SITE_KIND_FILTER_LABELS[filters.siteType],
    });
  }
  if (filters.locationType !== "all") {
    summaries.push({
      key: "locationType",
      label: LOCATION_TYPE_LABELS[filters.locationType],
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
    let def;
    try {
      def = jobDefinitionForPosting(posting);
    } catch {
      return false;
    }
    const region = jobSiteRegionForPosting(posting, def);

    if (filters.region !== "all" && region !== filters.region) {
      return false;
    }
    if (filters.siteType !== "all") {
      if (jobSiteKindForPosting(posting, def) !== filters.siteType) {
        return false;
      }
    }
    if (filters.towerId !== "all") {
      if (posting.commercialLotId) return false;
      if (posting.towerId !== filters.towerId) return false;
    }
  if (filters.locationType !== "all") {
      const locType =
        posting.locationType ?? def.locationType ?? jobSiteKindForPosting(posting, def);
      if (locType !== filters.locationType) return false;
    }
    if (filters.tier !== "all" && def.tier !== filters.tier) {
      return false;
    }
    if (filters.size !== "all" && def.size !== filters.size) {
      return false;
    }
    if (posting.expiresAt <= now) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let defA;
    let defB;
    try {
      defA = jobDefinitionForPosting(a);
      defB = jobDefinitionForPosting(b);
    } catch {
      return 0;
    }

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

export function sortJobPostingsByDistanceFromMainOffice(
  state: GameState,
  postings: JobPosting[],
): JobPosting[] {
  const distanceById = new Map<string, number>();
  for (const posting of postings) {
    try {
      const def = jobDefinitionForPosting(posting);
      distanceById.set(
        posting.id,
        hexDistanceFromMainOfficeForState(
          state,
          jobSiteCoordForPosting(posting, def, state.settings),
        ),
      );
    } catch {
      distanceById.set(posting.id, Number.MAX_SAFE_INTEGER);
    }
  }
  return [...postings].sort((a, b) => {
    const distA = distanceById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const distB = distanceById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return distA - distB || a.expiresAt - b.expiresAt;
  });
}

export function jobBoardFilterOptions() {
  return {
    regions: Object.entries(REGION_LABELS) as [MapRegion, string][],
    towers: OFFICE_TOWERS.map((tower) => ({
      id: tower.id,
      label: tower.name,
      region: tower.region,
    })),
    locationTypes: Object.entries(LOCATION_TYPE_LABELS) as [
      JobLocationType,
      string,
    ][],
    siteTypes: Object.entries(JOB_SITE_KIND_FILTER_LABELS) as [
      JobSiteKindFilter,
      string,
    ][],
    tiers: [1, 2] as JobTier[],
    sizes: ["small", "mid", "huge"] as JobSize[],
  };
}

export function formatJobDurationSec(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}hr`;
  if (sec >= 60) return `${Math.round(sec / 60)}m`;
  return `${sec}s`;
}

export function formatJobPostingExpiresHours(
  expiresAt: number,
  now = Date.now(),
): string {
  const msLeft = Math.max(0, expiresAt - now);
  const hours = msLeft / 3_600_000;
  if (hours < 1) return "<1hr";
  return `${Math.floor(hours)}hr`;
}

/** @deprecated Use formatJobPostingExpiresHours */
export function formatJobPostingExpiresLabel(
  expiresAt: number,
  now = Date.now(),
  _options?: { titleLength?: number },
): string {
  return formatJobPostingExpiresHours(expiresAt, now);
}

/** Visible nominal engage rate ($/hr) for preview buttons. */
export function nominalEngageRatePerHour(
  def: JobDefinition,
  unitCount: number,
  incomeMult = 1,
): number {
  return returnPerHour(def, unitCount) * incomeMult;
}

/** Visible per-unit-hour rate on list rows (contract totals stay hidden). */
export function jobPayoutPerHour(posting: JobPosting): number {
  return jobDefinitionForPosting(posting).cashPerUnitHour;
}
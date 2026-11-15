import type { JobDefinition, JobPosting } from "./types";
import { jobSiteById } from "./jobSites";

export const JOB_ENGAGE_CAPPED_SHIFT_HINT =
  "Not enough work left for a full shift at this size.";

export function isProceduralPosting(
  posting: Pick<JobPosting, "definitionId" | "locationId">,
): boolean {
  return (
    posting.definitionId.startsWith("proc:") ||
    Boolean(posting.locationId && posting.locationId.length > 0)
  );
}

export function jobDefinitionFromPosting(posting: JobPosting): JobDefinition {
  if (!posting.locationId || !posting.locationType || !posting.title) {
    throw new Error(`Posting ${posting.id} missing procedural job fields`);
  }
  const site = jobSiteById(posting.locationId);
  return {
    id: posting.definitionId,
    locationId: posting.locationId,
    locationType: posting.locationType,
    towerId: site?.towerId,
    majorHubId: site?.majorHubId,
    tier: posting.tier ?? 1,
    size: posting.size ?? "small",
    title: posting.title,
    description: posting.description ?? posting.title,
    durationSec: posting.durationSec ?? 3600,
    expirationSec: posting.expirationSec ?? 86_400,
    cashPerUnitHour: posting.cashPerUnitHour ?? 10,
    unitHoursTotal: posting.unitHoursTotal ?? 100,
    bonusPercent: posting.bonusPercent ?? 0.1,
    minUnitTier: posting.minUnitTier ?? posting.tier ?? 1,
    completionPayout: posting.completionPayout ?? {},
  };
}

export function jobDefinitionById(
  id: string,
  postings: JobPosting[],
): JobDefinition {
  const posting = postings.find((p) => p.definitionId === id);
  if (posting) {
    return jobDefinitionFromPosting(posting);
  }
  throw new Error(`Unknown job definition ${id}`);
}

export function jobDefinitionForEngagement(
  state: { jobPostings: JobPosting[] },
  engagement: { postingId: string; definitionId: string },
): JobDefinition {
  const byPosting = state.jobPostings.find((p) => p.id === engagement.postingId);
  if (byPosting) return jobDefinitionFromPosting(byPosting);
  return jobDefinitionById(engagement.definitionId, state.jobPostings);
}
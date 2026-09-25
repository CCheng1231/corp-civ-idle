import {
  jobTravelDurationMsForDefinition,
  jobTravelHexesToCoord,
  roundTripTravelSupplyCost,
} from "./mapTravel";
import { jobSiteCoordForDefinition } from "./mapWorld";
import {
  canAssignFromRoster,
  subtractAssignmentFromRoster,
  totalAssigned,
} from "./unitEffects";
import { applyOfficeCost, canAffordAtOffice } from "./constants";
import { resolveOfficeLocation } from "./officeSelection";
import type { GameState, JobEngagement, UnitAssignment } from "./types";
import { formatTimerRemaining, scheduleTimerAt } from "./timers";
import {
  activeEngagementCount,
  assignmentMeetsJobRequirements,
  canEngageMoreJobs,
  jobDefinitionById,
  maxJobEngagements,
  postingById,
} from "./jobCatalog";
import { settleCancelledEngagement } from "./jobEngagementSim";

export function cancelJobEngagement(
  state: GameState,
  engagementId: string,
  now: number,
): GameState {
  const existing = state.jobEngagements.find((e) => e.id === engagementId);
  if (!existing) return state;
  if (existing.phase === "returning") return state;
  return settleCancelledEngagement(state, engagementId, now);
}

export function engageJobPosting(
  state: GameState,
  postingId: string,
  crewAssigned: UnitAssignment,
  now: number,
): GameState {
  if (!canEngageMoreJobs(state)) return state;
  const posting = postingById(state, postingId);
  if (!posting || posting.status !== "open") return state;
  if (posting.expiresAt <= now) return state;

  const def = jobDefinitionById(posting.definitionId);
  const officeId = resolveOfficeLocation(state);
  const roster = state.contractorsByLocation[officeId];
  if (!canAssignFromRoster(roster, crewAssigned)) return state;
  if (!assignmentMeetsJobRequirements(crewAssigned, def)) return state;

  const travelHexes = jobTravelHexesToCoord(
    state,
    officeId,
    jobSiteCoordForDefinition(def),
  );
  const unitCount = totalAssigned(crewAssigned);
  const tripSupply = roundTripTravelSupplyCost(travelHexes, unitCount);
  if (!canAffordAtOffice(state, officeId, { supply: tripSupply })) {
    return state;
  }

  let next = structuredClone(state);
  next.contractorsByLocation[officeId] = subtractAssignmentFromRoster(
    roster,
    crewAssigned,
  );
  if (tripSupply > 0) {
    next = applyOfficeCost(next, officeId, { supply: tripSupply });
  }
  const travelMs = jobTravelDurationMsForDefinition(next, officeId, def);
  next.jobEngagements.push({
    id: `eng_${postingId}_${now}`,
    postingId,
    definitionId: def.id,
    towerId: def.towerId ?? null,
    commercialLotId: def.commercialLotId ?? null,
    officeId,
    crewAssigned,
    phase: "outbound",
    travelStartedAt: now,
    travelArrivesAt: scheduleTimerAt(next, now, travelMs),
    startedAt: 0,
    endsAt: 0,
    lastAccruedAt: now,
    earnedSoFar: 0,
    unitHoursApplied: 0,
  });
  return next;
}

/** Short status line for Secretary / map overlays. */
export function engagementStatusLabel(
  state: GameState,
  engagement: JobEngagement,
  now: number,
): string {
  if (engagement.phase === "outbound") {
    return `En route · arrives ${formatTimerRemaining(state, engagement.travelArrivesAt, now)}`;
  }
  if (engagement.phase === "returning") {
    return `Returning · home ${formatTimerRemaining(state, engagement.travelArrivesAt, now)}`;
  }
  return `On site · shift ${formatTimerRemaining(state, engagement.endsAt, now)}`;
}

export function validateEngagementAssignment(
  state: GameState,
  postingId: string,
  crewAssigned: UnitAssignment,
): string | null {
  if (!canEngageMoreJobs(state)) {
    return `Task force cap reached (${activeEngagementCount(state)}/${maxJobEngagements(state)})`;
  }
  const posting = postingById(state, postingId);
  if (!posting || posting.status !== "open") return "Posting unavailable";
  const def = jobDefinitionById(posting.definitionId);
  if (!assignmentMeetsJobRequirements(crewAssigned, def)) {
    return "Not enough units";
  }
  if (state.selectedOffice === "all") {
    return "Pick an office";
  }
  const roster = state.contractorsByLocation[state.selectedOffice];
  if (!canAssignFromRoster(roster, crewAssigned)) {
    return "Not enough units";
  }
  const travelHexes = jobTravelHexesToCoord(
    state,
    state.selectedOffice,
    jobSiteCoordForDefinition(def),
  );
  const outboundSupply = roundTripTravelSupplyCost(
    travelHexes,
    totalAssigned(crewAssigned),
  );
  if (
    outboundSupply > 0 &&
    !canAffordAtOffice(state, state.selectedOffice, { supply: outboundSupply })
  ) {
    return `Need ${outboundSupply} supply for round trip`;
  }
  return null;
}

/** Round-trip supply for a job engagement (paid upfront on dispatch). */
export function jobEngagementTravelSupplyCost(
  state: GameState,
  postingId: string,
  crewAssigned: UnitAssignment,
): number {
  const posting = postingById(state, postingId);
  if (!posting) return 0;
  const def = jobDefinitionById(posting.definitionId);
  const officeId = resolveOfficeLocation(state);
  const hexes = jobTravelHexesToCoord(
    state,
    officeId,
    jobSiteCoordForDefinition(def),
  );
  return roundTripTravelSupplyCost(hexes, totalAssigned(crewAssigned));
}

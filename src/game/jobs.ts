import { JOB_DEFINITIONS } from "./jobHubData";
import {
  jobTravelDurationMsForDefinition,
} from "./mapTravel";
import {
  addAssignmentToRoster,
  canAssignFromRoster,
  formatAssignmentSummary,
  subtractAssignmentFromRoster,
  totalAssigned,
  unitDefinition,
} from "./unitEffects";
import { appendActivityLogs, cloneResourceCost } from "./logbook";
import { pushCompletionAlert } from "./completionAlerts";
import { formatNumber, officeSiteLabel } from "./constants";
import { resolveOfficeLocation } from "./officeSelection";
import {
  activePlayerId,
  isOnlineMode,
} from "../multiplayer/playerHq";
import type {
  CommercialLotId,
  CompletionBand,
  GameState,
  JobDefinition,
  JobEngagement,
  JobPosting,
  ResourceCost,
  TowerId,
  UnitAssignment,
  UnitId,
} from "./types";
import {
  formatTimerRemaining,
  scheduleTimerAt,
  timerHasElapsed,
} from "./timers";

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
  return state.jobPostings.filter(
    (p) => p.towerId === towerId && p.status === "open",
  );
}

export function postingsForCommercialLot(
  state: GameState,
  commercialLotId: CommercialLotId,
): JobPosting[] {
  return state.jobPostings.filter(
    (p) => p.commercialLotId === commercialLotId && p.status === "open",
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
  if (totalAssigned(assignment) < 1) return false;
  for (const [key, val] of Object.entries(assignment)) {
    const count = Math.max(0, Math.floor(val ?? 0));
    if (count <= 0) continue;
    const unitId = key as UnitId;
    const unit = unitDefinition(unitId);
    if (unit.category !== def.requiredCategory) return false;
    if (unit.tier < def.minUnitTier) return false;
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

function contributorShare(
  contributors: JobPosting["contributors"],
  playerId: string,
): number {
  const total = contributors.reduce((sum, c) => sum + c.unitHours, 0);
  if (total <= 0) return 1;
  const mine =
    contributors.find((c) => c.playerId === playerId)?.unitHours ?? 0;
  return mine / total;
}

function addContributorHours(
  contributors: JobPosting["contributors"],
  playerId: string,
  hours: number,
): JobPosting["contributors"] {
  if (hours <= 0) return contributors;
  const next = contributors.map((c) => ({ ...c }));
  const existing = next.find((c) => c.playerId === playerId);
  if (existing) {
    existing.unitHours += hours;
  } else {
    next.push({ playerId, unitHours: hours });
  }
  return next;
}

function applyEffectiveWork(
  posting: JobPosting,
  def: JobDefinition,
  offeredUnitHours: number,
  playerId: string,
): { posting: JobPosting; effectiveHours: number; earnedCash: number } {
  const remaining = Math.max(0, def.unitHoursTotal - posting.unitHoursCompleted);
  const effectiveHours = Math.min(offeredUnitHours, remaining);
  const earnedCash = effectiveHours * def.cashPerUnitHour;
  const next: JobPosting = {
    ...posting,
    unitHoursCompleted: posting.unitHoursCompleted + effectiveHours,
    contributors: addContributorHours(
      posting.contributors,
      playerId,
      effectiveHours,
    ),
  };
  if (next.unitHoursCompleted >= def.unitHoursTotal) {
    next.status = "completed";
  }
  return { posting: next, effectiveHours, earnedCash };
}

function accrueEngagementThrough(
  state: GameState,
  engagementId: string,
  accrueUntilMs: number,
): GameState {
  const next = structuredClone(state);
  const engIdx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (engIdx < 0) return next;

  const engagement = next.jobEngagements[engIdx];
  if (engagement.phase !== "working") return next;
  const postingIdx = next.jobPostings.findIndex(
    (p) => p.id === engagement.postingId,
  );
  if (postingIdx < 0) return next;
  if (next.jobPostings[postingIdx].status !== "open") return next;

  const accrueUntil = Math.min(accrueUntilMs, engagement.endsAt);
  const deltaMs = Math.max(0, accrueUntil - engagement.lastAccruedAt);
  if (deltaMs <= 0) return next;

  const def = jobDefinitionById(engagement.definitionId);
  const deltaHours = deltaMs / 3_600_000;
  const offeredUnitHours =
    totalAssigned(engagement.crewAssigned) * deltaHours;
  const playerId = activePlayerId(state);

  if (isOnlineMode(state)) {
    const posting = next.jobPostings[postingIdx];
    const remaining = Math.max(
      0,
      def.unitHoursTotal - posting.unitHoursCompleted,
    );
    const effectiveHours = Math.min(offeredUnitHours, remaining);
    const earnedCash = effectiveHours * def.cashPerUnitHour;
    next.jobEngagements[engIdx] = {
      ...engagement,
      lastAccruedAt: accrueUntil,
      earnedSoFar: engagement.earnedSoFar + earnedCash,
      unitHoursApplied: engagement.unitHoursApplied + effectiveHours,
      pendingSyncUnitHours:
        (engagement.pendingSyncUnitHours ?? 0) + effectiveHours,
    };
    return next;
  }

  const work = applyEffectiveWork(
    next.jobPostings[postingIdx],
    def,
    offeredUnitHours,
    playerId,
  );
  next.jobPostings[postingIdx] = work.posting;
  next.jobEngagements[engIdx] = {
    ...engagement,
    lastAccruedAt: accrueUntil,
    earnedSoFar: engagement.earnedSoFar + work.earnedCash,
    unitHoursApplied: engagement.unitHoursApplied + work.effectiveHours,
  };
  return next;
}

function shiftHasEnded(
  state: GameState,
  engagement: JobEngagement,
  now: number,
): boolean {
  if (engagement.phase !== "working") return false;
  return timerHasElapsed(now, engagement.endsAt, state);
}

function travelHasArrived(
  state: GameState,
  engagement: JobEngagement,
  now: number,
): boolean {
  if (engagement.travelArrivesAt == null) return false;
  return timerHasElapsed(now, engagement.travelArrivesAt, state);
}

function beginReturnTravel(
  state: GameState,
  engagementId: string,
  now: number,
  shiftPayoutGained?: ResourceCost,
): GameState {
  const next = structuredClone(state);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;
  const current = next.jobEngagements[idx];
  const def = jobDefinitionById(current.definitionId);
  const travelMs = jobTravelDurationMsForDefinition(
    next,
    current.officeId,
    def,
  );
  const returnStartedAt =
    current.endsAt > 0 && current.endsAt <= now ? current.endsAt : now;
  next.jobEngagements[idx] = {
    ...current,
    phase: "returning",
    travelStartedAt: returnStartedAt,
    travelArrivesAt: scheduleTimerAt(next, returnStartedAt, travelMs),
    shiftPaid: true,
    shiftPayoutGained: shiftPayoutGained ?? current.shiftPayoutGained,
  };
  return next;
}

function completeReturnTravel(
  state: GameState,
  engagementId: string,
  now: number,
  notify = true,
): GameState {
  const next = structuredClone(state);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;
  const current = next.jobEngagements[idx];
  const def = jobDefinitionById(current.definitionId);
  next.contractorsByLocation[current.officeId] = addAssignmentToRoster(
    next.contractorsByLocation[current.officeId],
    current.crewAssigned,
  );
  next.jobEngagements.splice(idx, 1);
  const gained = cloneResourceCost(current.shiftPayoutGained) ?? {};
  let withLog = logUnitsReturned(
    next,
    {
      engagement: current,
      def,
      gained,
      category: "job_complete",
      summary: `Crew returned from ${def.title}`,
      impacts: ["Back at office"],
    },
    now,
  );
  const cash = gained.cash ?? 0;
  const detail =
    cash > 0
      ? `$${formatNumber(cash)} earned · see Secretary job reports`
      : "Crew back at office · see Secretary job reports";
  withLog = pushCompletionAlert(
    withLog,
    {
      kind: "job",
      title: `${def.title} · ${officeSiteLabel(withLog, current.officeId)}`,
      detail,
    },
    notify,
  );
  return withLog;
}

function startWorkingPhase(
  state: GameState,
  engagementId: string,
  now: number,
): GameState {
  const next = structuredClone(state);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;
  const current = next.jobEngagements[idx];
  const def = jobDefinitionById(current.definitionId);
  const workStartedAt = current.travelArrivesAt ?? now;
  next.jobEngagements[idx] = {
    ...current,
    phase: "working",
    travelStartedAt: null,
    travelArrivesAt: null,
    startedAt: workStartedAt,
    endsAt: scheduleTimerAt(next, workStartedAt, def.durationSec * 1000),
    lastAccruedAt: workStartedAt,
  };
  return next;
}

function cancelOutboundEngagement(
  state: GameState,
  engagementId: string,
  now: number,
): GameState {
  const next = structuredClone(state);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;
  const current = next.jobEngagements[idx];
  if (current.phase !== "outbound") return next;
  const def = jobDefinitionById(current.definitionId);
  next.contractorsByLocation[current.officeId] = addAssignmentToRoster(
    next.contractorsByLocation[current.officeId],
    current.crewAssigned,
  );
  next.jobEngagements.splice(idx, 1);
  return logUnitsReturned(
    next,
    {
      engagement: current,
      def,
      gained: {},
      category: "job_cancel",
      summary: `Recalled from ${def.title} (before arrival)`,
      impacts: ["No work started", "Crew back at office"],
    },
    now,
  );
}

function jobPayoutGained(
  cash: number,
  extra: Partial<ResourceCost> = {},
): ResourceCost {
  const gained: ResourceCost = { ...extra };
  if (cash > 0) gained.cash = cash;
  return gained;
}

function logUnitsReturned(
  state: GameState,
  input: {
    engagement: JobEngagement;
    def: JobDefinition;
    gained: ResourceCost;
    category: "job_complete" | "job_cancel";
    summary: string;
    impacts: string[];
  },
  at: number,
): GameState {
  return appendActivityLogs(
    state,
    [
      {
        category: input.category,
        summary: input.summary,
        officeId: input.engagement.officeId,
        gained: input.gained,
        impacts: [
          formatAssignmentSummary(input.engagement.crewAssigned),
          ...input.impacts,
        ],
      },
    ],
    at,
  );
}

function respawnPosting(
  state: GameState,
  def: JobDefinition,
  now: number,
): GameState {
  const next = structuredClone(state);
  next.jobPostings.push(createPostingFromDefinition(def, now));
  return next;
}

function finalizeCompletedPosting(
  state: GameState,
  postingId: string,
  now: number,
): GameState {
  let next = structuredClone(state);
  const posting = next.jobPostings.find((p) => p.id === postingId);
  if (!posting) return next;
  const def = jobDefinitionById(posting.definitionId);
  const totalCash = hiddenTotalCash(def);
  const bonusCash = totalCash * def.bonusPercent;
  const share = contributorShare(posting.contributors, activePlayerId(state));

  const related = next.jobEngagements.filter(
    (e) => e.postingId === postingId && e.phase === "working",
  );
  for (const engagement of related) {
    const cashPayout = engagement.earnedSoFar + bonusCash * share;
    const resourceExtras: ResourceCost = {};
    for (const [key, val] of Object.entries(def.completionPayout)) {
      const k = key as keyof typeof def.completionPayout;
      const amount = (val ?? 0) * share;
      if (amount > 0 && k in next.resources) {
        next.resources[k as keyof typeof next.resources] += amount;
        resourceExtras[k] = amount;
      }
    }
    next.resources.cash += cashPayout;
    const engIdx = next.jobEngagements.findIndex((e) => e.id === engagement.id);
    if (engIdx >= 0) {
      next.jobEngagements[engIdx] = {
        ...next.jobEngagements[engIdx],
        earnedSoFar: 0,
      };
    }
    next = logUnitsReturned(
      next,
      {
        engagement,
        def,
        gained: jobPayoutGained(cashPayout, resourceExtras),
        category: "job_complete",
        summary: `Job completed: ${def.title}`,
        impacts: [
          `Completion bonus included (${Math.round(def.bonusPercent * 100)}% of job total)`,
          "Posting closed — crew heading home",
        ],
      },
      now,
    );
    next = beginReturnTravel(
      next,
      engagement.id,
      now,
      jobPayoutGained(cashPayout, resourceExtras),
    );
  }

  next.completedProjects += 1;
  if (!isOnlineMode(next)) {
    next = respawnPosting(next, def, now);
  }
  return next;
}

/** Online: pay local crews when shared posting completes (listener-driven). */
export function handleOnlinePostingCompleted(
  state: GameState,
  postingId: string,
  now: number,
): GameState {
  if (state.completedPostingPayouts?.includes(postingId)) return state;
  const posting = state.jobPostings.find((p) => p.id === postingId);
  if (!posting || posting.status !== "completed") return state;

  let next = finalizeCompletedPosting(state, postingId, now);
  const payouts = [...(next.completedPostingPayouts ?? []), postingId];
  next.completedPostingPayouts = payouts;
  return next;
}

function jobEngagementsPassSignature(state: GameState): string {
  return state.jobEngagements
    .map(
      (e) =>
        `${e.id}:${e.phase}:${e.earnedSoFar}:${e.endsAt}:${e.travelArrivesAt}:${e.postingId}`,
    )
    .join("|");
}

const MAX_JOB_ENGAGEMENT_PASSES = 32;

/** One simulation slice — outbound/work/return transitions for current state. */
function processJobEngagementsPass(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  if (
    state.jobEngagements.length === 0 &&
    !state.jobPostings.some((p) => p.status === "open" && p.expiresAt <= now)
  ) {
    return state;
  }

  let next = structuredClone(state);
  const expiredPostingIds: string[] = [];
  const completedPostingIds: string[] = [];
  const shiftEndedEngagementIds: string[] = [];
  const returnArrivedIds: string[] = [];
  const online = isOnlineMode(state);

  if (!online) {
    for (let i = 0; i < next.jobPostings.length; i += 1) {
      const posting = next.jobPostings[i];
      if (posting.status !== "open" || posting.expiresAt > now) continue;
      expiredPostingIds.push(posting.id);
      next.jobPostings[i] = { ...posting, status: "expired" };
    }
  }

  for (const engagementId of next.jobEngagements.map((e) => e.id)) {
    const engagement = next.jobEngagements.find((e) => e.id === engagementId);
    if (!engagement) continue;

    if (engagement.phase === "outbound") {
      if (travelHasArrived(next, engagement, now)) {
        next = startWorkingPhase(next, engagement.id, now);
      }
      continue;
    }

    if (engagement.phase === "returning") {
      const returning = next.jobEngagements.find((e) => e.id === engagementId);
      if (returning && travelHasArrived(next, returning, now)) {
        returnArrivedIds.push(returning.id);
      }
      continue;
    }

    const working = next.jobEngagements.find((e) => e.id === engagementId);
    if (!working || working.phase !== "working") continue;

    const posting = next.jobPostings.find((p) => p.id === working.postingId);
    if (!posting || posting.status !== "open") continue;

    next = accrueEngagementThrough(next, working.id, now);

    const postingAfter = next.jobPostings.find((p) => p.id === working.postingId);
    if (!online && postingAfter?.status === "completed") {
      completedPostingIds.push(postingAfter.id);
      continue;
    }

    const stillActive = next.jobEngagements.find((e) => e.id === working.id);
    if (stillActive && shiftHasEnded(next, stillActive, now)) {
      shiftEndedEngagementIds.push(stillActive.id);
    }
  }

  for (const postingId of [...new Set(completedPostingIds)]) {
    next = finalizeCompletedPosting(next, postingId, now);
  }

  for (const engagementId of shiftEndedEngagementIds) {
    if (!next.jobEngagements.some((e) => e.id === engagementId)) continue;
    next = settleShiftEndedEngagement(next, engagementId, now);
  }

  for (const engagementId of returnArrivedIds) {
    if (!next.jobEngagements.some((e) => e.id === engagementId)) continue;
    next = completeReturnTravel(next, engagementId, now, notify);
  }

  for (const postingId of expiredPostingIds) {
    if (online) continue;
    for (const engagement of [...next.jobEngagements]) {
      if (engagement.postingId !== postingId) continue;
      if (engagement.phase === "outbound") {
        next = cancelOutboundEngagement(next, engagement.id, now);
      } else if (engagement.phase === "working") {
        next = settleCancelledEngagement(
          next,
          engagement.id,
          now,
          "posting_expired",
        );
      }
      // returning: already paid — keep walking home
    }
    const posting = next.jobPostings.find((p) => p.id === postingId);
    if (posting) {
      next = respawnPosting(next, jobDefinitionById(posting.definitionId), now);
    }
  }

  return next;
}

/**
 * Resolve job phases through offline/dev skips. Re-runs until stable so one
 * catch-up can chain travel → work accrual → shift payout → return home.
 */
export function processJobEngagements(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  let next = state;
  for (let pass = 0; pass < MAX_JOB_ENGAGEMENT_PASSES; pass += 1) {
    const before = jobEngagementsPassSignature(next);
    next = processJobEngagementsPass(next, now, notify);
    if (jobEngagementsPassSignature(next) === before) break;
  }
  return next;
}

function settleShiftEndedEngagement(
  state: GameState,
  engagementId: string,
  now: number,
): GameState {
  let next = state;
  const engagement = next.jobEngagements.find((e) => e.id === engagementId);
  if (!engagement || engagement.phase !== "working") return next;

  next = accrueEngagementThrough(next, engagementId, now);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;

  const current = next.jobEngagements[idx];
  const def = jobDefinitionById(current.definitionId);
  const payout = current.earnedSoFar;
  const gained = jobPayoutGained(payout);
  next.resources.cash += payout;
  next.jobEngagements[idx] = { ...current, earnedSoFar: 0 };
  next = logUnitsReturned(
    next,
    {
      engagement: current,
      def,
      gained,
      category: "job_complete",
      summary: `Shift complete: ${def.title}`,
      impacts: ["Full shift payout", "Crew heading home"],
    },
    now,
  );
  return beginReturnTravel(next, engagementId, now, gained);
}

function settleCancelledEngagement(
  state: GameState,
  engagementId: string,
  now: number,
  reason: "early_cancel" | "posting_expired" = "early_cancel",
): GameState {
  const existing = state.jobEngagements.find((e) => e.id === engagementId);
  if (!existing) return state;
  if (existing.phase === "outbound") {
    return cancelOutboundEngagement(state, engagementId, now);
  }
  if (existing.phase === "returning") {
    return completeReturnTravel(state, engagementId, now);
  }

  let next = accrueEngagementThrough(state, engagementId, now);
  const idx = next.jobEngagements.findIndex((e) => e.id === engagementId);
  if (idx < 0) return next;

  const current = next.jobEngagements[idx];
  const def = jobDefinitionById(current.definitionId);
  const payout = current.earnedSoFar * 0.5;
  const gained = jobPayoutGained(payout);
  next.resources.cash += payout;
  next.jobEngagements[idx] = { ...current, earnedSoFar: 0 };
  next = logUnitsReturned(
    next,
    {
      engagement: current,
      def,
      gained,
      category: "job_cancel",
      summary:
        reason === "posting_expired"
          ? `Withdrawn from ${def.title} (posting expired)`
          : `Withdrawn from ${def.title} (early)`,
      impacts: ["Paid 50% of earned shift pay", "Crew heading home"],
    },
    now,
  );
  return beginReturnTravel(next, engagementId, now, gained);
}

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

  const next = structuredClone(state);
  next.contractorsByLocation[officeId] = subtractAssignmentFromRoster(
    roster,
    crewAssigned,
  );
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
  return null;
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

import {
  jobTravelDurationMsForDefinition,
} from "./mapTravel";
import {
  addAssignmentToRoster,
  formatAssignmentSummary,
  totalAssigned,
} from "./unitEffects";
import { appendActivityLogs, cloneResourceCost } from "./logbook";
import { pushCompletionAlert } from "./completionAlerts";
import { formatNumber, officeSiteLabel } from "./constants";
import { activePlayerId, isOnlineMode } from "../multiplayer/playerHq";
import type {
  GameState,
  JobDefinition,
  JobEngagement,
  JobPosting,
  ResourceCost,
} from "./types";
import { scheduleTimerAt, timerHasElapsed } from "./timers";
import {
  createPostingFromDefinition,
  hiddenTotalCash,
  jobDefinitionById,
} from "./jobCatalog";

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
  // Return supply paid upfront when the job was engaged.
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

export function settleCancelledEngagement(
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

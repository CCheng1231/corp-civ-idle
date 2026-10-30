import {
  computeNetWorth,
  normalizeResourceWallet
} from "./constants";
import { buildOfflineWelcomeSummary } from "./offlineWelcome";
import {
  processJobEngagements
} from "./jobs";
import {
  ownedOfficeIds
} from "./branchSites";
import { appendActivityLogs } from "./logbook";
import {
  clampResourcesToCaps,
  computeResourceCaps,
  reconcileStructureBuildTimers
} from "./structureBalance";
import type {
  GameState
} from "./types";
import {
  applyVictoryCheck,
  processContractorTransfers,
  processRecruitmentJobs,
  processResearchQueues,
  processStructureQueues,
  withDerivedStats
} from "./engineQueues";

export function finalizeLoadedState(state: GameState, now: number): GameState {
  const previousTickAt = state.lastTickAt;
  const beforeCatchUp = state;
  const normalized = reconcileStructureBuildTimers(
    {
      ...state,
      resources: normalizeResourceWallet(state.resources),
      dismissedJobReportIds: state.dismissedJobReportIds ?? [],
      logbookFilterId: state.logbookFilterId ?? "all",
      pendingOfflineSummary: null,
      pendingCompletionAlerts: [],
      recruitFocusUnitId: null,
      logbookHighlightEntryId: null,
      jobFocusPostingId: null
},
    now,
  );
  // Resolve wall-clock queues/jobs first, then apply offline production at
  // post-completion rates (slightly generous if an upgrade finished while away).
  // Silent notify: offline welcome dialog already summarizes completions.
  const afterQueues = withDerivedStats(
    runJobSimulation(
      processRecruitmentJobs(
        processContractorTransfers(
          processResearchQueues(
            processStructureQueues(normalized, now, false),
            now,
            false,
          ),
          now,
        ),
        now,
        false,
      ),
      now,
      false,
    ),
  );
  const awaySec = Math.max(0, (now - previousTickAt) / 1000);
  let next =
    awaySec > 0 ? tickProduction(afterQueues, awaySec) : afterQueues;
  next.lastTickAt = now;
  next.pendingOfflineSummary = buildOfflineWelcomeSummary(
    beforeCatchUp,
    afterQueues,
    next,
    awaySec,
  );
  return next;
}

/** Online Firestore load — resolve queues and apply passive production since lastTickAt. */
export function finalizeOnlineSyncState(state: GameState, now: number): GameState {
  const previousTickAt = state.lastTickAt;
  const normalized = reconcileStructureBuildTimers(
    {
      ...state,
      resources: normalizeResourceWallet(state.resources),
      dismissedJobReportIds: state.dismissedJobReportIds ?? [],
      logbookFilterId: state.logbookFilterId ?? "all",
      pendingOfflineSummary: null,
      pendingCompletionAlerts: [],
      recruitFocusUnitId: null,
      logbookHighlightEntryId: null,
      jobFocusPostingId: null
},
    now,
  );
  const afterQueues = withDerivedStats(
    runJobSimulation(
      processRecruitmentJobs(
        processContractorTransfers(
          processResearchQueues(
            processStructureQueues(normalized, now, false),
            now,
            false,
          ),
          now,
        ),
        now,
        false,
      ),
      now,
      false,
    ),
  );
  const awaySec = Math.max(0, (now - previousTickAt) / 1000);
  const afterProduction =
    awaySec > 0 ? tickProduction(afterQueues, awaySec) : afterQueues;
  return {
    ...afterProduction,
    lastTickAt: now,
    pendingOfflineSummary: null,
    onlineResetGeneration: afterProduction.onlineResetGeneration,
    onlineSaveSessionId: afterProduction.onlineSaveSessionId
};
}

/** Keep local UI + shared sync fields when applying a remote online save. */
export function mergeOnlineRemoteState(
  current: GameState,
  incoming: GameState,
): GameState {
  return {
    ...incoming,
    view: current.view,
    homePanel: current.homePanel,
    homeHubResume: current.homeHubResume,
    secretaryPanel: current.secretaryPanel,
    secretaryHubResume: current.secretaryHubResume,
    settings: {
      ...incoming.settings,
      viewportPreview:
        current.settings.viewportPreview ??
        incoming.settings.viewportPreview
},
    jobPostings: current.jobPostings,
    companyPresence: current.companyPresence,
    recruitFocusUnitId: current.recruitFocusUnitId,
    logbookHighlightEntryId: current.logbookHighlightEntryId,
    jobFocusPostingId: current.jobFocusPostingId,
    pendingCompletionAlerts: current.pendingCompletionAlerts,
    pendingOfflineSummary: current.pendingOfflineSummary,
    onlineConnectionStatus: current.onlineConnectionStatus,
    onlineSession: current.onlineSession ?? incoming.onlineSession,
    onlineResetGeneration:
      incoming.onlineResetGeneration ??
      current.onlineResetGeneration ??
      0,
    onlineSaveSessionId:
      incoming.onlineSaveSessionId ?? current.onlineSaveSessionId
};
}

function tickProduction(state: GameState, deltaSec: number): GameState {
  const next = structuredClone(state);
  const hourFraction = deltaSec / 3600;
  for (const key of Object.keys(next.rates) as (keyof typeof next.rates)[]) {
    next.resources[key] += next.rates[key] * hourFraction;
  }
  const caps = computeResourceCaps(next);
  next.resources = clampResourcesToCaps(next.resources, caps);
  next.netWorth = computeNetWorth(next.resources, next.locationStats);
  return applyVictoryCheck(next);
}

function applyJobPhaseMilestone(state: GameState): GameState {
  if (state.completedProjects >= 3 && state.phase === 1) {
    return appendActivityLogs(
      { ...state, phase: 2 },
      [
        {
          category: "phase",
          summary: "Entered Phase 2 — Rival bids & espionage",
          impacts: ["Unlocked with 3 completed jobs"]
},
      ],
    );
  }
  return state;
}

function runJobSimulation(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  const processed = processJobEngagements(state, now, notify);
  return applyVictoryCheck(applyJobPhaseMilestone(withDerivedStats(processed)));
}

export function advanceSimulatedTime(
  state: GameState,
  input: {
    productionDeltaSec: number;
    eventNow: number;
    lastTickAt: number;
  },
): GameState {
  if (input.productionDeltaSec <= 0) return state;

  let next = tickProduction(state, input.productionDeltaSec);
  next = processStructureQueues(next, input.eventNow, true);
  next = processResearchQueues(next, input.eventNow, true);
  next = processContractorTransfers(next, input.eventNow);
  next = processRecruitmentJobs(next, input.eventNow, true);
  next = runJobSimulation(next, input.eventNow);
  next.lastTickAt = input.lastTickAt;
  return next;
}

/**
 * Pull every absolute wall-clock mark earlier by `shiftMs` so a later catch-up
 * at real `Date.now()` treats the skipped duration as already elapsed.
 * Covers queues, travel, job shifts/postings, and log timestamps.
 */
function shiftSimulatedClock(state: GameState, shiftMs: number): GameState {
  if (shiftMs <= 0) return state;
  const next = structuredClone(state);

  const shift = (at: number): number => at - shiftMs;
  const shiftNullable = (at: number | null | undefined): number | null => {
    if (at == null) return null;
    return at - shiftMs;
  };

  for (const officeId of ownedOfficeIds(state)) {
    next.structureQueues[officeId] = next.structureQueues[officeId].map(
      (job) => ({
        ...job,
        startedAt: shiftNullable(job.startedAt),
        completesAt: shiftNullable(job.completesAt)
}),
    );
    next.researchQueues[officeId] = (next.researchQueues[officeId] ?? []).map(
      (job) => ({
        ...job,
        startedAt: shiftNullable(job.startedAt),
        completesAt: shiftNullable(job.completesAt)
}),
    );
  }

  next.recruitmentJobs = next.recruitmentJobs.map((job) => ({
    ...job,
    startedAt: shiftNullable(job.startedAt),
    completesAt: shiftNullable(job.completesAt)
}));

  next.contractorTransfers = next.contractorTransfers.map((transfer) => ({
    ...transfer,
    arrivesAt: shift(transfer.arrivesAt)
}));

  next.jobEngagements = next.jobEngagements.map((engagement) => ({
    ...engagement,
    startedAt: shift(engagement.startedAt),
    endsAt: shift(engagement.endsAt),
    lastAccruedAt: shift(engagement.lastAccruedAt),
    travelStartedAt: shiftNullable(engagement.travelStartedAt),
    travelArrivesAt: shiftNullable(engagement.travelArrivesAt)
}));

  next.jobPostings = next.jobPostings.map((posting) => ({
    ...posting,
    spawnedAt: shift(posting.spawnedAt),
    expiresAt: shift(posting.expiresAt)
}));

  next.activityLog = next.activityLog.map((entry) => ({
    ...entry,
    at: shift(entry.at)
}));

  next.lastTickAt = shift(next.lastTickAt);
  return next;
}

/**
 * Dev time skip: shift all deadlines/accrual marks back, then run the normal
 * simulation catch-up at the real wall clock. Queue processors chain
 * activation times so multi-job queues can fully resolve in one skip.
 */
export function devSkipTime(state: GameState, minutes: number): GameState {
  if (!Number.isFinite(minutes) || minutes <= 0) return state;
  const capped = Math.min(minutes, 60 * 24 * 7);
  const deltaSec = capped * 60;
  const now = Date.now();
  const shifted = shiftSimulatedClock(state, deltaSec * 1000);
  return advanceSimulatedTime(shifted, {
    productionDeltaSec: deltaSec,
    eventNow: now,
    lastTickAt: now
});
}

import {
  STRUCTURES,
  RESEARCH,
  OFFICE_IDS,
  createInitialState,
  addResources,
  computeNetWorth,
  isResearchUnlocked,
  recomputeDerivedStats,
  computeLocationStats,
  totalStructureLevel,
  WIN_NET_WORTH,
  recruitBatchCost,
  canAffordAtOffice,
  applyOfficeCost,
  applyOfficeRefund,
  canBuildStructure,
  isStructureQueueFull,
  isResearchQueueFull,
  isRecruitmentQueueFull,
  canSellStructureLevel,
  projectedStructureLevels,
  projectedResearchLevels,
  MAX_STRUCTURE_QUEUE,
  MAX_RESEARCH_QUEUE,
  MAX_RECRUIT_QUEUE,
  unitAvailableAt,
  contractorTransferDurationMs,
  OFFICE_LABELS,
  MAX_RECRUIT_BATCH,
  normalizeResourceWallet,
  OFFICE_EXPANSION_STRUCTURE_ID,
  recruitmentOrderDurationMs,
  recruitmentOrderBuildTimeHours,
} from "./constants";
import { cancelRefundFromSpent } from "./refunds";
import { researchBuildTimeMs } from "./researchBalance";
import { formatQueueTimeHours } from "./timers";
import {
  cancelJobEngagement,
  engageJobPosting,
  jobDefinitionById,
  processJobEngagements,
} from "./jobs";
import {
  BRANCH_OPENING_COST,
  branchManagementResearched,
  commercialSiteAt,
} from "./mapWorld";
import {
  formatAssignmentSummary,
  unitDefinition,
} from "./unitEffects";
import { appendActivityLogs, cloneResourceCost, queueCancelLogFields } from "./logbook";
import { normalizeResourceCost } from "./phaseA";
import {
  buildTimeMsForQueueJob,
  clampResourcesToCaps,
  computeResourceCaps,
  reconcileStructureBuildTimers,
  structureBuildTimeMs,
  structureSellRefundCost,
  structureUpgradeCostForTargetLevel,
  getStructureLevelRow,
} from "./structureBalance";
import {
  scheduleTimerAt,
  timerHasNotElapsed,
} from "./timers";
import type {
  GameAction,
  GameState,
  ProgressionEffects,
  ResearchId,
  ResourceCost,
  StructureId,
  OfficeLocationId,
} from "./types";

type LeveledDef = {
  maxLevel: number;
  baseCost: ResourceCost;
  costScale: number;
  effects: ProgressionEffects;
};

function progressionCost(level: number, def: LeveledDef): ResourceCost {
  const scale = Math.pow(def.costScale, level);
  const base = normalizeResourceCost(def.baseCost);
  const cost: ResourceCost = { ...base };
  for (const [key, baseVal] of Object.entries(base)) {
    if (key === "electricity") {
      cost.electricity = Math.ceil((baseVal ?? 0) * scale);
    } else {
      const k = key as keyof GameState["resources"];
      cost[k] = Math.ceil((baseVal ?? 0) * scale);
    }
  }
  return cost;
}

function getStructureDef(id: StructureId) {
  const def = STRUCTURES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown structure ${id}`);
  return def;
}

function getResearchDef(id: ResearchId) {
  const def = RESEARCH.find((r) => r.id === id);
  if (!def) throw new Error(`Unknown research ${id}`);
  return def;
}

function newQueueJobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function structureCost(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): ResourceCost {
  const projected = projectedStructureLevels(state, locationId)[structureId];
  return structureUpgradeCostForTargetLevel(structureId, projected + 1);
}

export function structureBuildCostForLevel(
  structureId: StructureId,
  targetLevel: number,
): ResourceCost {
  return structureUpgradeCostForTargetLevel(structureId, targetLevel);
}

/** Refund for removing one built level (50% of cost for current level). */
export function structureDemolishRefund(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): ResourceCost | null {
  const level = state.structureLevelsByLocation[locationId][structureId];
  if (level <= 0) return null;
  return structureSellRefundCost(structureId, level);
}

export function researchCost(state: GameState, researchId: ResearchId) {
  const def = getResearchDef(researchId);
  const level = projectedResearchLevels(state)[researchId];
  return progressionCost(level, def);
}

export function computeProjectBonuses(state: GameState) {
  let durationMult = 1;
  let payoutMult = 1;

  for (const def of STRUCTURES) {
    const level = totalStructureLevel(state, def.id);
    if (level <= 0) continue;
    if (def.effects.projectDurationMultPerLevel) {
      durationMult *= Math.max(
        0.55,
        1 - def.effects.projectDurationMultPerLevel * level,
      );
    }
    if (def.effects.projectPayoutMultPerLevel) {
      payoutMult *= 1 + def.effects.projectPayoutMultPerLevel * level;
    }
  }

  for (const def of RESEARCH) {
    const level = state.researchLevels[def.id];
    if (level <= 0) continue;
    if (def.effects.projectDurationMultPerLevel) {
      durationMult *= Math.max(
        0.55,
        1 - def.effects.projectDurationMultPerLevel * level,
      );
    }
    if (def.effects.projectPayoutMultPerLevel) {
      payoutMult *= 1 + def.effects.projectPayoutMultPerLevel * level;
    }
  }

  return { durationMult, payoutMult };
}

function withDerivedStats(state: GameState): GameState {
  const derived = recomputeDerivedStats(state);
  const locationStats = computeLocationStats({
    structureLevelsByLocation: state.structureLevelsByLocation,
    contractorsByLocation: state.contractorsByLocation,
    previous: state.locationStats,
  });
  const caps = computeResourceCaps(state);
  const resources = clampResourcesToCaps(state.resources, caps);
  return {
    ...state,
    resources,
    rates: derived.rates,
    locationStats,
    netWorth: computeNetWorth(resources, locationStats),
  };
}

function applyVictoryCheck(state: GameState): GameState {
  if (state.won || state.netWorth < WIN_NET_WORTH) return state;
  return { ...state, won: true };
}

function applyStructurePurchase(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): GameState {
  const next = structuredClone(state);
  next.structureLevelsByLocation[locationId][structureId] += 1;
  return withDerivedStats(next);
}

function applyResearchEffects(
  state: GameState,
  researchId: ResearchId,
): GameState {
  const next = structuredClone(state);
  next.researchLevels[researchId] += 1;
  return withDerivedStats(next);
}

function processStructureQueues(state: GameState, now: number): GameState {
  let next = state;

  for (const officeId of OFFICE_IDS) {
    let queue = [...next.structureQueues[officeId]];

    while (queue.length > 0) {
      if (queue[0].completesAt === null) {
        const buildMs = buildTimeMsForQueueJob(next, officeId, 0);
        const startedAt = now;
        const completesAt = scheduleTimerAt(next, now, buildMs);
        queue[0] = { ...queue[0], startedAt, completesAt };
        if (timerHasNotElapsed(now, completesAt, next)) break;
      }
      const dueAt = queue[0].completesAt;
      if (dueAt === null || timerHasNotElapsed(now, dueAt, next)) break;

      const job = queue.shift()!;
      next = applyStructurePurchase(next, officeId, job.structureId);
      next.structureQueues[officeId] = queue;
      const def = getStructureDef(job.structureId);
      const newLevel =
        next.structureLevelsByLocation[officeId][job.structureId];
      const buildSpent = structureBuildCostForLevel(
        job.structureId,
        newLevel,
      );
      next = appendActivityLogs(next, [
        {
          category: "structure_complete",
          summary: `${def.name} built at ${OFFICE_LABELS[officeId]}`,
          officeId,
          spent: buildSpent,
          impacts: [
            `Level ${newLevel} at ${OFFICE_LABELS[officeId]}`,
            `Rates and site stats updated`,
          ],
        },
      ]);
    }

    next = {
      ...next,
      structureQueues: { ...next.structureQueues, [officeId]: queue },
    };
  }

  return next;
}

function processContractorTransfers(state: GameState, now: number): GameState {
  if (state.contractorTransfers.length === 0) return state;

  const pending = state.contractorTransfers.filter((t) =>
    timerHasNotElapsed(now, t.arrivesAt, state),
  );
  const arrived = state.contractorTransfers.filter((t) =>
    !timerHasNotElapsed(now, t.arrivesAt, state),
  );
  if (arrived.length === 0) return state;

  const next = structuredClone(state);
  next.contractorTransfers = pending;
  for (const transfer of arrived) {
    next.contractorsByLocation[transfer.to][transfer.unitId] =
      (next.contractorsByLocation[transfer.to][transfer.unitId] ?? 0) +
      transfer.count;
  }
  if (arrived.length > 0) {
    return appendActivityLogs(
      next,
      arrived.map((transfer) => {
        const unit = unitDefinition(transfer.unitId);
        return {
          category: "transfer_arrival" as const,
          summary: `${transfer.count}× ${unit.name} arrived at ${OFFICE_LABELS[transfer.to]}`,
          officeId: transfer.to,
          impacts: [
            `From ${OFFICE_LABELS[transfer.from]}`,
            `${next.contractorsByLocation[transfer.to][transfer.unitId]} ${unit.name} now at site`,
          ],
        };
      }),
      now,
    );
  }
  return next;
}

function processResearchQueues(state: GameState, now: number): GameState {
  let next = state;

  for (const officeId of OFFICE_IDS) {
    let queue = [...(next.researchQueues[officeId] ?? [])];

    while (queue.length > 0) {
      if (queue[0].completesAt === null) {
        const buildMs = researchBuildTimeMs(
          queue[0].researchId,
          queue[0].targetLevel,
        );
        const startedAt = now;
        const completesAt = scheduleTimerAt(next, now, buildMs);
        queue[0] = { ...queue[0], startedAt, completesAt };
        if (timerHasNotElapsed(now, completesAt, next)) break;
      }
      const dueAt = queue[0].completesAt;
      if (dueAt === null || timerHasNotElapsed(now, dueAt, next)) break;

      const job = queue.shift()!;
      next = applyResearchEffects(next, job.researchId);
      next.researchQueues = { ...next.researchQueues, [officeId]: queue };
      const def = getResearchDef(job.researchId);
      const newLevel = next.researchLevels[job.researchId];
      next = appendActivityLogs(next, [
        {
          category: "research_complete",
          summary: `${def.name} completed`,
          officeId,
          impacts: [
            `Research level ${newLevel}/${def.maxLevel}`,
            "Firm production rates updated",
          ],
        },
      ]);
    }

    next = {
      ...next,
      researchQueues: { ...next.researchQueues, [officeId]: queue },
    };
  }

  return next;
}

function startRecruitmentJobTimer(
  state: GameState,
  job: import("./types").RecruitmentJob,
  now: number,
): import("./types").RecruitmentJob {
  const startedAt = now;
  const completesAt = scheduleTimerAt(
    state,
    now,
    recruitmentOrderDurationMs(job.count ?? 1),
  );
  return { ...job, startedAt, completesAt };
}

function recruitmentJobsForOffice(
  state: GameState,
  officeId: OfficeLocationId,
) {
  return state.recruitmentJobs.filter((j) => j.officeId === officeId);
}

function setRecruitmentJobsForOffice(
  state: GameState,
  officeId: OfficeLocationId,
  jobs: import("./types").RecruitmentJob[],
): GameState {
  return {
    ...state,
    recruitmentJobs: [
      ...state.recruitmentJobs.filter((j) => j.officeId !== officeId),
      ...jobs,
    ],
  };
}

function processRecruitmentJobs(state: GameState, now: number): GameState {
  let next = structuredClone(state);
  const completed: import("./types").RecruitmentJob[] = [];

  for (const officeId of OFFICE_IDS) {
    let jobs = recruitmentJobsForOffice(next, officeId);
    if (jobs.length === 0) continue;

    if (jobs[0].completesAt === null) {
      jobs[0] = startRecruitmentJobTimer(next, jobs[0], now);
      next = setRecruitmentJobsForOffice(next, officeId, jobs);
    }

    while (
      jobs.length > 0 &&
      jobs[0].completesAt !== null &&
      !timerHasNotElapsed(now, jobs[0].completesAt!, next)
    ) {
      const job = jobs.shift()!;
      completed.push(job);
      const hireCount = job.count ?? 1;
      next.contractorsByLocation[job.officeId][job.unitId] =
        (next.contractorsByLocation[job.officeId][job.unitId] ?? 0) + hireCount;
      if (jobs.length > 0 && jobs[0].completesAt === null) {
        jobs[0] = startRecruitmentJobTimer(next, jobs[0], now);
      }
      next = setRecruitmentJobsForOffice(next, officeId, jobs);
    }
  }

  if (completed.length === 0) return next;

  return appendActivityLogs(
    next,
    completed.map((job) => {
      const unit = unitDefinition(job.unitId);
      const hireCount = job.count ?? 1;
      return {
        category: "recruit" as const,
        summary: `${hireCount}× ${unit.name} joined ${OFFICE_LABELS[job.officeId]}`,
        officeId: job.officeId,
        impacts: [
          `${next.contractorsByLocation[job.officeId][job.unitId]} ${unit.name} at site`,
        ],
      };
    }),
    now,
  );
}

export function finalizeLoadedState(state: GameState, now: number): GameState {
  const normalized = reconcileStructureBuildTimers(
    {
      ...state,
      resources: normalizeResourceWallet(state.resources),
      dismissedJobReportIds: state.dismissedJobReportIds ?? [],
      logbookFilterId: state.logbookFilterId ?? "all",
    },
    now,
  );
  return withDerivedStats(
    runJobSimulation(
      processRecruitmentJobs(
        processContractorTransfers(
          processResearchQueues(processStructureQueues(normalized, now), now),
          now,
        ),
        now,
      ),
      now,
    ),
  );
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
          impacts: ["Unlocked with 3 completed jobs"],
        },
      ],
    );
  }
  return state;
}

function runJobSimulation(state: GameState, now: number): GameState {
  const processed = processJobEngagements(state, now);
  return applyVictoryCheck(applyJobPhaseMilestone(withDerivedStats(processed)));
}

function advanceSimulatedTime(
  state: GameState,
  input: {
    productionDeltaSec: number;
    eventNow: number;
    lastTickAt: number;
  },
): GameState {
  if (input.productionDeltaSec <= 0) return state;

  let next = tickProduction(state, input.productionDeltaSec);
  next = processStructureQueues(next, input.eventNow);
  next = processResearchQueues(next, input.eventNow);
  next = processContractorTransfers(next, input.eventNow);
  next = processRecruitmentJobs(next, input.eventNow);
  next = runJobSimulation(next, input.eventNow);
  next.lastTickAt = input.lastTickAt;
  return next;
}

export function devSkipTime(state: GameState, minutes: number): GameState {
  if (!Number.isFinite(minutes) || minutes <= 0) return state;
  const capped = Math.min(minutes, 60 * 24 * 7);
  const deltaSec = capped * 60;
  const wall = Date.now();
  const eventNow = wall + deltaSec * 1000;
  return advanceSimulatedTime(state, {
    productionDeltaSec: deltaSec,
    eventNow,
    lastTickAt: wall,
  });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LOAD":
      return finalizeLoadedState(action.state, Date.now());

    case "SET_VIEW":
      return {
        ...state,
        view: action.view,
        ...(action.logbookFilter !== undefined
          ? { logbookFilterId: action.logbookFilter }
          : {}),
      };

    case "SET_LOGBOOK_FILTER":
      return { ...state, logbookFilterId: action.filterId };

    case "DISMISS_JOB_REPORT": {
      const dismissed = state.dismissedJobReportIds ?? [];
      if (dismissed.includes(action.logEntryId)) {
        return state;
      }
      return {
        ...state,
        dismissedJobReportIds: [...dismissed, action.logEntryId],
      };
    }

    case "SELECT_OFFICE": {
      if (action.officeId === "branch" && !state.branchEstablished) {
        return state;
      }
      return { ...state, selectedOffice: action.officeId };
    }

    case "SELECT_TOWER":
      return { ...state, selectedTowerId: action.towerId };

    case "SELECT_COMMERCIAL_HEX":
      return { ...state, selectedCommercialHex: action.coord };

    case "ESTABLISH_BRANCH": {
      if (state.branchEstablished) return state;
      if (!branchManagementResearched(state)) return state;
      const pick = action.coord ?? state.selectedCommercialHex;
      const site = pick ? commercialSiteAt(pick) : undefined;
      if (!site) return state;
      if (!canAffordAtOffice(state, "hq", BRANCH_OPENING_COST)) return state;

      const next = applyOfficeCost(state, "hq", BRANCH_OPENING_COST);
      next.branchEstablished = true;
      next.branchCoord = { ...site.coord };
      next.selectedCommercialHex = null;
      next.selectedOffice = "branch";
      return appendActivityLogs(next, [
        {
          category: "research",
          summary: `Opened branch at ${site.label}`,
          officeId: "branch",
          spent: BRANCH_OPENING_COST,
          impacts: [
            "Branch office now on the regional map",
            "Manage structures and staff at the new site",
          ],
        },
      ]);
    }

    case "UPDATE_SETTINGS": {
      const next = {
        ...state,
        settings: { ...state.settings, ...action.settings },
      };
      if (action.settings.ignoreTimers !== undefined) {
        return finalizeLoadedState(next, Date.now());
      }
      return next;
    }

    case "UPDATE_PLAYER_NOTES":
      return { ...state, playerNotes: action.notes };

    case "TICK": {
      const now = action.now;
      const deltaSec = Math.min(30, (now - state.lastTickAt) / 1000);
      if (deltaSec <= 0) return state;

      return advanceSimulatedTime(state, {
        productionDeltaSec: deltaSec,
        eventNow: now,
        lastTickAt: now,
      });
    }

    case "DEV_SKIP_TIME":
      return devSkipTime(state, action.minutes);

    case "BUY_STRUCTURE": {
      const def = getStructureDef(action.structureId);
      const projected = projectedStructureLevels(
        state,
        action.locationId,
      )[action.structureId];
      if (projected >= def.maxLevel) return state;
      if (isStructureQueueFull(state, action.locationId)) {
        return state;
      }
      if (!canBuildStructure(state, action.locationId, action.structureId)) {
        return state;
      }
      const cost = structureCost(state, action.locationId, action.structureId);
      if (!canAffordAtOffice(state, action.locationId, cost)) return state;
      const spentSnapshot = cloneResourceCost(cost) ?? cost;
      let next = applyOfficeCost(state, action.locationId, cost);

      const targetLevel = projected + 1;
      const buildMs = structureBuildTimeMs(action.structureId, targetLevel);
      const queue = [...next.structureQueues[action.locationId]];
      const now = Date.now();
      queue.push({
        id: newQueueJobId(),
        structureId: action.structureId,
        targetLevel,
        spentCost: spentSnapshot,
        startedAt: queue.length === 0 ? now : null,
        completesAt:
          queue.length === 0
            ? scheduleTimerAt(next, now, buildMs)
            : null,
      });
      next.structureQueues[action.locationId] = queue;
      const buildHours =
        getStructureLevelRow(action.structureId, targetLevel)?.buildTimeHours ??
        0;
      const isExpansion =
        action.structureId === OFFICE_EXPANSION_STRUCTURE_ID;
      return appendActivityLogs(next, [
        {
          category: "structure_upgrade",
          summary: isExpansion
            ? `Queued ${def.name} at ${OFFICE_LABELS[action.locationId]}`
            : `Queued ${def.name} at ${OFFICE_LABELS[action.locationId]}`,
          officeId: action.locationId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${queue.length}/${MAX_STRUCTURE_QUEUE}`,
            queue.length === 1
              ? `Build time ${buildHours} game hr (real-time)`
              : "Waiting behind earlier queued builds",
          ],
        },
      ]);
    }

    case "CANCEL_STRUCTURE_JOB": {
      const queue = state.structureQueues[action.locationId];
      const index = queue.findIndex((j) => j.id === action.jobId);
      if (index < 0) return state;
      const job = queue[index];
      const spent =
        job.spentCost ??
        structureUpgradeCostForTargetLevel(
          job.structureId,
          job.targetLevel ??
            projectedStructureLevels(state, action.locationId)[
              job.structureId
            ] + 1,
        );
      const refund = cancelRefundFromSpent(spent);
      const def = getStructureDef(job.structureId);
      let next = applyOfficeRefund(state, action.locationId, refund);
      next = structuredClone(next);
      next.structureQueues[action.locationId] = queue.filter(
        (j) => j.id !== action.jobId,
      );
      return appendActivityLogs(withDerivedStats(next), [
        {
          category: "structure_cancel",
          summary: `Cancelled ${def.name} at ${OFFICE_LABELS[action.locationId]}`,
          officeId: action.locationId,
          ...queueCancelLogFields(spent, refund),
        },
      ]);
    }

    case "DOWNGRADE_STRUCTURE": {
      if (
        !canSellStructureLevel(
          state,
          action.locationId,
          action.structureId,
        )
      ) {
        return state;
      }
      const level =
        state.structureLevelsByLocation[action.locationId][action.structureId];
      const def = getStructureDef(action.structureId);
      const refund = structureSellRefundCost(action.structureId, level);
      const powerRefund = refund.electricity ?? 0;
      const resourceRefund = { ...refund };
      delete resourceRefund.electricity;

      const next = structuredClone(state);
      next.structureLevelsByLocation[action.locationId][action.structureId] -= 1;
      next.resources = addResources(next.resources, resourceRefund);
      if (powerRefund > 0) {
        next.locationStats[action.locationId].powerUsed = Math.max(
          0,
          next.locationStats[action.locationId].powerUsed - powerRefund,
        );
      }
      const updated = withDerivedStats(next);
      const newLevel =
        updated.structureLevelsByLocation[action.locationId][action.structureId];
      const gained: ResourceCost = { ...refund };
      return appendActivityLogs(updated, [
        {
          category: "structure_sell",
          summary: `Sold ${def.name} level at ${OFFICE_LABELS[action.locationId]}`,
          officeId: action.locationId,
          gained,
          impacts: [
            `Now level ${newLevel}`,
            powerRefund > 0
              ? `${powerRefund} Power returned to site pool`
              : "Office space freed at site",
          ],
        },
      ]);
    }

    case "BUY_RESEARCH": {
      const officeId = action.officeId ?? state.selectedOffice;
      const def = getResearchDef(action.researchId);
      if (!isResearchUnlocked(state, def)) return state;
      const projected = projectedResearchLevels(state)[action.researchId];
      if (projected >= def.maxLevel) return state;
      if (isResearchQueueFull(state, officeId)) return state;
      const cost = researchCost(state, action.researchId);
      if (!canAffordAtOffice(state, officeId, cost)) return state;
      const spentSnapshot = cloneResourceCost(cost) ?? cost;
      let next = applyOfficeCost(state, officeId, cost);
      const targetLevel = projected + 1;
      const buildMs = researchBuildTimeMs(action.researchId, targetLevel);
      const queue = [...(next.researchQueues[officeId] ?? [])];
      const now = Date.now();
      queue.push({
        id: newQueueJobId(),
        researchId: action.researchId,
        officeId,
        targetLevel,
        spentCost: spentSnapshot,
        startedAt: queue.length === 0 ? now : null,
        completesAt:
          queue.length === 0 ? scheduleTimerAt(next, now, buildMs) : null,
      });
      next.researchQueues = { ...next.researchQueues, [officeId]: queue };
      const buildHours = buildMs / (3600 * 1000);
      return appendActivityLogs(next, [
        {
          category: "research",
          summary: `Queued ${def.name} at ${OFFICE_LABELS[officeId]}`,
          officeId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${queue.length}/${MAX_RESEARCH_QUEUE}`,
            queue.length === 1
              ? `Research time ${buildHours.toFixed(2)} game hr (real-time)`
              : "Waiting behind earlier queued research",
          ],
        },
      ]);
    }

    case "CANCEL_RESEARCH_JOB": {
      const queue = state.researchQueues[action.officeId] ?? [];
      const job = queue.find((j) => j.id === action.jobId);
      if (!job) return state;
      const spent = job.spentCost ?? {};
      const refund = cancelRefundFromSpent(spent);
      const def = getResearchDef(job.researchId);
      let next = applyOfficeRefund(state, action.officeId, refund);
      next = structuredClone(next);
      next.researchQueues = {
        ...next.researchQueues,
        [action.officeId]: queue.filter((j) => j.id !== action.jobId),
      };
      return appendActivityLogs(next, [
        {
          category: "research_cancel",
          summary: `Cancelled ${def.name} at ${OFFICE_LABELS[action.officeId]}`,
          officeId: action.officeId,
          ...queueCancelLogFields(spent, refund),
        },
      ]);
    }

    case "RECRUIT_CONTRACTOR": {
      const inner = gameReducer(state, {
        type: "START_RECRUITMENT",
        officeId: state.selectedOffice,
        unitId: action.unitId,
        count: 1,
      });
      return inner;
    }

    case "START_RECRUITMENT": {
      const count = Math.floor(action.count);
      if (count < 1 || count > MAX_RECRUIT_BATCH) return state;
      const { officeId, unitId } = action;
      if (isRecruitmentQueueFull(state, officeId)) return state;
      const cost = recruitBatchCost(unitId, count);
      if (!canAffordAtOffice(state, officeId, cost)) return state;

      const now = Date.now();
      const officeJobs = recruitmentJobsForOffice(state, officeId);
      const active = officeJobs.length === 0;
      const spentSnapshot = cloneResourceCost(cost) ?? cost;
      const job = {
        id: newQueueJobId(),
        officeId,
        unitId,
        count,
        spentCost: spentSnapshot,
        startedAt: active ? now : null,
        completesAt: active
          ? scheduleTimerAt(state, now, recruitmentOrderDurationMs(count))
          : null,
      };
      const merged = setRecruitmentJobsForOffice(
        applyOfficeCost(state, officeId, cost),
        officeId,
        [...officeJobs, job],
      );

      const unit = unitDefinition(unitId);
      const orderHours = recruitmentOrderBuildTimeHours(count);
      return appendActivityLogs(merged, [
        {
          category: "recruit",
          summary: `Queued order: ${count}× ${unit.name} at ${OFFICE_LABELS[officeId]}`,
          officeId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${officeJobs.length + 1}/${MAX_RECRUIT_QUEUE} orders`,
            active
              ? `Arrives in ${formatQueueTimeHours(orderHours)}`
              : "Waiting behind earlier orders",
          ],
        },
      ]);
    }

    case "CANCEL_RECRUITMENT_JOB": {
      const job = state.recruitmentJobs.find((j) => j.id === action.jobId);
      if (!job) return state;
      const spent = job.spentCost ?? {};
      const refund = cancelRefundFromSpent(spent);
      const unit = unitDefinition(job.unitId);
      let next = applyOfficeRefund(state, job.officeId, refund);
      next = structuredClone(next);
      const officeJobs = recruitmentJobsForOffice(next, job.officeId).filter(
        (j) => j.id !== action.jobId,
      );
      next = setRecruitmentJobsForOffice(next, job.officeId, officeJobs);
      return appendActivityLogs(next, [
        {
          category: "recruit_cancel",
          summary: `Cancelled hire: ${job.count ?? 1}× ${unit.name} at ${OFFICE_LABELS[job.officeId]}`,
          officeId: job.officeId,
          ...queueCancelLogFields(spent, refund),
        },
      ]);
    }

    case "START_CONTRACTOR_TRANSFER": {
      const { from, to, unitId } = action;
      const count = action.count ?? 1;
      if (from === to || count < 1) return state;
      if (
        (from === "branch" || to === "branch") &&
        !state.branchEstablished
      ) {
        return state;
      }
      if (unitAvailableAt(state, from, unitId) < count) {
        return state;
      }

      const now = Date.now();
      const next = structuredClone(state);
      next.contractorsByLocation[from][unitId] -= count;
      next.contractorTransfers.push({
        id: `${now}-${from}-${to}-${unitId}-${Math.random().toString(36).slice(2, 9)}`,
        from,
        to,
        unitId,
        count,
        arrivesAt: scheduleTimerAt(
          state,
          now,
          contractorTransferDurationMs(state, from, to, unitId, count),
        ),
      });
      const unit = unitDefinition(unitId);
      const travelSec =
        contractorTransferDurationMs(state, from, to, unitId, count) / 1000;
      return appendActivityLogs(next, [
        {
          category: "transfer",
          summary: `Relocated ${count}× ${unit.name} toward ${OFFICE_LABELS[to]}`,
          officeId: from,
          impacts: [
            `Left ${OFFICE_LABELS[from]}`,
            `Arrives in ${travelSec}s`,
          ],
        },
      ]);
    }

    case "ENGAGE_JOB": {
      const now = Date.now();
      const before = state.jobEngagements.length;
      let next = engageJobPosting(
        state,
        action.postingId,
        action.crewAssigned,
        now,
      );
      if (next.jobEngagements.length <= before) return state;
      const engagement = next.jobEngagements[next.jobEngagements.length - 1];
      const def = jobDefinitionById(engagement.definitionId);
      return appendActivityLogs(next, [
        {
          category: "job_engage",
          summary: `Engaged: ${def.title}`,
          officeId: engagement.officeId,
          impacts: [
            formatAssignmentSummary(engagement.crewAssigned),
            `Shift length ~${Math.round(
              jobDefinitionById(engagement.definitionId).durationSec / 3600,
            )} hr — units return when shift ends`,
          ],
        },
      ]);
    }

    case "CANCEL_JOB_ENGAGEMENT": {
      const now = Date.now();
      return cancelJobEngagement(state, action.engagementId, now);
    }

    case "START_PROJECT":
    case "COMPLETE_PROJECT":
      return state;

    default:
      return state;
  }
}

export function createGameState(): GameState {
  return createInitialState();
}

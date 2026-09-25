import {
  STRUCTURES,
  RESEARCH,
  computeNetWorth,
  recomputeDerivedStats,
  computeLocationStats,
  totalStructureLevel,
  WIN_NET_WORTH,
  projectedStructureLevels,
  projectedResearchLevels,
  officeSiteLabel,
  recruitmentOrderDurationMs,
  emptyUnitRoster
} from "./constants";
import { pushCompletionAlert } from "./completionAlerts";
import { researchBuildTimeMs } from "./researchBalance";
import {
  siteRateBonusesForState
} from "./mapWorld";
import {
  branchOfficeIdForSite,
  ownedOfficeIds
} from "./branchSites";
import {
  unitDefinition
} from "./unitEffects";
import { appendActivityLogs } from "./logbook";
import { normalizeResourceCost, branchStartStructureLevels } from "./phaseA";
import {
  buildTimeMsForQueueJob,
  clampResourcesToCaps,
  computeResourceCaps,
  structureSellRefundCost,
  structureUpgradeCostForTargetLevel
} from "./structureBalance";
import {
  scheduleQueueJobTimer,
  timerHasNotElapsed
} from "./timers";
import type {
  GameState,
  ProgressionEffects,
  ResearchId,
  ResourceCost,
  StructureId,
  OfficeLocationId,
  EstablishedBranchSite
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

export function getStructureDef(id: StructureId) {
  const def = STRUCTURES.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown structure ${id}`);
  return def;
}

export function getResearchDef(id: ResearchId) {
  const def = RESEARCH.find((r) => r.id === id);
  if (!def) throw new Error(`Unknown research ${id}`);
  return def;
}

export function newQueueJobId(): string {
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

/** Cost to upgrade from `fromLevel` to `fromLevel + 1` (balance sheet; ignores queue). */
export function researchUpgradeCostForLevel(
  researchId: ResearchId,
  fromLevel: number,
): ResourceCost {
  return progressionCost(fromLevel, getResearchDef(researchId));
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

export function appendBranchOffice(
  state: GameState,
  site: EstablishedBranchSite,
): GameState {
  const officeId = branchOfficeIdForSite(site);
  const next = structuredClone(state);
  next.branchSites = [...next.branchSites, site];
  next.structureLevelsByLocation[officeId] = branchStartStructureLevels();
  next.contractorsByLocation[officeId] = emptyUnitRoster();
  next.structureQueues[officeId] = [];
  next.researchQueues[officeId] = [];
  return next;
}

export function withDerivedStats(state: GameState): GameState {
  const derived = recomputeDerivedStats({
    ...state,
    siteRateBonusByOffice: siteRateBonusesForState(state)
});
  const locationStats = computeLocationStats({
    structureLevelsByLocation: state.structureLevelsByLocation,
    contractorsByLocation: state.contractorsByLocation,
    previous: state.locationStats,
    branchSites: state.branchSites
});
  const caps = computeResourceCaps(state);
  const resources = clampResourcesToCaps(state.resources, caps);
  return {
    ...state,
    resources,
    rates: derived.rates,
    locationStats,
    netWorth: computeNetWorth(resources, locationStats)
};
}

export function applyVictoryCheck(state: GameState): GameState {
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

export function processStructureQueues(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  let next = state;

  for (const officeId of ownedOfficeIds(state)) {
    let queue = [...next.structureQueues[officeId]];
    let queueClock = now;

    while (queue.length > 0) {
      if (queue[0].completesAt === null) {
        const buildMs = buildTimeMsForQueueJob(next, officeId, 0);
        const timing = scheduleQueueJobTimer(
          next,
          queue[0],
          buildMs,
          queueClock,
        );
        queue[0] = { ...queue[0], ...timing };
        if (timerHasNotElapsed(now, queue[0].completesAt!, next)) break;
      }
      const dueAt = queue[0].completesAt;
      if (dueAt === null || timerHasNotElapsed(now, dueAt, next)) break;

      const job = queue.shift()!;
      queueClock = dueAt;
      next = applyStructurePurchase(next, officeId, job.structureId);
      next.structureQueues[officeId] = queue;
      const def = getStructureDef(job.structureId);
      const newLevel =
        next.structureLevelsByLocation[officeId][job.structureId];
      const buildSpent = structureBuildCostForLevel(
        job.structureId,
        newLevel,
      );
      next = appendActivityLogs(
        next,
        [
          {
            category: "structure_complete",
            summary: `${def.name} built at ${officeSiteLabel(next, officeId)}`,
            officeId,
            spent: buildSpent,
            impacts: [
              `Level ${newLevel} at ${officeSiteLabel(next, officeId)}`,
              `Rates and site stats updated`,
            ]
},
        ],
        now,
      );

      let detail: string;
      if (queue.length > 0) {
        const upcoming = queue[0];
        const upcomingDef = getStructureDef(upcoming.structureId);
        const target =
          upcoming.targetLevel ??
          next.structureLevelsByLocation[officeId][upcoming.structureId] + 1;
        detail = `Now building: ${upcomingDef.name} → Lv ${target}`;
      } else {
        detail = `Build queue empty at ${officeSiteLabel(next, officeId)}`;
      }
      next = pushCompletionAlert(
        next,
        {
          kind: "structure",
          title: `${def.name} complete (Lv ${newLevel}) · ${officeSiteLabel(next, officeId)}`,
          detail
},
        notify,
      );
    }

    next = {
      ...next,
      structureQueues: { ...next.structureQueues, [officeId]: queue }
};
  }

  return next;
}

export function processContractorTransfers(state: GameState, now: number): GameState {
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
          summary: `${transfer.count}× ${unit.name} arrived at ${officeSiteLabel(next, transfer.to)}`,
          officeId: transfer.to,
          impacts: [
            `From ${officeSiteLabel(next, transfer.from)}`,
            `${next.contractorsByLocation[transfer.to][transfer.unitId]} ${unit.name} now at site`,
          ]
};
      }),
      now,
    );
  }
  return next;
}

export function processResearchQueues(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  let next = state;

  for (const officeId of ownedOfficeIds(state)) {
    let queue = [...(next.researchQueues[officeId] ?? [])];
    let queueClock = now;

    while (queue.length > 0) {
      if (queue[0].completesAt === null) {
        const buildMs = researchBuildTimeMs(
          queue[0].researchId,
          queue[0].targetLevel,
        );
        const timing = scheduleQueueJobTimer(
          next,
          queue[0],
          buildMs,
          queueClock,
        );
        queue[0] = { ...queue[0], ...timing };
        if (timerHasNotElapsed(now, queue[0].completesAt!, next)) break;
      }
      const dueAt = queue[0].completesAt;
      if (dueAt === null || timerHasNotElapsed(now, dueAt, next)) break;

      const job = queue.shift()!;
      queueClock = dueAt;
      next = applyResearchEffects(next, job.researchId);
      next.researchQueues = { ...next.researchQueues, [officeId]: queue };
      const def = getResearchDef(job.researchId);
      const newLevel = next.researchLevels[job.researchId];
      next = appendActivityLogs(
        next,
        [
          {
            category: "research_complete",
            summary: `${def.name} completed`,
            officeId,
            impacts: [
              `Research level ${newLevel}/${def.maxLevel}`,
              "Firm production rates updated",
            ]
},
        ],
        now,
      );

      let detail: string;
      if (queue.length > 0) {
        const upcoming = queue[0];
        const upcomingDef = getResearchDef(upcoming.researchId);
        detail = `Now researching: ${upcomingDef.name} → Lv ${upcoming.targetLevel}`;
      } else {
        detail = `Research queue empty at ${officeSiteLabel(next, officeId)}`;
      }
      next = pushCompletionAlert(
        next,
        {
          kind: "research",
          title: `${def.name} complete (Lv ${newLevel})`,
          detail
},
        notify,
      );
    }

    next = {
      ...next,
      researchQueues: { ...next.researchQueues, [officeId]: queue }
};
  }

  return next;
}

function startRecruitmentJobTimer(
  state: GameState,
  job: import("./types").RecruitmentJob,
  activationTime: number,
): import("./types").RecruitmentJob {
  const buildMs = recruitmentOrderDurationMs(job.count ?? 1);
  const timing = scheduleQueueJobTimer(state, job, buildMs, activationTime);
  return { ...job, ...timing };
}

export function recruitmentJobsForOffice(
  state: GameState,
  officeId: OfficeLocationId,
) {
  return state.recruitmentJobs.filter((j) => j.officeId === officeId);
}

export function setRecruitmentJobsForOffice(
  state: GameState,
  officeId: OfficeLocationId,
  jobs: import("./types").RecruitmentJob[],
): GameState {
  return {
    ...state,
    recruitmentJobs: [
      ...state.recruitmentJobs.filter((j) => j.officeId !== officeId),
      ...jobs,
    ]
};
}

export function processRecruitmentJobs(
  state: GameState,
  now: number,
  notify = true,
): GameState {
  let next = structuredClone(state);
  const completed: import("./types").RecruitmentJob[] = [];

  for (const officeId of ownedOfficeIds(state)) {
    let jobs = recruitmentJobsForOffice(next, officeId);
    if (jobs.length === 0) continue;

    let queueClock = now;

    if (jobs[0].completesAt === null) {
      jobs[0] = startRecruitmentJobTimer(next, jobs[0], queueClock);
      next = setRecruitmentJobsForOffice(next, officeId, jobs);
    }

    while (
      jobs.length > 0 &&
      jobs[0].completesAt !== null &&
      !timerHasNotElapsed(now, jobs[0].completesAt!, next)
    ) {
      const dueAt = jobs[0].completesAt!;
      const job = jobs.shift()!;
      queueClock = dueAt;
      completed.push(job);
      const hireCount = job.count ?? 1;
      next.contractorsByLocation[job.officeId][job.unitId] =
        (next.contractorsByLocation[job.officeId][job.unitId] ?? 0) + hireCount;
      if (jobs.length > 0 && jobs[0].completesAt === null) {
        jobs[0] = startRecruitmentJobTimer(next, jobs[0], queueClock);
      }
      next = setRecruitmentJobsForOffice(next, officeId, jobs);

      const unit = unitDefinition(job.unitId);
      let detail: string;
      if (jobs.length > 0) {
        const upcoming = jobs[0];
        const upcomingUnit = unitDefinition(upcoming.unitId);
        const upcomingCount = upcoming.count ?? 1;
        detail = `Now hiring: ${upcomingCount}× ${upcomingUnit.name}`;
      } else {
        detail = `Hiring queue empty at ${officeSiteLabel(next, officeId)}`;
      }
      next = pushCompletionAlert(
        next,
        {
          kind: "recruitment",
          title: `${hireCount}× ${unit.name} arrived · ${officeSiteLabel(next, officeId)}`,
          detail
},
        notify,
      );
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
        summary: `${hireCount}× ${unit.name} joined ${officeSiteLabel(next, job.officeId)}`,
        officeId: job.officeId,
        impacts: [
          `${next.contractorsByLocation[job.officeId][job.unitId]} ${unit.name} at site`,
        ]
};
    }),
    now,
  );
}

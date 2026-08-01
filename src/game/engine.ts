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
  isProjectUnlocked,
  canAffordAtOffice,
  applyOfficeCost,
  canBuildStructure,
  isStructureQueueFull,
  canSellStructureLevel,
  projectedStructureLevels,
  MAX_STRUCTURE_QUEUE,
  unitAvailableAt,
  contractorTransferDurationMs,
  rosterAt,
  OFFICE_LABELS,
  RECRUIT_MS_PER_CONTRACTOR,
  MAX_RECRUIT_BATCH,
  normalizeResourceWallet,
  OFFICE_EXPANSION_STRUCTURE_ID,
} from "./constants";
import {
  projectById,
  towerById,
  optimalCrewForProject,
  BRANCH_OPENING_COST,
  branchManagementResearched,
  commercialSiteAt,
} from "./mapWorld";
import {
  addAssignmentToRoster,
  canAssignFromRoster,
  computeMissionModifiers,
  formatAssignmentSummary,
  subtractAssignmentFromRoster,
  unitDefinition,
} from "./unitEffects";
import { appendActivityLogs, cloneResourceCost } from "./logbook";
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
  return progressionCost(state.researchLevels[researchId], def);
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

function scalePayout(payout: ResourceCost, mult: number): ResourceCost {
  const scaled: ResourceCost = {};
  for (const [key, value] of Object.entries(payout)) {
    scaled[key as keyof ResourceCost] = (value ?? 0) * mult;
  }
  return scaled;
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

function processRecruitmentJobs(state: GameState, now: number): GameState {
  if (state.recruitmentJobs.length === 0) return state;

  const pending = state.recruitmentJobs.filter((j) =>
    timerHasNotElapsed(now, j.completesAt, state),
  );
  const completed = state.recruitmentJobs.filter(
    (j) => !timerHasNotElapsed(now, j.completesAt, state),
  );
  if (completed.length === 0) return state;

  const next = structuredClone(state);
  next.recruitmentJobs = pending;
  for (const job of completed) {
    next.contractorsByLocation[job.officeId][job.unitId] =
      (next.contractorsByLocation[job.officeId][job.unitId] ?? 0) + 1;
  }

  return appendActivityLogs(
    next,
    completed.map((job) => {
      const unit = unitDefinition(job.unitId);
      return {
        category: "recruit" as const,
        summary: `${unit.name} joined ${OFFICE_LABELS[job.officeId]}`,
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
    },
    now,
  );
  return withDerivedStats(
    processRecruitmentJobs(
      processContractorTransfers(processStructureQueues(normalized, now), now),
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

function mergeCosts(a: ResourceCost, b: ResourceCost): ResourceCost {
  const merged: ResourceCost = { ...a };
  for (const [key, val] of Object.entries(b)) {
    const k = key as keyof ResourceCost;
    merged[k] = (merged[k] ?? 0) + (val ?? 0);
  }
  return merged;
}

function resolveActiveProjectIfDue(state: GameState, now: number): GameState {
  if (
    !state.activeProject ||
    timerHasNotElapsed(now, state.activeProject.endsAt, state)
  ) {
    return state;
  }

  let project;
  try {
    project = projectById(state.activeProject!.projectId);
  } catch {
    return { ...state, activeProject: null };
  }

  let next = structuredClone(state);
  const optimal = next.activeProject!.optimalCrew;
  const crewAssigned = next.activeProject!.crewAssigned;
  const { payoutMult: basePayMult, durationMult: _ignoredDuration } =
    computeProjectBonuses(next);
  const mission = computeMissionModifiers(crewAssigned, project, optimal);
  const payoutMult = basePayMult * mission.payoutMult;
  next.resources = addResources(
    next.resources,
    scalePayout(project.totalPayout, payoutMult),
  );
  next.resources.reputation += project.reputationGain * payoutMult;

  const officeId = next.activeProject!.officeId;
  next.contractorsByLocation[officeId] = addAssignmentToRoster(
    next.contractorsByLocation[officeId],
    crewAssigned,
  );

  next.completedProjects += 1;
  next.activeProject = null;
  next.netWorth = computeNetWorth(next.resources, next.locationStats);
  next = applyVictoryCheck(next);

  if (next.completedProjects >= 3 && next.phase === 1) {
    next.phase = 2;
    next = appendActivityLogs(next, [
      {
        category: "phase",
        summary: "Entered Phase 2 — Rival bids & espionage",
        impacts: ["Unlocked with 3 completed jobs"],
      },
    ]);
  }

  const gained: ResourceCost = scalePayout(project.totalPayout, payoutMult);
  gained.reputation =
    (gained.reputation ?? 0) + project.reputationGain * payoutMult;

  const crewNote =
    mission.payoutMult >= 0.999
      ? "Full contract value"
      : `${Math.round(mission.payoutMult * 100)}% payout after crew modifiers`;

  return appendActivityLogs(next, [
    {
      category: "bid_complete",
      summary: `Completed ${project.name}`,
      officeId,
      gained,
      impacts: [
        `Crew returned to ${OFFICE_LABELS[officeId]}`,
        crewNote,
        `${next.completedProjects} jobs completed firm-wide`,
      ],
    },
  ]);
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
  next = processContractorTransfers(next, input.eventNow);
  next = processRecruitmentJobs(next, input.eventNow);
  next = resolveActiveProjectIfDue(next, input.eventNow);
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
      return { ...state, view: action.view };

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
      const isOfficeExpansion =
        action.structureId === OFFICE_EXPANSION_STRUCTURE_ID;
      const projected = projectedStructureLevels(
        state,
        action.locationId,
      )[action.structureId];
      if (projected >= def.maxLevel) return state;
      if (
        !isOfficeExpansion &&
        isStructureQueueFull(state, action.locationId)
      ) {
        return state;
      }
      if (!canBuildStructure(state, action.locationId, action.structureId)) {
        return state;
      }
      const cost = structureCost(state, action.locationId, action.structureId);
      if (!canAffordAtOffice(state, action.locationId, cost)) return state;
      const spentSnapshot = cloneResourceCost(cost) ?? cost;
      let next = applyOfficeCost(state, action.locationId, cost);

      if (isOfficeExpansion) {
        const levelBefore =
          next.structureLevelsByLocation[action.locationId][action.structureId];
        return appendActivityLogs(
          withDerivedStats(
            applyStructurePurchase(next, action.locationId, action.structureId),
          ),
          [
          {
            category: "structure_complete",
            summary: `${def.name} upgraded at ${OFFICE_LABELS[action.locationId]}`,
            officeId: action.locationId,
            spent: spentSnapshot,
            impacts: [
              `Level ${levelBefore} → ${levelBefore + 1}`,
              `Office space capacity updated`,
            ],
          },
        ],
        );
      }

      const targetLevel = projected + 1;
      const buildMs = structureBuildTimeMs(action.structureId, targetLevel);
      const queue = [...next.structureQueues[action.locationId]];
      const now = Date.now();
      queue.push({
        structureId: action.structureId,
        targetLevel,
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
      return appendActivityLogs(next, [
        {
          category: "structure_upgrade",
          summary: `Queued ${def.name} at ${OFFICE_LABELS[action.locationId]}`,
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
              ? `${powerRefund} power returned to site pool`
              : "Office space freed at site",
          ],
        },
      ]);
    }

    case "BUY_RESEARCH": {
      const def = getResearchDef(action.researchId);
      if (!isResearchUnlocked(state, def)) return state;
      const level = state.researchLevels[action.researchId];
      if (level >= def.maxLevel) return state;
      const cost = researchCost(state, action.researchId);
      if (!canAffordAtOffice(state, state.selectedOffice, cost)) return state;
      const paid = applyOfficeCost(state, state.selectedOffice, cost);
      const applied = applyResearchEffects(paid, action.researchId);
      const newLevel = applied.researchLevels[action.researchId];
      return appendActivityLogs(applied, [
        {
          category: "research",
          summary: `${def.name} upgraded`,
          officeId: state.selectedOffice,
          spent: cost,
          impacts: [
            `Research level ${newLevel}/${def.maxLevel}`,
            "Firm production rates updated",
          ],
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
      const cost = recruitBatchCost(unitId, count);
      if (!canAffordAtOffice(state, officeId, cost)) return state;

      const now = Date.now();
      const officeJobs = state.recruitmentJobs.filter(
        (j) => j.officeId === officeId,
      );
      let cursor = now;
      if (officeJobs.length > 0 && !state.settings.ignoreTimers) {
        cursor = Math.max(...officeJobs.map((j) => j.completesAt));
      }

      const next = applyOfficeCost(state, officeId, cost);
      const newJobs = [];
      for (let i = 0; i < count; i += 1) {
        cursor = scheduleTimerAt(state, cursor, RECRUIT_MS_PER_CONTRACTOR);
        newJobs.push({
          id: `${cursor}-${officeId}-${unitId}-${Math.random().toString(36).slice(2, 9)}`,
          officeId,
          unitId,
          completesAt: cursor,
        });
      }
      next.recruitmentJobs = [...next.recruitmentJobs, ...newJobs];

      const unit = unitDefinition(unitId);
      const totalSec = (count * RECRUIT_MS_PER_CONTRACTOR) / 1000;
      return appendActivityLogs(next, [
        {
          category: "recruit",
          summary: `Queued ${count}× ${unit.name} at ${OFFICE_LABELS[officeId]}`,
          officeId,
          spent: cost,
          impacts: [
            `${RECRUIT_MS_PER_CONTRACTOR / 1000}s per hire`,
            `Last arrives in ~${Math.ceil(totalSec)}s`,
          ],
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

    case "START_PROJECT": {
      if (state.activeProject) return state;
      let project;
      try {
        project = projectById(action.projectId);
      } catch {
        return state;
      }
      if (state.selectedTowerId !== project.towerId) return state;
      const officeId = state.selectedOffice;
      const officeRoster = rosterAt(state, officeId);
      if (!isProjectUnlocked(state, project)) return state;

      const crewAssigned = action.crewAssigned;
      if (!canAssignFromRoster(officeRoster, crewAssigned)) return state;

      const mergedBid = mergeCosts(project.minBid, action.bid);
      if (!canAffordAtOffice(state, officeId, mergedBid)) return state;

      const tower = towerById(project.towerId);
      const optimalCrew = optimalCrewForProject(tower, project);
      const { durationMult: baseDurationMult } = computeProjectBonuses(state);
      const mission = computeMissionModifiers(crewAssigned, project, optimalCrew);
      const durationMs =
        project.durationSec * 1000 * baseDurationMult * mission.durationMult;

      const next = applyOfficeCost(state, officeId, mergedBid);
      next.contractorsByLocation[officeId] = subtractAssignmentFromRoster(
        officeRoster,
        crewAssigned,
      );
      next.activeProject = {
        projectId: project.id,
        towerId: project.towerId,
        bid: mergedBid,
        crewAssigned,
        officeId,
        optimalCrew,
        endsAt: scheduleTimerAt(state, Date.now(), durationMs),
      };
      return appendActivityLogs(next, [
        {
          category: "bid_start",
          summary: `Accepted contract: ${project.name} (${tower.name})`,
          officeId,
          spent: mergedBid,
          impacts: [
            formatAssignmentSummary(crewAssigned),
            `Job duration ~${Math.round(durationMs / 1000)}s`,
            `Expected payout ~${Math.round(mission.payoutMult * 100)}% before research/structure bonuses`,
          ],
        },
      ]);
    }

    case "COMPLETE_PROJECT":
      return state;

    default:
      return state;
  }
}

export function createGameState(): GameState {
  return createInitialState();
}

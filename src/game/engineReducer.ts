import {
  createInitialState,
  addResources,
  isResearchUnlocked,
  recruitBatchCost,
  canAffordAtOffice,
  applyOfficeCost,
  applyOfficeRefund,
  canBuildStructure,
  isStructureUnlocked,
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
  contractorTransferSupplyCost,
  contractorTransferTravelHexes,
  officeSiteLabel,
  MAX_RECRUIT_BATCH,
  OFFICE_EXPANSION_STRUCTURE_ID,
  recruitmentOrderDurationMs,
  recruitmentOrderBuildTimeHours,
  clampUiScale
} from "./constants";
import { resolveOfficeLocation } from "./officeSelection";
import { cancelRefundFromSpent } from "./refunds";
import { researchBuildTimeMs } from "./researchBalance";
import { SECRETARY_IDS } from "./secretaryData";
import { formatQueueTimeHours } from "./timers";
import {
  cancelJobEngagement,
  engageJobPosting,
  handleOnlinePostingCompleted,
  jobDefinitionById
} from "./jobs";
import {
  applyOnlineDevRestrictions,
  isOnlineMode
} from "../multiplayer/playerHq";
import {
  branchSlotAt,
  branchOpeningCostForPad,
  branchManagementResearched,
  branchManagerAvailable,
  canEstablishBranchPad,
  commercialSiteAt,
  defaultBranchSiteName
} from "./mapWorld";
import { normalizeCommercialLotBranchSlots } from "./branchCommercial";
import {
  branchOfficeIdForSite,
  branchSiteForOfficeId,
  hasBranchOffices,
  isBranchOfficeId
} from "./branchSites";
import {
  formatAssignmentSummary,
  totalAssigned,
  unitDefinition
} from "./unitEffects";
import { jobSiteCoordForDefinition } from "./mapWorld";
import {
  jobTravelHexesToCoord,
  roundTripTravelSupplyCost
} from "./mapTravel";
import { appendActivityLogs, cloneResourceCost, queueCancelLogFields } from "./logbook";
import {
  structureBuildTimeMs,
  structureSellRefundCost,
  structureUpgradeCostForTargetLevel,
  getStructureLevelRow
} from "./structureBalance";
import {
  scheduleTimerAt
} from "./timers";
import type {
  GameAction,
  GameState,
  ResourceCost,
  EstablishedBranchSite
} from "./types";
import {
  appendBranchOffice,
  getResearchDef,
  getStructureDef,
  newQueueJobId,
  recruitmentJobsForOffice,
  researchCost,
  setRecruitmentJobsForOffice,
  structureCost,
  withDerivedStats
} from "./engineQueues";
import {
  advanceSimulatedTime,
  devSkipTime,
  finalizeLoadedState,
  finalizeOnlineSyncState,
  mergeOnlineRemoteState
} from "./engineTick";

/** Economy/world actions — trigger immediate online Firestore sync (not UI nav). */
export const WORLD_PERSIST_ACTIONS = new Set<GameAction["type"]>([
  "ESTABLISH_BRANCH",
  "RENAME_BRANCH",
  "BUY_STRUCTURE",
  "CANCEL_STRUCTURE_JOB",
  "DOWNGRADE_STRUCTURE",
  "BUY_RESEARCH",
  "CANCEL_RESEARCH_JOB",
  "RECRUIT_CONTRACTOR",
  "START_RECRUITMENT",
  "CANCEL_RECRUITMENT_JOB",
  "START_CONTRACTOR_TRANSFER",
  "ENGAGE_JOB",
  "CANCEL_JOB_ENGAGEMENT",
  "START_PROJECT",
  "COMPLETE_PROJECT",
  "ONLINE_HANDLE_COMPLETED_POSTING",
]);

export function shouldBumpWorldPersistRevision(action: GameAction): boolean {
  return WORLD_PERSIST_ACTIONS.has(action.type);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  let next = reduceGameState(state, action);
  if (next === state) return next;

  if (shouldBumpPersistRevision(action)) {
    const baseRev = Math.max(state.persistRevision ?? 0, next.persistRevision ?? 0);
    next = { ...next, persistRevision: baseRev + 1 };
  }
  if (shouldBumpWorldPersistRevision(action)) {
    const baseRev = Math.max(
      state.worldPersistRevision ?? 0,
      next.worldPersistRevision ?? 0,
    );
    next = { ...next, worldPersistRevision: baseRev + 1 };
  }
  return next;
}

const PERSIST_NEUTRAL_ACTIONS = new Set<GameAction["type"]>([
  "TICK",
  "LOAD",
  "SET_ONLINE_SESSION",
  "SET_ONLINE_CONNECTION_STATUS",
  "SET_ONLINE_RESET_GENERATION",
  "SET_ONLINE_SAVE_SESSION",
  "SYNC_SHARED_JOBS",
  "SYNC_COMPANY_PRESENCE",
  "CLEAR_PENDING_SYNC",
  "MARK_POSTING_PAYOUT_DONE",
]);

function shouldBumpPersistRevision(action: GameAction): boolean {
  return !PERSIST_NEUTRAL_ACTIONS.has(action.type);
}

function reduceGameState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "LOAD":
      if (isOnlineMode(action.state) || isOnlineMode(state)) {
        return finalizeOnlineSyncState(
          mergeOnlineRemoteState(state, action.state),
          Date.now(),
        );
      }
      return finalizeLoadedState(
        {
          ...action.state,
          onlineSession: action.state.onlineSession ?? state.onlineSession
},
        Date.now(),
      );

    case "SET_VIEW": {
      if (action.view === "logbook") {
        return {
          ...state,
          view: "secretary",
          secretaryPanel: "log",
          ...(action.logbookFilter !== undefined
            ? { logbookFilterId: action.logbookFilter }
            : {}),
          logbookHighlightEntryId: action.logbookHighlightEntryId ?? null,
          recruitFocusUnitId: null,
          jobFocusPostingId: null
};
      }

      return {
        ...state,
        view: action.view,
        homePanel: action.view === "overview" ? "landing" : state.homePanel,
        secretaryPanel:
          action.view === "secretary" ? "landing" : state.secretaryPanel,
        ...(action.logbookFilter !== undefined
          ? { logbookFilterId: action.logbookFilter }
          : {}),
        recruitFocusUnitId:
          action.view === "recruitment"
            ? (action.recruitFocusUnitId ?? null)
            : null,
        logbookHighlightEntryId: null,
        jobFocusPostingId:
          action.view === "office"
            ? (action.jobFocusPostingId ?? null)
            : null
};
    }

    case "CLEAR_JOB_FOCUS":
      return { ...state, jobFocusPostingId: null };

    case "SET_LOGBOOK_FILTER":
      return { ...state, logbookFilterId: action.filterId };

    case "CLEAR_LOGBOOK_HIGHLIGHT":
      return { ...state, logbookHighlightEntryId: null };

    case "CLEAR_ACTIVITY_LOG":
      return {
        ...state,
        activityLog: [],
        logbookHighlightEntryId: null
};

    case "DISMISS_JOB_REPORT": {
      const dismissed = state.dismissedJobReportIds ?? [];
      if (dismissed.includes(action.logEntryId)) {
        return state;
      }
      return {
        ...state,
        dismissedJobReportIds: [...dismissed, action.logEntryId]
};
    }

    case "CLEAR_ALL_JOB_REPORTS": {
      const dismissed = new Set(state.dismissedJobReportIds ?? []);
      for (const entry of state.activityLog) {
        if (
          entry.category === "job_complete" ||
          entry.category === "job_cancel"
        ) {
          dismissed.add(entry.id);
        }
      }
      return {
        ...state,
        dismissedJobReportIds: [...dismissed]
};
    }

    case "SELECT_CHIEF_OF_STAFF": {
      if (!SECRETARY_IDS.includes(action.secretaryId)) return state;
      if (state.chiefOfStaffId === action.secretaryId) return state;
      return { ...state, chiefOfStaffId: action.secretaryId };
    }

    case "SET_SECRETARY_PANEL":
      return {
        ...state,
        view: "secretary",
        secretaryPanel: action.panel,
        ...(action.logbookFilter !== undefined
          ? { logbookFilterId: action.logbookFilter }
          : {}),
        ...(action.logbookHighlightEntryId !== undefined
          ? { logbookHighlightEntryId: action.logbookHighlightEntryId }
          : {})
};

    case "SET_HOME_PANEL":
      return {
        ...state,
        view: "overview",
        homePanel: action.panel
};

    case "DISMISS_OFFLINE_SUMMARY":
      if (!state.pendingOfflineSummary) return state;
      return { ...state, pendingOfflineSummary: null };

    case "DISMISS_COMPLETION_ALERT": {
      const pending = state.pendingCompletionAlerts ?? [];
      if (!pending.some((alert) => alert.id === action.alertId)) {
        return state;
      }
      return {
        ...state,
        pendingCompletionAlerts: pending.filter(
          (alert) => alert.id !== action.alertId,
        )
};
    }

    case "SELECT_OFFICE": {
      if (action.officeId === "all" && !hasBranchOffices(state)) {
        return state;
      }
      if (
        action.officeId !== "all" &&
        action.officeId !== "hq" &&
        isBranchOfficeId(action.officeId) &&
        !branchSiteForOfficeId(state, action.officeId)
      ) {
        return state;
      }
      if (
        action.officeId === "hq" ||
        (action.officeId !== "all" && isBranchOfficeId(action.officeId))
      ) {
        return {
          ...state,
          selectedOffice: action.officeId,
          lastSelectedOffice: action.officeId
};
      }
      return { ...state, selectedOffice: "all" };
    }

    case "SELECT_TOWER":
      return { ...state, selectedTowerId: action.towerId };

    case "SELECT_COMMERCIAL_HEX":
      return { ...state, selectedCommercialHex: action.coord };

    case "ESTABLISH_BRANCH": {
      if (!branchManagementResearched(state)) return state;
      if (branchManagerAvailable(state) < 1) return state;
      const pick = action.coord ?? state.selectedCommercialHex;
      const site = pick ? commercialSiteAt(pick) : undefined;
      if (!site) return state;

      const slotIndex = Math.min(
        normalizeCommercialLotBranchSlots(site.branchSlots).length - 1,
        Math.max(0, action.slotIndex ?? 0),
      );
      if (!canEstablishBranchPad(state, site.id, slotIndex)) return state;

      const slot = branchSlotAt(site.id, slotIndex);
      if (!slot) return state;

      const openingCost = branchOpeningCostForPad(site.id, slotIndex);

      const branchSite: EstablishedBranchSite = {
        commercialLotId: site.id,
        slotIndex,
        name: defaultBranchSiteName(
          site.id,
          slotIndex,
          state.branchSites.length + 1,
        ),
        officeSpaceBase: slot.officeSpace
};
      const officeId = branchOfficeIdForSite(branchSite);

      let next = applyOfficeCost(state, "hq", openingCost);
      next.contractorsByLocation = {
        ...next.contractorsByLocation,
        hq: {
          ...next.contractorsByLocation.hq,
          branch_manager: Math.max(
            0,
            (next.contractorsByLocation.hq.branch_manager ?? 0) - 1,
          )
}
};
      next = appendBranchOffice(next, branchSite);
      next.selectedCommercialHex = null;
      next.selectedOffice = "all";
      next.lastSelectedOffice = officeId;
      return appendActivityLogs(withDerivedStats(next), [
        {
          category: "research",
          summary: `Opened ${branchSite.name} at ${site.label}`,
          officeId,
          spent: openingCost,
          impacts: [
            "Consumed 1 Branch Manager",
            `${slot.label} pad · ${slot.officeSpace} office space (expands to ${slot.expansionCap})`,
            "Branch office now on the regional map",
            "Manage structures and staff at the new site",
          ]
},
      ]);
    }

    case "RENAME_BRANCH": {
      const officeId =
        action.officeId ??
        (isBranchOfficeId(state.lastSelectedOffice)
          ? state.lastSelectedOffice
          : null);
      if (!officeId || !isBranchOfficeId(officeId)) return state;
      const name = action.name.trim().slice(0, 48);
      if (!name) return state;
      return {
        ...state,
        branchSites: state.branchSites.map((site) =>
          branchOfficeIdForSite(site) === officeId ? { ...site, name } : site,
        )
};
    }

    case "UPDATE_SETTINGS": {
      const patch = isOnlineMode(state)
        ? (() => {
            const { ignoreCosts: _c, ignoreTimers: _t, ...rest } =
              action.settings;
            return { ...rest };
          })()
        : action.settings;
      const settings = { ...state.settings, ...patch };
      if (patch.uiScale !== undefined) {
        settings.uiScale = clampUiScale(patch.uiScale);
      }
      const next = {
        ...state,
        settings
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
      const deltaSec = (now - state.lastTickAt) / 1000;
      if (deltaSec <= 0) return state;

      return advanceSimulatedTime(state, {
        productionDeltaSec: deltaSec,
        eventNow: now,
        lastTickAt: now
});
    }

    case "DEV_SKIP_TIME":
      if (isOnlineMode(state)) return state;
      return devSkipTime(state, action.minutes);

    case "BUY_STRUCTURE": {
      const def = getStructureDef(action.structureId);
      if (!isStructureUnlocked(state, action.structureId)) return state;
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
            : null
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
            ? `Queued ${def.name} at ${officeSiteLabel(next, action.locationId)}`
            : `Queued ${def.name} at ${officeSiteLabel(next, action.locationId)}`,
          officeId: action.locationId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${queue.length}/${MAX_STRUCTURE_QUEUE}`,
            queue.length === 1
              ? `Build time ${buildHours} game hr (real-time)`
              : "Waiting behind earlier queued builds",
          ]
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
          summary: `Cancelled ${def.name} at ${officeSiteLabel(next, action.locationId)}`,
          officeId: action.locationId,
          ...queueCancelLogFields(spent, refund)
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
          summary: `Sold ${def.name} level at ${officeSiteLabel(next, action.locationId)}`,
          officeId: action.locationId,
          gained,
          impacts: [
            `Now level ${newLevel}`,
            powerRefund > 0
              ? `${powerRefund} Power returned to site pool`
              : "Office space freed at site",
          ]
},
      ]);
    }

    case "BUY_RESEARCH": {
      const officeId = resolveOfficeLocation(
        state,
        action.officeId,
      );
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
          queue.length === 0 ? scheduleTimerAt(next, now, buildMs) : null
});
      next.researchQueues = { ...next.researchQueues, [officeId]: queue };
      const buildHours = buildMs / (3600 * 1000);
      return appendActivityLogs(next, [
        {
          category: "research",
          summary: `Queued ${def.name} at ${officeSiteLabel(next, officeId)}`,
          officeId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${queue.length}/${MAX_RESEARCH_QUEUE}`,
            queue.length === 1
              ? `Research time ${buildHours.toFixed(2)} game hr (real-time)`
              : "Waiting behind earlier queued research",
          ]
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
        [action.officeId]: queue.filter((j) => j.id !== action.jobId)
};
      return appendActivityLogs(next, [
        {
          category: "research_cancel",
          summary: `Cancelled ${def.name} at ${officeSiteLabel(next, action.officeId)}`,
          officeId: action.officeId,
          ...queueCancelLogFields(spent, refund)
},
      ]);
    }

    case "RECRUIT_CONTRACTOR": {
      if (state.selectedOffice === "all") return state;
      const inner = gameReducer(state, {
        type: "START_RECRUITMENT",
        officeId: state.selectedOffice,
        unitId: action.unitId,
        count: 1
});
      return inner;
    }

    case "START_RECRUITMENT": {
      const count = Math.floor(action.count);
      if (count < 1 || count > MAX_RECRUIT_BATCH) return state;
      const { officeId, unitId } = action;
      if (unitId === "branch_manager" && !branchManagementResearched(state)) {
        return state;
      }
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
          : null
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
          summary: `Queued order: ${count}× ${unit.name} at ${officeSiteLabel(merged, officeId)}`,
          officeId,
          spent: spentSnapshot,
          impacts: [
            `Queue ${officeJobs.length + 1}/${MAX_RECRUIT_QUEUE} orders`,
            active
              ? `Arrives in ${formatQueueTimeHours(orderHours)}`
              : "Waiting behind earlier orders",
          ]
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
          summary: `Cancelled hire: ${job.count ?? 1}× ${unit.name} at ${officeSiteLabel(next, job.officeId)}`,
          officeId: job.officeId,
          ...queueCancelLogFields(spent, refund)
},
      ]);
    }

    case "START_CONTRACTOR_TRANSFER": {
      const { from, to, unitId } = action;
      const count = action.count ?? 1;
      if (from === to || count < 1) return state;
      if (isBranchOfficeId(from) && !branchSiteForOfficeId(state, from)) {
        return state;
      }
      if (isBranchOfficeId(to) && !branchSiteForOfficeId(state, to)) {
        return state;
      }
      if (unitAvailableAt(state, from, unitId) < count) {
        return state;
      }
      const travelHexes = contractorTransferTravelHexes(
        state,
        from,
        to,
        unitId,
        count,
      );
      const supplyCost = contractorTransferSupplyCost(
        state,
        from,
        to,
        unitId,
        count,
      );
      if (!canAffordAtOffice(state, from, { supply: supplyCost })) {
        return state;
      }

      const now = Date.now();
      let next = structuredClone(state);
      if (supplyCost > 0) {
        next = applyOfficeCost(next, from, { supply: supplyCost });
      }
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
        )
});
      const unit = unitDefinition(unitId);
      const travelSec =
        contractorTransferDurationMs(state, from, to, unitId, count) / 1000;
      return appendActivityLogs(next, [
        {
          category: "transfer",
          summary: `Relocated ${count}× ${unit.name} toward ${officeSiteLabel(next, to)}`,
          officeId: from,
          impacts: [
            `Left ${officeSiteLabel(next, from)}`,
            `${travelHexes} hex · ${travelSec}s`,
            supplyCost > 0 ? `${supplyCost} supply` : null,
          ].filter((line): line is string => Boolean(line))
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
      const travelHexes = jobTravelHexesToCoord(
        state,
        engagement.officeId,
        jobSiteCoordForDefinition(def),
      );
      const travelSupply = roundTripTravelSupplyCost(
        travelHexes,
        totalAssigned(engagement.crewAssigned),
      );
      return appendActivityLogs(next, [
        {
          category: "job_engage",
          summary: `Engaged: ${def.title}`,
          officeId: engagement.officeId,
          spent: travelSupply > 0 ? { supply: travelSupply } : undefined,
          impacts: [
            formatAssignmentSummary(engagement.crewAssigned),
            travelSupply > 0
              ? `${travelSupply} supply · ${travelHexes} hex round trip`
              : `${travelHexes} hex round trip`,
            "Crew en route — work starts on arrival",
            `Shift ~${Math.round(def.durationSec / 3600)} hr once on site`,
          ]
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

    case "SYNC_SHARED_JOBS":
      return {
        ...state,
        jobPostings: action.jobPostings
};

    case "SYNC_COMPANY_PRESENCE":
      return {
        ...state,
        companyPresence: action.companyPresence
};

    case "SET_ONLINE_SESSION":
      return applyOnlineDevRestrictions({
        ...state,
        onlineSession: action.session
});

    case "SET_ONLINE_CONNECTION_STATUS":
      return {
        ...state,
        onlineConnectionStatus: action.status
};

    case "SET_ONLINE_RESET_GENERATION":
      return {
        ...state,
        onlineResetGeneration: action.generation
};

    case "SET_ONLINE_SAVE_SESSION":
      return {
        ...state,
        onlineSaveSessionId: action.sessionId
};

    case "ONLINE_HANDLE_COMPLETED_POSTING":
      return handleOnlinePostingCompleted(
        state,
        action.postingId,
        action.now,
      );

    case "MARK_POSTING_PAYOUT_DONE":
      if (state.completedPostingPayouts?.includes(action.postingId)) {
        return state;
      }
      return {
        ...state,
        completedPostingPayouts: [
          ...(state.completedPostingPayouts ?? []),
          action.postingId,
        ]
};

    case "CLEAR_PENDING_SYNC": {
      const idx = state.jobEngagements.findIndex(
        (e) => e.id === action.engagementId,
      );
      if (idx < 0) return state;
      const engagement = state.jobEngagements[idx];
      const remaining = Math.max(
        0,
        (engagement.pendingSyncUnitHours ?? 0) - action.hours,
      );
      const next = structuredClone(state);
      next.jobEngagements[idx] = {
        ...engagement,
        pendingSyncUnitHours: remaining
};
      return next;
    }

    default:
      return state;
  }
}

export function createGameState(): GameState {
  return createInitialState();
}


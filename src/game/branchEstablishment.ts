import type {
  AxialCoord,
  BranchEstablishmentPhase,
  BranchEstablishmentTransit,
  CommercialLotId,
  GameState,
  OfficeLocationId,
  ResourceCost,
} from "./types";
import { activePlayerId } from "../multiplayer/playerHq";
import { axialKey, parseAxialKey } from "./openOffice";
import { branchOfficeIdForOpenPad } from "./branchOfficeIds";
import { establishedBranchAtPad } from "./branchSites";
import {
  canOpenAnotherBranch,
  companyOfficeSiteFraction,
} from "./branchCap";
import { commercialLotById } from "./commercialLots";
import { branchOpeningCostForPadOnLot } from "./branchCommercial";
import { formatNumber } from "./formatUtil";
import { formatJobDurationSec } from "./jobBoard";
import { commercialSiteAt } from "./commercialSiteLookup";
import {
  jobTravelDurationMsToCoord,
  jobTravelHexesToCoord,
} from "./mapTravel";
import {
  applyOfficeCost,
  applyOfficeRefund,
  canAffordAtOffice,
  powerAvailable,
  RESOURCE_LABELS,
  splitResourceCost,
  unitAvailableAt,
} from "./constants";

function branchOpeningCostForPad(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): ResourceCost {
  return branchOpeningCostForPadOnLot(
    commercialLotById(commercialLotId),
    slotIndex,
  );
}
import {
  formatTimerRemaining,
  scheduleTimerAt,
  timerDelayMs,
} from "./timers";
import { appendActivityLogs, cloneResourceCost } from "./logbook";

export function branchEstablishmentPhase(
  transit: BranchEstablishmentTransit,
): BranchEstablishmentPhase {
  return transit.phase ?? "outbound";
}

export function branchEstablishmentInTransitToPad(
  state: GameState,
  hexKey: string,
  padIndex: number,
): BranchEstablishmentTransit | undefined {
  return state.branchEstablishmentTransits.find(
    (t) => t.hexKey === hexKey && t.padIndex === padIndex,
  );
}

export function branchAtPad(
  state: GameState,
  hexKey: string,
  padIndex: number,
) {
  return state.branchSites.find(
    (s) =>
      (s.hexKey ?? "") === hexKey &&
      (s.padIndex ?? s.slotIndex ?? -1) === padIndex &&
      !s.closingStartedAt,
  );
}

export function padIsAvailableForEstablish(
  state: GameState,
  hexKey: string,
  padIndex: number,
  /** When finishing this transit, it must not count as blocking the pad. */
  exceptTransitId?: string,
): boolean {
  const inTransit = branchEstablishmentInTransitToPad(state, hexKey, padIndex);
  if (inTransit && inTransit.id !== exceptTransitId) {
    return false;
  }
  const coord = parseAxialKey(hexKey);
  if (coord) {
    const commercial = commercialSiteAt(coord, state.settings);
    if (commercial) {
      return !establishedBranchAtPad(state, commercial.id, padIndex);
    }
  }
  if (branchAtPad(state, hexKey, padIndex)) return false;
  const closing = state.branchSites.find(
    (s) =>
      (s.hexKey ?? "") === hexKey &&
      (s.padIndex ?? s.slotIndex ?? -1) === padIndex &&
      s.closingStartedAt,
  );
  return !closing;
}

function branchManagementResearched(state: GameState): boolean {
  return state.researchLevels.branch_management >= 1;
}

function canEngageMoreJobsForBranches(state: GameState): boolean {
  const cap = 3 + (state.researchLevels.portfolio_management ?? 0);
  const owner =
    state.onlineSession?.playMode === "online"
      ? state.onlineSession.accountId
      : "local";
  const active =
    state.jobEngagements.length +
    state.branchEstablishmentTransits.filter((t) => t.ownerPlayerId === owner)
      .length;
  return active < cap;
}

export function canSendBranchEstablishment(
  state: GameState,
  fromOfficeId: OfficeLocationId,
  coord: AxialCoord,
  padIndex: number,
  openingCost: ResourceCost,
): boolean {
  if (!branchManagementResearched(state)) return false;
  if (!canEngageMoreJobsForBranches(state)) return false;
  if (!canOpenAnotherBranch(state)) return false;
  const hexKey = axialKey(coord);
  if (!padIsAvailableForEstablish(state, hexKey, padIndex)) return false;
  if (unitAvailableAt(state, fromOfficeId, "branch_manager") < 1) return false;
  if (!canAffordAtOffice(state, fromOfficeId, openingCost)) return false;
  return true;
}

export function branchEstablishBlockersForPad(
  state: GameState,
  commercialLotId: CommercialLotId,
  slotIndex: number,
  coord: AxialCoord,
): string[] {
  if (establishedBranchAtPad(state, commercialLotId, slotIndex)) {
    return ["Pad already open"];
  }
  const hexKey = axialKey(coord);
  if (
    state.branchEstablishmentTransits.some(
      (t) => t.hexKey === hexKey && t.padIndex === slotIndex,
    )
  ) {
    return ["Branch Manager already traveling to this pad"];
  }
  const blockers: string[] = [];
  if (!branchManagementResearched(state)) {
    blockers.push("Research Branch Management (Research tab)");
  }
  if (!canOpenAnotherBranch(state)) {
    const { open, max } = companyOfficeSiteFraction(state);
    blockers.push(`Branch office cap reached (${open}/${max})`);
  }
  const jobEngagementCap =
    3 + (state.researchLevels.portfolio_management ?? 0);
  const owner =
    state.onlineSession?.playMode === "online"
      ? state.onlineSession.accountId
      : "local";
  const activeJobs =
    state.jobEngagements.length +
    state.branchEstablishmentTransits.filter((t) => t.ownerPlayerId === owner)
      .length;
  if (activeJobs >= jobEngagementCap) {
    blockers.push(
      `Team cap reached (${jobEngagementCap} slots — finish or cancel a job first)`,
    );
  }
  if ((state.contractorsByLocation.hq?.branch_manager ?? 0) < 1) {
    blockers.push("Hire a Branch Manager at HQ (sent on establish)");
  }
  const openingCost = branchOpeningCostForPad(commercialLotId, slotIndex);
  if (canSendBranchEstablishment(state, "hq", coord, slotIndex, openingCost)) {
    return blockers;
  }
  const { global, power } = splitResourceCost(openingCost);
  for (const [key, amount] of Object.entries(global)) {
    const k = key as keyof GameState["resources"];
    const need = amount ?? 0;
    if (state.resources[k] < need) {
      blockers.push(
        `Need ${formatNumber(need)} ${RESOURCE_LABELS[k]} (have ${formatNumber(state.resources[k])})`,
      );
    }
  }
  const freePower = powerAvailable(state.locationStats.hq);
  if (power > freePower) {
    blockers.push(
      `Need ${power} Power at HQ (${formatNumber(freePower)} free — build Power Grid or sell bids' power use)`,
    );
  }
  if (blockers.length === 0) {
    blockers.push("Pay branch opening costs at HQ");
  }
  return blockers;
}

export function branchEstablishmentTravelSummary(
  state: GameState,
  fromOfficeId: OfficeLocationId,
  coord: AxialCoord,
): { durationLabel: string; hexes: number } {
  const hexes = jobTravelHexesToCoord(state, fromOfficeId, coord);
  const durationMs = timerDelayMs(
    state,
    jobTravelDurationMsToCoord(state, fromOfficeId, coord),
  );
  return {
    hexes,
    durationLabel:
      durationMs <= 0
        ? "Instant"
        : formatJobDurationSec(durationMs / 1000),
  };
}

/** Charge opening cost, consume BM, start transit + activity log. */
export function applySendBranchEstablishment(
  state: GameState,
  input: {
    coord: AxialCoord;
    padIndex: number;
    fromOfficeId: OfficeLocationId;
    openingCost: ResourceCost;
    plannedBranchName?: string;
    now: number;
  },
): GameState | null {
  const { coord, padIndex, fromOfficeId, openingCost, plannedBranchName, now } =
    input;
  if (
    !canSendBranchEstablishment(
      state,
      fromOfficeId,
      coord,
      padIndex,
      openingCost,
    )
  ) {
    return null;
  }

  const travel = branchEstablishmentTravelSummary(state, fromOfficeId, coord);
  let next = applyOfficeCost(state, fromOfficeId, openingCost);
  const transit = newBranchEstablishmentTransit({
    fromOfficeId,
    coord,
    padIndex,
    openingCost,
    plannedBranchName,
    state: next,
    now,
  });

  next = {
    ...next,
    contractorsByLocation: {
      ...next.contractorsByLocation,
      [fromOfficeId]: {
        ...next.contractorsByLocation[fromOfficeId],
        branch_manager: Math.max(
          0,
          (next.contractorsByLocation[fromOfficeId]?.branch_manager ?? 0) - 1,
        ),
      },
    },
    branchEstablishmentTransits: [...next.branchEstablishmentTransits, transit],
    selectedCommercialHex: null,
    worldPersistRevision: (next.worldPersistRevision ?? 0) + 1,
  };

  return appendActivityLogs(next, [
    {
      category: "research",
      summary: `Branch Manager dispatched (${travel.durationLabel} travel)`,
      spent: openingCost,
      impacts: [
        transit.plannedBranchName
          ? `Opens as ${transit.plannedBranchName}`
          : "Default branch name on arrival",
        `Arrives in ${travel.durationLabel} · ${travel.hexes} Hx from ${fromOfficeId === "hq" ? "HQ" : "office"}`,
        "Uses 1 team slot until the manager arrives or returns",
        "Opening cost paid now; branch opens on arrival",
      ],
    },
  ]);
}

export function newBranchEstablishmentTransit(input: {
  fromOfficeId: OfficeLocationId;
  coord: AxialCoord;
  padIndex: number;
  openingCost: ResourceCost;
  plannedBranchName?: string;
  state: GameState;
  now: number;
}): BranchEstablishmentTransit {
  const hexKey = axialKey(input.coord);
  const travelMs = jobTravelDurationMsToCoord(
    input.state,
    input.fromOfficeId,
    input.coord,
  );
  const plannedBranchName = input.plannedBranchName?.trim().slice(0, 48);
  return {
    id: `bet-${input.now}-${hexKey}-${input.padIndex}`,
    ownerPlayerId: activePlayerId(input.state),
    fromOfficeId: input.fromOfficeId,
    hexKey,
    padIndex: input.padIndex,
    openingCostSpent: { ...input.openingCost },
    ...(plannedBranchName ? { plannedBranchName } : {}),
    phase: "outbound",
    departedAt: input.now,
    arrivesAt: scheduleTimerAt(input.state, input.now, travelMs),
  };
}

export function refundBranchEstablishment(
  state: GameState,
  transit: BranchEstablishmentTransit,
  reason: string,
): GameState {
  let next = structuredClone(state);
  next.branchEstablishmentTransits = next.branchEstablishmentTransits.filter(
    (t) => t.id !== transit.id,
  );
  const from = transit.fromOfficeId;
  next.contractorsByLocation = {
    ...next.contractorsByLocation,
    [from]: {
      ...next.contractorsByLocation[from],
      branch_manager:
        (next.contractorsByLocation[from]?.branch_manager ?? 0) + 1,
    },
  };
  const cost = transit.openingCostSpent;
  next = applyOfficeRefund(next, from, cost);
  void reason;
  return next;
}

export function beginBranchEstablishmentReturn(
  state: GameState,
  transit: BranchEstablishmentTransit,
  now: number,
): GameState {
  const coord = parseAxialKey(transit.hexKey);
  if (!coord) {
    return refundBranchEstablishment(state, transit, "bad coord");
  }
  const travelMs = jobTravelDurationMsToCoord(
    state,
    transit.fromOfficeId,
    coord,
  );
  let next = structuredClone(state);
  const idx = next.branchEstablishmentTransits.findIndex(
    (t) => t.id === transit.id,
  );
  if (idx < 0) return state;
  next.branchEstablishmentTransits[idx] = {
    ...transit,
    phase: "returning",
    departedAt: now,
    arrivesAt: scheduleTimerAt(next, now, travelMs),
  };
  next.worldPersistRevision = (next.worldPersistRevision ?? 0) + 1;
  return appendActivityLogs(next, [
    {
      category: "research",
      summary: "Branch opening cancelled — Branch Manager returning",
      impacts: [
        "Opening cost held until manager is back at office",
        "Team slot in use until return",
        `Return travel ~${
          timerDelayMs(state, travelMs) <= 0
            ? "Instant"
            : formatJobDurationSec(travelMs / 1000)
        }`,
      ],
    },
  ]);
}

export function completeBranchEstablishmentReturn(
  state: GameState,
  transit: BranchEstablishmentTransit,
  now: number,
): GameState {
  const cost = transit.openingCostSpent;
  let next = refundBranchEstablishment(state, transit, "return complete");
  next = {
    ...next,
    worldPersistRevision: (next.worldPersistRevision ?? 0) + 1,
  };
  return appendActivityLogs(next, [
    {
      category: "research",
      summary: "Branch Manager returned — opening cancelled",
      gained: cloneResourceCost(cost),
      impacts: [
        "Opening cost refunded",
        "Branch Manager back at roster",
        "Team slot freed",
      ],
    },
  ], now);
}

export function cancelBranchEstablishment(
  state: GameState,
  transitId: string,
): GameState {
  const ownerId = activePlayerId(state);
  const transit = state.branchEstablishmentTransits.find(
    (t) => t.id === transitId && t.ownerPlayerId === ownerId,
  );
  if (!transit) return state;
  if (branchEstablishmentPhase(transit) === "returning") return state;
  return beginBranchEstablishmentReturn(state, transit, Date.now());
}

/** Secretary / map — branch manager en route to open a pad. */
export function branchEstablishmentStatusLabel(
  state: GameState,
  transit: BranchEstablishmentTransit,
  now: number,
): string {
  if (branchEstablishmentPhase(transit) === "returning") {
    return `Returning · home ${formatTimerRemaining(state, transit.arrivesAt, now)}`;
  }
  return `En route · arrives ${formatTimerRemaining(state, transit.arrivesAt, now)}`;
}

export function branchEstablishmentTravelProgress(
  transit: BranchEstablishmentTransit,
  now: number,
): number {
  const start = transit.departedAt;
  const end = transit.arrivesAt;
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export { branchOfficeIdForOpenPad };

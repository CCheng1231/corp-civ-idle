import type {
  AxialCoord,
  BranchEstablishmentPhase,
  BranchEstablishmentTransit,
  GameState,
  OfficeLocationId,
  ResourceCost,
} from "./types";
import { activePlayerId } from "../multiplayer/playerHq";
import { axialKey, parseAxialKey } from "./openOffice";
import { branchOfficeIdForOpenPad } from "./branchOfficeIds";
import { establishedBranchAtPad } from "./branchSites";
import { canOpenAnotherBranch } from "./branchCap";
import { canEngageMoreJobs } from "./jobCatalog";
import { formatJobDurationSec } from "./jobBoard";
import {
  branchManagementResearched,
  commercialSiteAt,
} from "./mapWorld";
import {
  jobTravelDurationMsToCoord,
  jobTravelHexesToCoord,
} from "./mapTravel";
import { applyOfficeCost, applyOfficeRefund, canAffordAtOffice, unitAvailableAt } from "./constants";
import { formatTimerRemaining, scheduleTimerAt } from "./timers";
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
): boolean {
  if (branchEstablishmentInTransitToPad(state, hexKey, padIndex)) {
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

export function canSendBranchEstablishment(
  state: GameState,
  fromOfficeId: OfficeLocationId,
  coord: AxialCoord,
  padIndex: number,
  openingCost: ResourceCost,
): boolean {
  if (!branchManagementResearched(state)) return false;
  if (!canEngageMoreJobs(state)) return false;
  if (!canOpenAnotherBranch(state)) return false;
  const hexKey = axialKey(coord);
  if (!padIsAvailableForEstablish(state, hexKey, padIndex)) return false;
  if (unitAvailableAt(state, fromOfficeId, "branch_manager") < 1) return false;
  if (!canAffordAtOffice(state, fromOfficeId, openingCost)) return false;
  return true;
}

export function branchEstablishmentTravelSummary(
  state: GameState,
  fromOfficeId: OfficeLocationId,
  coord: AxialCoord,
): { durationLabel: string; hexes: number } {
  const hexes = jobTravelHexesToCoord(state, fromOfficeId, coord);
  const durationMs = jobTravelDurationMsToCoord(state, fromOfficeId, coord);
  return {
    hexes,
    durationLabel: formatJobDurationSec(durationMs / 1000),
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
        "Uses 1 task force slot until the manager arrives or returns",
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
  const durationMs = jobTravelDurationMsToCoord(
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
    arrivesAt: input.now + durationMs,
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
        "Task force slot in use until return",
        `Return travel ~${formatJobDurationSec(travelMs / 1000)}`,
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
        "Task force slot freed",
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

import { activePlayerId } from "../multiplayer/playerHq";
import { appendBranchOffice, withDerivedStats } from "./engineQueues";
import { defaultPlayerBranchName } from "./branchNaming";
import { canOpenAnotherBranch } from "./branchCap";
import {
  padIsAvailableForEstablish,
  refundBranchEstablishment,
  completeBranchEstablishmentReturn,
} from "./branchEstablishment";
import { openOfficeHexAt, parseAxialKey, tierLabel } from "./openOffice";
import { branchOfficeIdForSite } from "./branchSites";
import {
  branchSlotAt,
  commercialLotById,
  commercialSiteAt,
} from "./mapWorld";
import type { BranchEstablishmentTransit, EstablishedBranchSite, GameState } from "./types";
import { appendActivityLogs } from "./logbook";

export function processBranchEstablishmentTransits(
  state: GameState,
  now: number,
): GameState {
  if (!state.branchEstablishmentTransits.length) return state;
  let next = state;
  for (const transit of [...state.branchEstablishmentTransits]) {
    if (transit.arrivesAt > now) continue;
    if (transit.phase === "returning") {
      next = completeBranchEstablishmentReturn(next, transit, now);
    } else {
      next = resolveBranchEstablishmentArrival(next, transit, now);
    }
  }
  return next;
}

function resolveBranchEstablishmentArrival(
  state: GameState,
  transit: BranchEstablishmentTransit,
  now: number,
): GameState {
  if (transit.ownerPlayerId !== activePlayerId(state)) {
    return refundBranchEstablishment(state, transit, "wrong owner");
  }
  if (!padIsAvailableForEstablish(state, transit.hexKey, transit.padIndex)) {
    return refundBranchEstablishment(state, transit, "pad taken");
  }
  if (!canOpenAnotherBranch(state)) {
    return refundBranchEstablishment(state, transit, "cap");
  }

  const coord = parseAxialKey(transit.hexKey);
  if (!coord) {
    return refundBranchEstablishment(state, transit, "bad coord");
  }

  const commercial = commercialSiteAt(coord, state.settings);
  const seq = state.worldBranchNameSeq;
  let site: EstablishedBranchSite;
  let openImpacts: string[];

  if (commercial) {
    const slot = branchSlotAt(commercial.id, transit.padIndex);
    if (!slot) {
      return refundBranchEstablishment(state, transit, "bad pad");
    }
    site = {
      commercialLotId: commercial.id,
      slotIndex: transit.padIndex,
      padIndex: transit.padIndex,
      name:
        transit.plannedBranchName?.trim().slice(0, 48) ||
        defaultPlayerBranchName(transit.ownerPlayerId, seq),
      officeSpaceBase: slot.officeSpace,
      ownerPlayerId: transit.ownerPlayerId,
      establishedAt: now,
    };
    const lot = commercialLotById(commercial.id);
    openImpacts = [
      `${slot.label} pad · ${slot.officeSpace} office space (expands to ${slot.expansionCap})`,
      `Opened at ${lot.label}`,
      "Branch office now on the regional map",
    ];
  } else {
    const padDef = openOfficeHexAt(state.settings, coord)?.pads[transit.padIndex];
    site = {
      hexKey: transit.hexKey,
      padIndex: transit.padIndex,
      name:
        transit.plannedBranchName?.trim().slice(0, 48) ||
        defaultPlayerBranchName(transit.ownerPlayerId, seq),
      officeSpaceBase: padDef?.officeSpaceBase ?? 12,
      ownerPlayerId: transit.ownerPlayerId,
      establishedAt: now,
    };
    openImpacts = [
      padDef
        ? `${padDef.label ?? tierLabel(padDef.tier, transit.padIndex)} · ${site.officeSpaceBase} space`
        : `${site.officeSpaceBase} space`,
      "Branch office live on the map",
    ];
  }

  const officeId = branchOfficeIdForSite(site);
  let next = appendBranchOffice(state, site);
  next.branchEstablishmentTransits = next.branchEstablishmentTransits.filter(
    (t) => t.id !== transit.id,
  );
  next.worldBranchNameSeq = seq + 1;
  next.lastSelectedOffice = officeId;
  next.worldPersistRevision = (next.worldPersistRevision ?? 0) + 1;

  next = withDerivedStats(next);
  return appendActivityLogs(next, [
    {
      category: "research",
      summary: `Opened ${site.name}`,
      officeId,
      impacts: openImpacts,
    },
  ]);
}

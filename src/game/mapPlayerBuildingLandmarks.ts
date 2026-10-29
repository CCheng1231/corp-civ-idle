/**
 * Per-save building art on the map (HQ, branch pads) — overlay bakes, not canon geography.
 */
import type { OnlineSession } from "../multiplayer/types";
import {
  authoredPlayerHqSites,
  resolveOnlineSession,
} from "../multiplayer/playerHq";
import { axialKey } from "./hexLayout";
import {
  branchOfficeIdForSite,
  branchSiteCoord,
  isEstablishedBranchSiteOnMap,
} from "./branchSites";
import { branchSlotAtLot } from "./branchCommercial";
import { commercialLotById } from "./mapWorld";
import {
  landmarkArtInstanceSingleHex,
  type MapLandmarkArtInstance,
} from "./mapLandmarkInstances";
import type { BranchOfficeSlotSize, GameState } from "./types";

const BRANCH_PAD_ART: Record<BranchOfficeSlotSize, string> = {
  compact: "branch-pad-compact",
  standard: "branch-pad-standard",
  campus: "branch-pad-campus",
};

const PAD_RANK: Record<BranchOfficeSlotSize, number> = {
  compact: 0,
  standard: 1,
  campus: 2,
};

export function resolvePlayerBuildingLandmarkInstances(
  state: GameState,
  session?: OnlineSession | null,
): MapLandmarkArtInstance[] {
  const online = resolveOnlineSession(state, session);
  const myAccountId = online?.accountId ?? state.onlineSession?.accountId;
  const instances: MapLandmarkArtInstance[] = [];

  for (const site of authoredPlayerHqSites(state.settings)) {
    const isMine = myAccountId != null && site.id === myAccountId;
    instances.push(
      landmarkArtInstanceSingleHex({
        instanceKey: `player-hq-${site.id}`,
        siteId: site.id,
        artId: isMine ? "player-hq-mine" : "player-hq-peer",
        coord: site.coord,
        siteKind: "player-hq",
      }),
    );
  }

  const bestBranchAtCoord = new Map<
    string,
    { rank: number; instance: MapLandmarkArtInstance }
  >();

  for (const site of state.branchSites) {
    if (!isEstablishedBranchSiteOnMap(site)) continue;
    const lot = commercialLotById(site.commercialLotId);
    const slot = branchSlotAtLot(lot, site.slotIndex);
    if (!slot) continue;
    const coord = branchSiteCoord(site, state.settings);
    const key = axialKey(coord);
    const rank = PAD_RANK[slot.size as BranchOfficeSlotSize];
    const prev = bestBranchAtCoord.get(key);
    if (prev && prev.rank >= rank) continue;
    bestBranchAtCoord.set(key, {
      rank,
      instance: landmarkArtInstanceSingleHex({
        instanceKey: `branch-${site.commercialLotId}-${site.slotIndex}`,
        siteId: branchOfficeIdForSite(site),
        artId: BRANCH_PAD_ART[slot.size as BranchOfficeSlotSize],
        coord,
        siteKind: "branch-pad",
      }),
    });
  }

  instances.push(...[...bestBranchAtCoord.values()].map((v) => v.instance));
  return instances;
}

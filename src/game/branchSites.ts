import type {
  AxialCoord,
  CommercialLotId,
  EstablishedBranchSite,
  GameState,
  OfficeLocationId,
} from "./types";
import { MAP_BRANCH, MAP_HQ, axialEquals, axialDistance } from "./hexLayout";
import { commercialLotById } from "./commercialLots";
import { effectiveLandmarkCoord } from "./mapDevLayout";
import { parseAxialKey } from "./openOffice";
import {
  branchOfficeIdForCommercialPad,
  branchOfficeIdForOpenPad,
} from "./branchOfficeIds";

export type BranchOfficeId = `branch:${string}`;

export function isEstablishedBranchSiteOnMap(
  _site: EstablishedBranchSite,
): boolean {
  return true;
}

export function branchSitePadIndex(site: EstablishedBranchSite): number {
  return site.padIndex ?? site.slotIndex ?? 0;
}

export function branchSiteKey(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): string {
  return `${commercialLotId}:${slotIndex}`;
}

export function branchOfficeIdForPad(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): BranchOfficeId {
  return branchOfficeIdForCommercialPad(commercialLotId, slotIndex);
}

export function branchOfficeIdForSite(site: EstablishedBranchSite): BranchOfficeId {
  if (site.hexKey) {
    return branchOfficeIdForOpenPad(site.hexKey, branchSitePadIndex(site));
  }
  if (site.commercialLotId) {
    return branchOfficeIdForPad(site.commercialLotId, branchSitePadIndex(site));
  }
  throw new Error("Branch site missing hexKey and commercialLotId");
}

export function isBranchOfficeId(
  officeId: OfficeLocationId,
): officeId is BranchOfficeId {
  return officeId !== "hq" && officeId.startsWith("branch:");
}

export function parseBranchOfficeId(
  officeId: OfficeLocationId,
): {
  hexKey?: string;
  commercialLotId?: CommercialLotId;
  slotIndex: number;
} | null {
  if (!isBranchOfficeId(officeId)) return null;
  const key = officeId.slice("branch:".length);
  const sep = key.lastIndexOf(":");
  if (sep <= 0) return null;
  const idPart = key.slice(0, sep);
  const slotIndex = Number(key.slice(sep + 1));
  if (!Number.isFinite(slotIndex)) return null;
  if (parseAxialKey(idPart)) {
    return { hexKey: idPart, slotIndex };
  }
  return { commercialLotId: idPart as CommercialLotId, slotIndex };
}

export function branchSitesForLot(
  state: GameState,
  commercialLotId: CommercialLotId,
): EstablishedBranchSite[] {
  return state.branchSites.filter(
    (site) => site.commercialLotId === commercialLotId,
  );
}

export function establishedBranchAtPad(
  state: GameState,
  commercialLotId: CommercialLotId,
  slotIndex: number,
): EstablishedBranchSite | undefined {
  return state.branchSites.find(
    (site) =>
      site.commercialLotId === commercialLotId &&
      branchSitePadIndex(site) === slotIndex &&
      !site.closingStartedAt,
  );
}

export function establishedBranchAtOpenPad(
  state: GameState,
  hexKey: string,
  padIndex: number,
): EstablishedBranchSite | undefined {
  return state.branchSites.find(
    (site) =>
      site.hexKey === hexKey &&
      branchSitePadIndex(site) === padIndex &&
      !site.closingStartedAt,
  );
}

export function branchSiteForOfficeId(
  state: GameState,
  officeId: OfficeLocationId,
): EstablishedBranchSite | undefined {
  const parsed = parseBranchOfficeId(officeId);
  if (!parsed) return undefined;
  if (parsed.hexKey) {
    return establishedBranchAtOpenPad(state, parsed.hexKey, parsed.slotIndex);
  }
  if (parsed.commercialLotId) {
    return establishedBranchAtPad(
      state,
      parsed.commercialLotId,
      parsed.slotIndex,
    );
  }
  return undefined;
}

export function isBranchOwnedByActivePlayer(
  site: EstablishedBranchSite,
  state: GameState,
): boolean {
  const owner =
    state.onlineSession?.playMode === "online"
      ? state.onlineSession.accountId
      : "local";
  return (site.ownerPlayerId ?? owner) === owner;
}

export function branchOfficeIds(state: GameState): BranchOfficeId[] {
  return state.branchSites
    .filter((s) => !s.closingStartedAt && isBranchOwnedByActivePlayer(s, state))
    .map(branchOfficeIdForSite);
}

export function ownedOfficeIds(state: GameState): OfficeLocationId[] {
  return ["hq", ...branchOfficeIds(state)];
}

export function hasBranchOffices(state: GameState): boolean {
  return state.branchSites.some(
    (s) => !s.closingStartedAt && isBranchOwnedByActivePlayer(s, state),
  );
}

export function branchSiteCoord(
  site: EstablishedBranchSite,
  settings?: GameState["settings"],
): AxialCoord {
  if (site.hexKey) {
    const parsed = parseAxialKey(site.hexKey);
    if (parsed) return parsed;
  }
  if (site.commercialLotId) {
    const lot = commercialLotById(site.commercialLotId);
    return (
      effectiveLandmarkCoord(`commercial:${lot.id}`, settings) ?? {
        ...lot.coord,
      }
    );
  }
  return { q: 0, r: 0 };
}

export function branchSiteCoordForOffice(
  state: GameState,
  officeId: OfficeLocationId,
): AxialCoord | null {
  const site = branchSiteForOfficeId(state, officeId);
  return site ? branchSiteCoord(site, state.settings) : null;
}

export function defaultBranchSiteName(
  lotLabel: string,
  padLabel: string,
  branchIndex: number,
): string {
  return `Branch ${branchIndex} · ${padLabel} @ ${lotLabel}`;
}

export function officeCoordFor(
  officeId: OfficeLocationId,
  _branchCoord: AxialCoord | null,
  hqCoord: AxialCoord = MAP_HQ,
): AxialCoord {
  if (officeId === "hq") return hqCoord;
  return MAP_BRANCH;
}

export function officeAtCoord(
  coord: AxialCoord,
  branch: { branchSites: EstablishedBranchSite[] },
  hqCoord: AxialCoord = MAP_HQ,
): OfficeLocationId | null {
  if (axialEquals(coord, hqCoord)) return "hq";
  for (const site of branch.branchSites) {
    if (axialEquals(coord, branchSiteCoord(site))) {
      return branchOfficeIdForSite(site);
    }
  }
  return null;
}

export function officeSeparationHexes(
  from: OfficeLocationId,
  to: OfficeLocationId,
  branchCoord: AxialCoord | null,
  hqCoord: AxialCoord = MAP_HQ,
): number {
  if (from === to) return 0;
  return axialDistance(
    officeCoordFor(from, branchCoord, hqCoord),
    officeCoordFor(to, branchCoord, hqCoord),
  );
}

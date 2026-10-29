import type {
  AxialCoord,
  CommercialLotId,
  EstablishedBranchSite,
  GameState,
  OfficeLocationId,
} from "./types";
import { commercialLotById } from "./mapWorld";
import { effectiveLandmarkCoord } from "./mapDevLayout";

export type BranchOfficeId = `branch:${string}`;

export function isEstablishedBranchSiteOnMap(
  _site: EstablishedBranchSite,
): boolean {
  return true;
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
  return `branch:${branchSiteKey(commercialLotId, slotIndex)}`;
}

export function branchOfficeIdForSite(site: EstablishedBranchSite): BranchOfficeId {
  return branchOfficeIdForPad(site.commercialLotId, site.slotIndex);
}

export function isBranchOfficeId(
  officeId: OfficeLocationId,
): officeId is BranchOfficeId {
  return officeId !== "hq" && officeId.startsWith("branch:");
}

export function parseBranchOfficeId(
  officeId: OfficeLocationId,
): { commercialLotId: CommercialLotId; slotIndex: number } | null {
  if (!isBranchOfficeId(officeId)) return null;
  const key = officeId.slice("branch:".length);
  const sep = key.lastIndexOf(":");
  if (sep <= 0) return null;
  const commercialLotId = key.slice(0, sep) as CommercialLotId;
  const slotIndex = Number(key.slice(sep + 1));
  if (!Number.isFinite(slotIndex)) return null;
  return { commercialLotId, slotIndex };
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
      site.commercialLotId === commercialLotId && site.slotIndex === slotIndex,
  );
}

export function branchSiteForOfficeId(
  state: GameState,
  officeId: OfficeLocationId,
): EstablishedBranchSite | undefined {
  const parsed = parseBranchOfficeId(officeId);
  if (!parsed) return undefined;
  return establishedBranchAtPad(
    state,
    parsed.commercialLotId,
    parsed.slotIndex,
  );
}

export function branchOfficeIds(state: GameState): BranchOfficeId[] {
  return state.branchSites.map(branchOfficeIdForSite);
}

export function ownedOfficeIds(state: GameState): OfficeLocationId[] {
  return ["hq", ...branchOfficeIds(state)];
}

export function hasBranchOffices(state: GameState): boolean {
  return state.branchSites.length > 0;
}

export function branchSiteCoord(
  site: EstablishedBranchSite,
  settings?: GameState["settings"],
): AxialCoord {
  const lot = commercialLotById(site.commercialLotId);
  return (
    effectiveLandmarkCoord(`commercial:${lot.id}`, settings) ?? { ...lot.coord }
  );
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

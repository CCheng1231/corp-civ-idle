import {
  BRANCH_PAD_CATALOG,
  branchOpeningCostForPadOnLot,
  branchSlotAtLot,
} from "./branchCommercial";
import { commercialLotById } from "./commercialLots";

export {
  COMMERCIAL_BRANCH_SLOT_TEMPLATES,
  COMMERCIAL_REAL_ESTATE,
  commercialLotById,
} from "./commercialLots";
import {
  branchOfficeIdForSite,
  branchOfficeIds,
  branchSiteCoord,
  branchSiteCoordForOffice,
  branchSiteForOfficeId,
  establishedBranchAtPad,
  hasBranchOffices,
  isBranchOfficeId,
} from "./branchSites";
import { maxBranchOffices } from "./branchCap";
import {
  axialDistance,
  axialEquals,
  axialToPixel,
  generateHexagonMap,
  HEX_RADIUS,
  isCoordOnMapGrid,
  MAP_GOV,
  MAP_RADIUS,
} from "./hexLayout";
import type {
  AxialCoord,
  CommercialLotBranchSlot,
  CommercialLotId,
  GameSettings,
  GameState,
  JobDefinition,
  JobPosting,
  MajorHubId,
  MapRegion,
  OfficeLocationId,
  OfficeTowerDefinition,
  ProjectDefinition,
  ResourceCost,
  TowerId,
} from "./types";
import { devRegionAtCoord } from "./mapDevLayout";
import { majorHubById } from "./worldMapMajorHubs";
import { commercialSiteAt as lookupCommercialSiteAt } from "./commercialSiteLookup";
import {
  branchEstablishBlockersForPad,
  canSendBranchEstablishment,
} from "./branchEstablishment";

export { branchEstablishBlockersForPad };
import { hqCoordForState, officeAtForState } from "../multiplayer/playerHq";
import type { OnlineSession } from "../multiplayer/types";

export const REGION_LABELS: Record<MapRegion, string> = {
  metropolis: "Core",
  suburban: "Metro fringe",
  rural: "County",
  countryside: "Greenbelt",
};

/**
 * Regional site bonus on structure passive rates at that office.
 * Rank (worst→best): countryside → rural → suburban → metropolis.
 */
export const REGION_SITE_RATE_BONUS: Record<MapRegion, number> = {
  countryside: 0,
  rural: 0.07,
  suburban: 0.1,
  metropolis: 0.12,
};

/**
 * Fixed world seed for region jitter (testing baseline).
 * Multiplayer world setup will supply a shared seed later so all clients match.
 */
export const MAP_REGION_SEED = 104729;

export const MAP_HQ_COORD: AxialCoord = { q: -6, r: 5 };

/** Stable 0–1 hash for axial coords + seed. */
function regionHash01(q: number, r: number, seed: number): number {
  const x = Math.sin(q * 127.1 + r * 311.7 + seed * 0.013) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Deterministic ±1 wobble near band edges so regions are not perfect rings.
 * Interior tiles keep base distance; ~edge tiles may shift by -1 / 0 / +1.
 */
function regionDistanceJitter(coord: AxialCoord, distance: number): number {
  const nearEdge =
    Math.abs(distance - 2) <= 1 ||
    Math.abs(distance - 4) <= 1 ||
    Math.abs(distance - 6) <= 1;
  if (!nearEdge) return 0;
  const bucket = Math.floor(regionHash01(coord.q, coord.r, MAP_REGION_SEED) * 3);
  if (bucket === 0) return -1;
  if (bucket === 2) return 1;
  return 0;
}

import { OFFICE_TOWERS, officeTowerCoord, towerById } from "./officeTowers";

export { OFFICE_TOWERS, officeTowerCoord, towerById } from "./officeTowers";

export {
  jobSiteCoordForDefinition,
  jobSiteCoordForPosting,
  jobSiteRegionForDefinition,
  jobSiteRegionForPosting,
} from "./jobMapCoords";

/** Compact labels for map hexes (full names in project panel). */
export const TOWER_HEX_LABELS: Record<TowerId, string> = {
  metro_central: "Central Ex.",
  suburban_park: "Parkview",
  rural_crossing: "Crossroads",
  country_estate: "Hillside",
};

/** CSS 3D sketch per office tower (hq-tower-solarpunk-demos.html). */
export type OfficeTowerVisualStyle =
  | "metro"
  | "suburban"
  | "rural"
  | "countryside";

export const OFFICE_TOWER_VISUAL_STYLE: Record<TowerId, OfficeTowerVisualStyle> =
  {
    metro_central: "metro",
    suburban_park: "suburban",
    rural_crossing: "rural",
    country_estate: "countryside",
  };

export function officeTowerVisualStyle(towerId: TowerId): OfficeTowerVisualStyle {
  return OFFICE_TOWER_VISUAL_STYLE[towerId];
}

/** @deprecated use branchOpeningCostForPad */
export const BRANCH_OPENING_COST: ResourceCost = {
  ...BRANCH_PAD_CATALOG.standard.openingCost,
};

export function branchSlotAt(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): CommercialLotBranchSlot | undefined {
  return branchSlotAtLot(commercialLotById(commercialLotId), slotIndex);
}

export function branchOpeningCostForPad(
  commercialLotId: CommercialLotId,
  slotIndex: number,
): ResourceCost {
  return branchOpeningCostForPadOnLot(
    commercialLotById(commercialLotId),
    slotIndex,
  );
}

export const TOWER_PROJECTS: ProjectDefinition[] = [
  {
    id: "metro_lobby_refit",
    towerId: "metro_central",
    name: "Lobby modernization",
    client: "Apex Holdings",
    durationSec: 60,
    minBid: { cash: 80, electricity: 20 },
    totalPayout: { cash: 320, reputation: 5, connection: 4 },
    reputationGain: 5,
    intelRequired: 0,
    crewDemand: 0.75,
    tags: ["service"],
  },
  {
    id: "metro_datacenter",
    towerId: "metro_central",
    name: "In-building data suite",
    client: "CloudNine LLC",
    durationSec: 120,
    minBid: { cash: 200, electricity: 45, connection: 5 },
    totalPayout: { cash: 580, connection: 18, reputation: 8 },
    reputationGain: 8,
    intelRequired: 2,
    crewDemand: 1,
    tags: ["highRisk"],
  },
  {
    id: "suburban_retail",
    towerId: "suburban_park",
    name: "Anchor tenant build-out",
    client: "FreshMart Regional",
    durationSec: 75,
    minBid: { cash: 55, electricity: 18 },
    totalPayout: { cash: 210, reputation: 4 },
    reputationGain: 4,
    intelRequired: 0,
    crewDemand: 0.6,
    tags: ["service"],
  },
  {
    id: "suburban_office",
    towerId: "suburban_park",
    name: "Flex office expansion",
    client: "Parkview Partners",
    durationSec: 90,
    minBid: { cash: 90, electricity: 25, reputation: 2 },
    totalPayout: { cash: 340, reputation: 6, govReputation: 1 },
    reputationGain: 6,
    intelRequired: 1,
    crewDemand: 0.85,
    tags: ["official"],
  },
  {
    id: "rural_warehouse",
    towerId: "rural_crossing",
    name: "Warehouse shell",
    client: "AgriLogix",
    durationSec: 50,
    minBid: { cash: 35, electricity: 12 },
    totalPayout: { cash: 140, reputation: 3 },
    reputationGain: 3,
    intelRequired: 0,
    crewDemand: 0.5,
    tags: ["highRisk"],
  },
  {
    id: "rural_clinic",
    towerId: "rural_crossing",
    name: "Clinic fit-out",
    client: "County Health Co-op",
    durationSec: 70,
    minBid: { cash: 50, electricity: 15, reputation: 1 },
    totalPayout: { cash: 195, govReputation: 2, reputation: 4 },
    reputationGain: 4,
    intelRequired: 1,
    crewDemand: 0.7,
    tags: ["service", "official"],
  },
  {
    id: "country_inn",
    towerId: "country_estate",
    name: "Conference wing",
    client: "Hillside Resorts",
    durationSec: 65,
    minBid: { cash: 45, electricity: 14 },
    totalPayout: { cash: 175, reputation: 5 },
    reputationGain: 5,
    intelRequired: 0,
    crewDemand: 0.55,
    tags: ["service"],
  },
  {
    id: "country_solar",
    towerId: "country_estate",
    name: "Rooftop solar install",
    client: "GreenPastures Energy",
    durationSec: 100,
    minBid: { cash: 110, electricity: 30, reputation: 3 },
    totalPayout: { cash: 390, reputation: 7, govReputation: 2 },
    reputationGain: 7,
    intelRequired: 1,
    crewDemand: 0.9,
    tags: ["official", "highRisk"],
  },
];

export function projectById(id: string): ProjectDefinition {
  const p = TOWER_PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown project ${id}`);
  return p;
}

export function projectsForTower(towerId: TowerId): ProjectDefinition[] {
  return TOWER_PROJECTS.filter((p) => p.towerId === towerId);
}

export function officeTowerMapSites(
  settings?: GameSettings,
): Array<{ id: TowerId; coord: AxialCoord }> {
  return OFFICE_TOWERS.map((tower) => ({
    id: tower.id,
    coord: officeTowerCoord(tower.id, settings),
  }));
}

export function towerAtCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): TowerId | null {
  for (const tower of OFFICE_TOWERS) {
    const c = officeTowerCoord(tower.id, settings);
    if (c.q === coord.q && c.r === coord.r) return tower.id;
  }
  return null;
}

export function commercialLotAtCoord(coord: AxialCoord): CommercialLotId | null {
  const site = commercialSiteAt(coord);
  return site?.id ?? null;
}

const PROCEDURAL_JOB_SITE_LABELS: Record<string, string> = {
  "city_hall:gov": "City Hall",
  "police:world": "Police Station",
  "hospital:world": "Hospital",
};

export function jobSiteLabelForDefinition(def: JobDefinition): string {
  if (def.locationId) {
    if (PROCEDURAL_JOB_SITE_LABELS[def.locationId]) {
      return PROCEDURAL_JOB_SITE_LABELS[def.locationId]!;
    }
    if (def.locationId.startsWith("tower:")) {
      return towerById(def.locationId.slice("tower:".length) as TowerId).name;
    }
    if (def.locationId.startsWith("hub:")) {
      const hubId = def.locationId.slice("hub:".length) as MajorHubId;
      return majorHubById(hubId)?.label ?? hubId;
    }
  }
  if (def.commercialLotId) {
    return commercialLotById(def.commercialLotId).label;
  }
  if (def.majorHubId) {
    return majorHubById(def.majorHubId)?.label ?? def.majorHubId;
  }
  if (def.towerId) {
    return towerById(def.towerId).name;
  }
  return "Unknown site";
}

export function jobSiteLabelForPosting(
  posting: Pick<
    JobPosting,
    "towerId" | "majorHubId" | "commercialLotId"
  >,
  def: JobDefinition,
  settings?: GameSettings,
): string {
  if (posting.commercialLotId) {
    return commercialLotById(posting.commercialLotId).label;
  }
  const hubId = (posting.majorHubId ?? def.majorHubId) as MajorHubId | null;
  if (hubId) {
    return majorHubById(hubId, settings)?.label ?? hubId;
  }
  if (posting.towerId) {
    return towerById(posting.towerId).name;
  }
  return jobSiteLabelForDefinition(def);
}

export function commercialSiteAt(coord: AxialCoord, settings?: GameSettings) {
  return lookupCommercialSiteAt(coord, settings);
}

/** Commercial lot not yet leased as an office site. */
export function isAvailableCommercialLot(
  coord: AxialCoord,
  state: GameState,
): boolean {
  return Boolean(commercialSiteAt(coord, state.settings));
}

export function regionAtCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): MapRegion {
  const painted = devRegionAtCoord(coord, settings);
  if (painted) return painted;

  const d = axialDistance(coord, MAP_GOV);
  const effective = Math.max(
    0,
    Math.min(MAP_RADIUS, d + regionDistanceJitter(coord, d)),
  );
  if (effective <= 4) return "metropolis";
  if (effective <= 8) return "suburban";
  if (effective <= 12) return "rural";
  return "countryside";
}

/** World map render size — same as logic `HEX_RADIUS` for a uniform tessellated grid. */
export const MAP_PRESENTATION_HEX_SCALE = 1;

export function worldMapPresentationHexSize(): number {
  return HEX_RADIUS * MAP_PRESENTATION_HEX_SCALE;
}

/** @deprecated Art-era radial stretch; kept at 1 for uniform hex layout. */
export const WORLD_MAP_REGION_LAYOUT_SCALE: Record<MapRegion, number> = {
  metropolis: 1,
  suburban: 1,
  rural: 1,
  countryside: 1,
};

export function worldMapLayoutScale(_coord: AxialCoord): number {
  return 1;
}

export function worldMapHexTileRadius(_coord: AxialCoord): number {
  return worldMapPresentationHexSize();
}

export function worldMapAxialToPixel(
  coord: AxialCoord,
  size: number = worldMapPresentationHexSize(),
): { x: number; y: number } {
  return axialToPixel(coord.q, coord.r, size);
}

/**
 * Painted forest greenbelt sits on this hex ring (Z1 v5 bake); playable hexes may extend past it.
 */
export const MAP_GREENBELT_HEX_RADIUS = 14;

/** Extra viewBox margin beyond outermost hexes (Z1 bake bleed). */
export const MAP_VIEWBOX_PAD = HEX_RADIUS * 4;

/** Canon major-hub pins sit this far past the forest greenbelt radius (viewBox px). */
export const Z1_MAJOR_HUB_OUTSIDE_BELT_PX = 340;

/** Greenbelt stroke radius — outer edge of the playable hex ring (presentation pixels). */
export function worldMapOuterGreenbeltRadiusPx(
  beltRingRadius: number = MAP_GREENBELT_HEX_RADIUS,
  size: number = worldMapPresentationHexSize(),
): number {
  const gov = worldMapAxialToPixel(MAP_GOV, size);
  let maxDist = 0;
  for (const c of generateHexagonMap(MAP_RADIUS)) {
    if (axialDistance(c, MAP_GOV) !== beltRingRadius) continue;
    const p = worldMapAxialToPixel(c, size);
    maxDist = Math.max(maxDist, Math.hypot(p.x - gov.x, p.y - gov.y));
  }
  return maxDist - size * 0.22;
}

/** @param pad Extra viewBox margin beyond outer hexes (dev/scripts only; player uses 0). */
export function worldMapHexBounds(
  cells: AxialCoord[],
  size: number = worldMapPresentationHexSize(),
  pad: number = 0,
) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of cells) {
    const { x, y } = worldMapAxialToPixel(coord, size);
    const r = worldMapHexTileRadius(coord);
    minX = Math.min(minX, x - r);
    minY = Math.min(minY, y - r);
    maxX = Math.max(maxX, x + r);
    maxY = Math.max(maxY, y + r);
  }

  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

export function worldMapHexPathPixels(
  path: AxialCoord[],
  size: number = worldMapPresentationHexSize(),
): { x: number; y: number }[] {
  return path.map((coord) => worldMapAxialToPixel(coord, size));
}

export function siteRateBonusForRegion(region: MapRegion): number {
  return REGION_SITE_RATE_BONUS[region];
}

export function siteRateBonusForCoord(coord: AxialCoord): number {
  const region = commercialSiteAt(coord)?.region ?? regionAtCoord(coord);
  return siteRateBonusForRegion(region);
}

export function siteRateBonusesForState(
  state: GameState,
): Partial<Record<OfficeLocationId, number>> {
  const hqRegion = regionAtCoord(hqCoordForState(state), state.settings);
  const bonuses: Partial<Record<OfficeLocationId, number>> = {
    hq: siteRateBonusForRegion(hqRegion),
  };
  for (const site of state.branchSites) {
    const officeId = branchOfficeIdForSite(site);
    const region = site.commercialLotId
      ? commercialLotById(site.commercialLotId).region
      : regionAtCoord(branchSiteCoord(site, state.settings), state.settings);
    bonuses[officeId] = siteRateBonusForRegion(region);
  }
  return bonuses;
}

export function formatSiteRateBonusPercent(bonus: number): string {
  return `${Math.round(bonus * 100)}%`;
}

export function optimalCrewForProject(
  tower: OfficeTowerDefinition,
  project: ProjectDefinition,
): number {
  return Math.max(1, Math.ceil(tower.companyCrewCapacity * project.crewDemand));
}

export function crewPayoutMultiplier(
  farmingAssigned: number,
  optimalCrew: number,
): number {
  return Math.min(1, farmingAssigned / optimalCrew);
}

export { ownedOfficeIds } from "./branchSites";

/** Offices listed in Overview dropdown. */
export interface OverviewOfficeOption {
  id: OfficeLocationId;
  label: string;
  available: boolean;
  hint?: string;
}

export function overviewOfficeOptions(state: GameState): OverviewOfficeOption[] {
  const options: OverviewOfficeOption[] = [
    { id: "hq", label: "HQ", available: true },
  ];
  for (const site of state.branchSites) {
    options.push({
      id: branchOfficeIdForSite(site),
      label: site.name,
      available: true,
    });
  }
  return options;
}

export function officeDisplayName(
  state: GameState,
  officeId: OfficeLocationId,
): string {
  if (officeId === "hq") return "HQ";
  const site = branchSiteForOfficeId(state, officeId);
  return site?.name ?? "Branch Office";
}

export function defaultBranchName(coord: AxialCoord, branchIndex = 1): string {
  const region = commercialSiteAt(coord)?.region ?? regionAtCoord(coord);
  return `Branch ${branchIndex} @ ${REGION_LABELS[region]}`;
}

export { branchSiteCoord, branchSiteCoordForOffice } from "./branchSites";

export function defaultBranchSiteName(
  commercialLotId: CommercialLotId,
  slotIndex: number,
  branchIndex: number,
): string {
  const lot = commercialLotById(commercialLotId);
  const slot = lot.branchSlots[slotIndex];
  const padLabel = slot?.label ?? `Pad ${slotIndex + 1}`;
  return `Branch ${branchIndex} · ${padLabel} @ ${lot.label}`;
}

export function branchManagementResearched(state: GameState): boolean {
  return state.researchLevels.branch_management >= 1;
}

/** Max branch offices this company may own (excludes HQ). */
export function maxBranchSlots(state: GameState): number {
  return Math.max(0, maxBranchOffices(state));
}

export function branchManagerAvailable(state: GameState): number {
  return state.contractorsByLocation.hq?.branch_manager ?? 0;
}

export function canEstablishBranchPad(
  state: GameState,
  commercialLotId: CommercialLotId,
  slotIndex: number,
  coord: AxialCoord,
): boolean {
  if (establishedBranchAtPad(state, commercialLotId, slotIndex)) return false;
  return canSendBranchEstablishment(
    state,
    "hq",
    coord,
    slotIndex,
    branchOpeningCostForPad(commercialLotId, slotIndex),
  );
}

/** @deprecated use canEstablishBranchPad */
export function canEstablishBranch(
  state: GameState,
  coord: AxialCoord | null | undefined,
  slotIndex = 0,
): boolean {
  const site = coord ? commercialSiteAt(coord, state.settings) : undefined;
  if (!site || !coord) return false;
  return canEstablishBranchPad(state, site.id, slotIndex, coord);
}

/** @deprecated use branchEstablishBlockersForPad */
export function branchEstablishBlockers(
  state: GameState,
  coord: AxialCoord | null | undefined,
  slotIndex = 0,
): string[] {
  const site = coord ? commercialSiteAt(coord, state.settings) : undefined;
  if (!site || !coord) {
    return ["Select a yellow commercial lot on the map"];
  }
  return branchEstablishBlockersForPad(state, site.id, slotIndex, coord);
}

export function commercialHexEquals(
  a: AxialCoord | null | undefined,
  b: AxialCoord,
): boolean {
  return Boolean(a && axialEquals(a, b));
}

export function hexDistanceFromHq(coord: AxialCoord): number {
  return axialDistance(MAP_HQ_COORD, coord);
}

export function hexDistanceFromHqForState(
  state: GameState,
  coord: AxialCoord,
): number {
  return axialDistance(hqCoordForState(state), coord);
}

/** Resolved office for map distance rings and Home focus. */
export function mapReferenceOfficeId(state: GameState): OfficeLocationId {
  const raw = state.settings.mapReferenceOfficeId;
  if (raw === "hq") return "hq";
  if (raw && isBranchOfficeId(raw) && branchSiteForOfficeId(state, raw)) {
    return raw;
  }
  if (state.settings.mapMainOffice === "branch" && hasBranchOffices(state)) {
    if (
      isBranchOfficeId(state.lastSelectedOffice) &&
      branchSiteForOfficeId(state, state.lastSelectedOffice)
    ) {
      return state.lastSelectedOffice;
    }
    return branchOfficeIds(state)[0] ?? "hq";
  }
  return "hq";
}

/** @deprecated use mapReferenceOfficeId */
export function mapMainOfficeId(state: GameState): "hq" | "branch" {
  return mapReferenceOfficeId(state) === "hq" ? "hq" : "branch";
}

export function mapMainOfficeCoord(
  state: GameState,
  session?: OnlineSession | null,
): AxialCoord {
  return officeMapCoord(state, mapReferenceOfficeId(state), session);
}

export function officeMapCoord(
  state: GameState,
  officeId: OfficeLocationId,
  session?: OnlineSession | null,
): AxialCoord {
  if (officeId === "hq") {
    return hqCoordForState(state, session);
  }
  const coord = branchSiteCoordForOffice(state, officeId);
  if (coord && isCoordOnMapGrid(coord)) {
    return coord;
  }
  return hqCoordForState(state, session);
}

/** Center map Home on a specific owned office hex when rendered. */
export function officeMapCoordForFocus(
  cells: AxialCoord[],
  state: GameState,
  officeId: OfficeLocationId,
  session?: OnlineSession | null,
): AxialCoord {
  for (const coord of cells) {
    if (officeAtForState(coord, state, session) === officeId) {
      return coord;
    }
  }
  const canonical = officeMapCoord(state, officeId, session);
  if (isCoordOnMapGrid(canonical)) {
    return canonical;
  }
  return hqCoordForState(state, session);
}

/** Focus the HQ hex actually rendered on the map (matches landmark + Home button when HQ selected). */
export function hqMapCoordForFocus(
  cells: AxialCoord[],
  state: GameState,
  session?: OnlineSession | null,
): AxialCoord {
  return officeMapCoordForFocus(cells, state, "hq", session);
}

export function mainOfficeCoordForState(
  state: GameState,
  session?: OnlineSession | null,
): AxialCoord {
  return mapMainOfficeCoord(state, session);
}

export function hexDistanceFromMainOfficeForState(
  state: GameState,
  coord: AxialCoord,
  session?: OnlineSession | null,
): number {
  return axialDistance(mainOfficeCoordForState(state, session), coord);
}

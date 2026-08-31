import {
  BRANCH_PAD_CATALOG,
  branchOpeningCostForPadOnLot,
  branchPadFromCatalog,
  branchSlotAtLot,
  normalizeCommercialLotBranchSlots,
} from "./branchCommercial";
import {
  branchOfficeIdForSite,
  branchOfficeIds,
  branchSiteForOfficeId,
  establishedBranchAtPad,
  hasBranchOffices,
  isBranchOfficeId,
} from "./branchSites";
import {
  axialDistance,
  axialEquals,
  axialToPixel,
  HEX_RADIUS,
  MAP_GOV,
  MAP_HQ,
  MAP_RADIUS,
} from "./hexLayout";
import type {
  AxialCoord,
  CommercialLotBranchSlot,
  CommercialLotDefinition,
  CommercialLotId,
  EstablishedBranchSite,
  GameState,
  JobDefinition,
  JobPosting,
  MapRegion,
  OfficeLocationId,
  OfficeTowerDefinition,
  ProjectDefinition,
  ResourceCost,
  TowerId,
} from "./types";
import {
  canAffordAtOffice,
  formatNumber,
  OFFICE_LABELS,
  powerAvailable,
  RESOURCE_LABELS,
  splitResourceCost,
  unitAvailableAt,
} from "./constants";
import { CHRIS_HQ, hqCoordForState } from "../multiplayer/playerHq";

export const REGION_LABELS: Record<MapRegion, string> = {
  metropolis: "Metropolis",
  suburban: "Suburban",
  rural: "Rural",
  countryside: "Countryside",
};

/**
 * Regional site bonus on structure passive rates at that office.
 * Rank (worst→best): countryside → rural → suburban → metropolis.
 * HQ starts countryside at 0% so branches inland are worth opening.
 */
export const REGION_SITE_RATE_BONUS: Record<MapRegion, number> = {
  countryside: 0,
  rural: 0.07,
  suburban: 0.1,
  metropolis: 0.12,
};

/** HQ / future company-start region (pinned; not jittered off countryside). */
export const HQ_REGION: MapRegion = "countryside";

/**
 * Fixed world seed for region jitter (testing baseline).
 * Multiplayer world setup will supply a shared seed later so all clients match.
 */
export const MAP_REGION_SEED = 104729;

export const MAP_HQ_COORD = MAP_HQ;

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

export const OFFICE_TOWERS: OfficeTowerDefinition[] = [
  {
    id: "metro_central",
    name: "Central Exchange Tower",
    coord: { q: -1, r: 1 },
    region: "metropolis",
    companyCrewCapacity: 8,
  },
  {
    id: "suburban_park",
    name: "Parkview Office Tower",
    coord: { q: 4, r: -5 },
    region: "suburban",
    companyCrewCapacity: 5,
  },
  {
    id: "rural_crossing",
    name: "Crossroads Business Tower",
    coord: { q: -6, r: 2 },
    region: "rural",
    companyCrewCapacity: 3,
  },
  {
    id: "country_estate",
    name: "Hillside Corporate Tower",
    coord: { q: 3, r: 4 },
    region: "countryside",
    companyCrewCapacity: 4,
  },
];

/** Compact labels for map hexes (full names in project panel). */
export const TOWER_HEX_LABELS: Record<TowerId, string> = {
  metro_central: "Central Ex.",
  suburban_park: "Parkview",
  rural_crossing: "Crossroads",
  country_estate: "Hillside",
};

export const COMMERCIAL_BRANCH_SLOT_TEMPLATES: CommercialLotBranchSlot[] = [
  branchPadFromCatalog("compact"),
  branchPadFromCatalog("standard"),
  branchPadFromCatalog("campus"),
];

export const COMMERCIAL_REAL_ESTATE: CommercialLotDefinition[] = [
  {
    id: "suburban_strip",
    coord: { q: 6, r: -3 },
    region: "suburban",
    label: "Suburban strip parcel",
    branchSlots: normalizeCommercialLotBranchSlots(COMMERCIAL_BRANCH_SLOT_TEMPLATES),
  },
  {
    id: "rural_highway",
    coord: { q: -5, r: 4 },
    region: "rural",
    label: "Rural highway frontage",
    branchSlots: normalizeCommercialLotBranchSlots(COMMERCIAL_BRANCH_SLOT_TEMPLATES),
  },
  {
    id: "countryside_lot",
    coord: { q: -2, r: 6 },
    region: "countryside",
    label: "Countryside lot",
    branchSlots: normalizeCommercialLotBranchSlots(COMMERCIAL_BRANCH_SLOT_TEMPLATES),
  },
];

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

export function towerById(id: TowerId): OfficeTowerDefinition {
  const t = OFFICE_TOWERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tower ${id}`);
  return t;
}

export function projectById(id: string): ProjectDefinition {
  const p = TOWER_PROJECTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown project ${id}`);
  return p;
}

export function projectsForTower(towerId: TowerId): ProjectDefinition[] {
  return TOWER_PROJECTS.filter((p) => p.towerId === towerId);
}

export function towerAtCoord(coord: AxialCoord): TowerId | null {
  for (const tower of OFFICE_TOWERS) {
    if (tower.coord.q === coord.q && tower.coord.r === coord.r) return tower.id;
  }
  return null;
}

export function commercialLotById(id: CommercialLotId): CommercialLotDefinition {
  const lot = COMMERCIAL_REAL_ESTATE.find((entry) => entry.id === id);
  if (!lot) throw new Error(`Unknown commercial lot ${id}`);
  return lot;
}

export function commercialLotAtCoord(coord: AxialCoord): CommercialLotId | null {
  const site = commercialSiteAt(coord);
  return site?.id ?? null;
}

export function jobSiteCoordForDefinition(def: JobDefinition): AxialCoord {
  if (def.commercialLotId) {
    return { ...commercialLotById(def.commercialLotId).coord };
  }
  if (def.towerId) {
    return { ...towerById(def.towerId).coord };
  }
  throw new Error(`Job ${def.id} has no map site`);
}

export function jobSiteLabelForDefinition(def: JobDefinition): string {
  if (def.commercialLotId) {
    return commercialLotById(def.commercialLotId).label;
  }
  if (def.towerId) {
    return towerById(def.towerId).name;
  }
  return "Unknown site";
}

export function jobSiteCoordForPosting(
  posting: Pick<JobPosting, "towerId" | "commercialLotId">,
  def: JobDefinition,
): AxialCoord {
  if (posting.commercialLotId) {
    return { ...commercialLotById(posting.commercialLotId).coord };
  }
  if (posting.towerId) {
    return { ...towerById(posting.towerId).coord };
  }
  return jobSiteCoordForDefinition(def);
}

export function jobSiteRegionForDefinition(def: JobDefinition): MapRegion {
  if (def.commercialLotId) {
    return commercialLotById(def.commercialLotId).region;
  }
  if (def.towerId) {
    return towerById(def.towerId).region;
  }
  return "countryside";
}

export function jobSiteRegionForPosting(
  posting: Pick<JobPosting, "towerId" | "commercialLotId">,
  def: JobDefinition,
): MapRegion {
  if (posting.commercialLotId) {
    return commercialLotById(posting.commercialLotId).region;
  }
  if (posting.towerId) {
    return towerById(posting.towerId).region;
  }
  return jobSiteRegionForDefinition(def);
}

export function jobSiteLabelForPosting(
  posting: Pick<JobPosting, "towerId" | "commercialLotId">,
  def: JobDefinition,
): string {
  if (posting.commercialLotId) {
    return commercialLotById(posting.commercialLotId).label;
  }
  if (posting.towerId) {
    return towerById(posting.towerId).name;
  }
  return jobSiteLabelForDefinition(def);
}

export function commercialSiteAt(coord: AxialCoord) {
  return COMMERCIAL_REAL_ESTATE.find(
    (s) => s.coord.q === coord.q && s.coord.r === coord.r,
  );
}

/** Commercial lot not yet leased as an office site. */
export function isAvailableCommercialLot(
  coord: AxialCoord,
  _state: GameState,
): boolean {
  return Boolean(commercialSiteAt(coord));
}

export function regionAtCoord(coord: AxialCoord): MapRegion {
  // Company HQs are authored as countryside for starts / future creation.
  if (axialEquals(coord, MAP_HQ) || axialEquals(coord, CHRIS_HQ)) return HQ_REGION;

  const d = axialDistance(coord, MAP_GOV);
  const effective = Math.max(
    0,
    Math.min(MAP_RADIUS, d + regionDistanceJitter(coord, d)),
  );
  if (effective <= 2) return "metropolis";
  if (effective <= 4) return "suburban";
  if (effective <= 6) return "rural";
  return "countryside";
}

/** Radial stretch from Gov for world-map layout (hex logic stays unscaled). */
export const WORLD_MAP_REGION_LAYOUT_SCALE: Record<MapRegion, number> = {
  metropolis: 1.25,
  suburban: 1.5,
  rural: 2,
  countryside: 2,
};

export function worldMapLayoutScale(coord: AxialCoord): number {
  return WORLD_MAP_REGION_LAYOUT_SCALE[regionAtCoord(coord)];
}

export function worldMapAxialToPixel(
  coord: AxialCoord,
  size: number = HEX_RADIUS,
): { x: number; y: number } {
  const scale = worldMapLayoutScale(coord);
  const base = axialToPixel(coord.q, coord.r, size);
  const gov = axialToPixel(MAP_GOV.q, MAP_GOV.r, size);
  return {
    x: gov.x + (base.x - gov.x) * scale,
    y: gov.y + (base.y - gov.y) * scale,
  };
}

/** Extra viewBox margin (green undercoat) beyond outermost hexes. */
export const MAP_VIEWBOX_PAD = HEX_RADIUS * 0.95;

export function worldMapHexBounds(
  cells: AxialCoord[],
  size: number = HEX_RADIUS,
) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const coord of cells) {
    const { x, y } = worldMapAxialToPixel(coord, size);
    minX = Math.min(minX, x - size);
    minY = Math.min(minY, y - size);
    maxX = Math.max(maxX, x + size);
    maxY = Math.max(maxY, y + size);
  }

  const pad = MAP_VIEWBOX_PAD;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

export function worldMapHexPathPixels(
  path: AxialCoord[],
  size: number = HEX_RADIUS,
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
  const bonuses: Partial<Record<OfficeLocationId, number>> = {
    hq: siteRateBonusForRegion(HQ_REGION),
  };
  for (const site of state.branchSites) {
    const officeId = branchOfficeIdForSite(site);
    bonuses[officeId] = siteRateBonusForRegion(
      commercialLotById(site.commercialLotId).region,
    );
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
  if (officeId === "hq") return OFFICE_LABELS.hq;
  const site = branchSiteForOfficeId(state, officeId);
  return site?.name ?? "Branch Office";
}

export function defaultBranchName(coord: AxialCoord, branchIndex = 1): string {
  const region = commercialSiteAt(coord)?.region ?? regionAtCoord(coord);
  return `Branch ${branchIndex} @ ${REGION_LABELS[region]}`;
}

export function branchSiteCoord(site: EstablishedBranchSite): AxialCoord {
  return { ...commercialLotById(site.commercialLotId).coord };
}

export function branchSiteCoordForOffice(
  state: GameState,
  officeId: OfficeLocationId,
): AxialCoord | null {
  const site = branchSiteForOfficeId(state, officeId);
  return site ? branchSiteCoord(site) : null;
}

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

/** First branch from Branch Management; further slots from Massive Expansion. */
export function maxBranchSlots(state: GameState): number {
  if (!branchManagementResearched(state)) return 0;
  const extra = state.researchLevels.massive_expansion ?? 0;
  return 1 + extra;
}

export function branchManagerAvailable(state: GameState): number {
  return unitAvailableAt(state, "hq", "branch_manager");
}

export function canEstablishBranchPad(
  state: GameState,
  commercialLotId: CommercialLotId,
  slotIndex: number,
): boolean {
  if (establishedBranchAtPad(state, commercialLotId, slotIndex)) return false;
  if (!branchManagementResearched(state)) return false;
  if (state.branchSites.length >= maxBranchSlots(state)) return false;
  if (branchManagerAvailable(state) < 1) return false;
  return canAffordAtOffice(
    state,
    "hq",
    branchOpeningCostForPad(commercialLotId, slotIndex),
  );
}

/** @deprecated use canEstablishBranchPad */
export function canEstablishBranch(
  state: GameState,
  coord: AxialCoord | null | undefined,
  slotIndex = 0,
): boolean {
  const site = coord ? commercialSiteAt(coord) : undefined;
  if (!site) return false;
  return canEstablishBranchPad(state, site.id, slotIndex);
}

/** Human-readable reasons the player cannot open a branch pad yet. */
export function branchEstablishBlockersForPad(
  state: GameState,
  commercialLotId: CommercialLotId,
  slotIndex: number,
): string[] {
  if (establishedBranchAtPad(state, commercialLotId, slotIndex)) {
    return ["Pad already open"];
  }
  const blockers: string[] = [];
  if (!branchManagementResearched(state)) {
    blockers.push("Research Branch Management (Research tab)");
  }
  if (state.branchSites.length >= maxBranchSlots(state)) {
    blockers.push(
      `Branch office cap reached (${state.branchSites.length}/${maxBranchSlots(state)})`,
    );
  }
  if (branchManagerAvailable(state) < 1) {
    blockers.push("Hire a Branch Manager at HQ (consumed on establish)");
  }
  const openingCost = branchOpeningCostForPad(commercialLotId, slotIndex);
  if (
    canAffordAtOffice(state, "hq", openingCost) &&
    branchManagerAvailable(state) >= 1 &&
    branchManagementResearched(state) &&
    state.branchSites.length < maxBranchSlots(state)
  ) {
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

/** @deprecated use branchEstablishBlockersForPad */
export function branchEstablishBlockers(
  state: GameState,
  coord: AxialCoord | null | undefined,
  slotIndex = 0,
): string[] {
  const site = coord ? commercialSiteAt(coord) : undefined;
  if (!site) {
    return ["Select a yellow commercial lot on the map"];
  }
  return branchEstablishBlockersForPad(state, site.id, slotIndex);
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

/** Resolved main office for map distance and focus (falls back to HQ). */
export function mapMainOfficeId(state: GameState): "hq" | "branch" {
  if (state.settings.mapMainOffice === "branch" && hasBranchOffices(state)) {
    return "branch";
  }
  return "hq";
}

export function mapMainOfficeCoord(state: GameState): AxialCoord {
  if (mapMainOfficeId(state) === "hq") {
    return hqCoordForState(state);
  }
  const preferred = isBranchOfficeId(state.lastSelectedOffice)
    ? state.lastSelectedOffice
    : branchOfficeIds(state)[0];
  return (
    (preferred && branchSiteCoordForOffice(state, preferred)) ??
    hqCoordForState(state)
  );
}

export function mainOfficeCoordForState(state: GameState): AxialCoord {
  return mapMainOfficeCoord(state);
}

export function hexDistanceFromMainOfficeForState(
  state: GameState,
  coord: AxialCoord,
): number {
  return axialDistance(mainOfficeCoordForState(state), coord);
}

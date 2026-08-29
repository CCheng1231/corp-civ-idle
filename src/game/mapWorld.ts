import type { AxialCoord } from "./hexLayout";
import {
  axialDistance,
  axialEquals,
  MAP_GOV,
  MAP_HQ,
  MAP_RADIUS,
} from "./hexLayout";
import type {
  GameState,
  MapRegion,
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
import { CHRIS_HQ, hqCoordForState, officeAtForState } from "../multiplayer/playerHq";

export const REGION_LABELS: Record<MapRegion, string> = {
  metropolis: "Metropolis",
  suburban: "Suburban",
  rural: "Rural",
  countryside: "Countryside",
};

/**
 * Temporary regional site bonus on structure passive rates at that office.
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

export const COMMERCIAL_REAL_ESTATE: {
  coord: AxialCoord;
  region: MapRegion;
  label: string;
}[] = [
  { coord: { q: 6, r: -3 }, region: "suburban", label: "Suburban strip parcel" },
  { coord: { q: -5, r: 4 }, region: "rural", label: "Rural highway frontage" },
  { coord: { q: -2, r: 6 }, region: "countryside", label: "Countryside lot" },
];

export const BRANCH_OPENING_COST: ResourceCost = {
  cash: 650,
  connection: 15,
  reputation: 8,
  electricity: 25,
};

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

export function commercialSiteAt(coord: AxialCoord) {
  return COMMERCIAL_REAL_ESTATE.find(
    (s) => s.coord.q === coord.q && s.coord.r === coord.r,
  );
}

/** Commercial lot not yet leased as an office site. */
export function isAvailableCommercialLot(
  coord: AxialCoord,
  state: GameState,
): boolean {
  if (!commercialSiteAt(coord)) return false;
  return officeAtForState(coord, state) === null;
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

export function siteRateBonusForRegion(region: MapRegion): number {
  return REGION_SITE_RATE_BONUS[region];
}

export function siteRateBonusForCoord(coord: AxialCoord): number {
  const region = commercialSiteAt(coord)?.region ?? regionAtCoord(coord);
  return siteRateBonusForRegion(region);
}

export function siteRateBonusesForState(state: {
  branchEstablished: boolean;
  branchCoord: AxialCoord | null;
}): Record<"hq" | "branch", number> {
  return {
    hq: siteRateBonusForRegion(HQ_REGION),
    branch:
      state.branchEstablished && state.branchCoord
        ? siteRateBonusForCoord(state.branchCoord)
        : 0,
  };
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

export function ownedOfficeIds(state: GameState): ("hq" | "branch")[] {
  return state.branchEstablished ? ["hq", "branch"] : ["hq"];
}

/** Offices listed in Overview dropdown (includes locked sites for future expansion). */
export interface OverviewOfficeOption {
  id: "hq" | "branch";
  label: string;
  available: boolean;
  hint?: string;
}

export function overviewOfficeOptions(state: GameState): OverviewOfficeOption[] {
  return [
    { id: "hq", label: "HQ", available: true },
    {
      id: "branch",
      label: officeDisplayName(state, "branch"),
      available: state.branchEstablished,
      hint: state.branchEstablished
        ? undefined
        : "Research Branch Management, hire a Branch Manager, then establish on the map",
    },
  ];
}

export function officeDisplayName(
  state: GameState,
  officeId: "hq" | "branch",
): string {
  if (officeId === "branch" && state.branchEstablished && state.branchName) {
    return state.branchName;
  }
  return OFFICE_LABELS[officeId];
}

export function defaultBranchName(coord: AxialCoord, branchIndex = 1): string {
  const region = commercialSiteAt(coord)?.region ?? regionAtCoord(coord);
  return `Branch ${branchIndex} @ ${REGION_LABELS[region]}`;
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

export function canEstablishBranch(
  state: GameState,
  coord: AxialCoord | null | undefined,
): boolean {
  if (state.branchEstablished) return false;
  if (!branchManagementResearched(state)) return false;
  if (branchManagerAvailable(state) < 1) return false;
  if (!coord || !commercialSiteAt(coord)) return false;
  return canAffordAtOffice(state, "hq", BRANCH_OPENING_COST);
}

/** Human-readable reasons the player cannot open a branch yet. */
export function branchEstablishBlockers(
  state: GameState,
  coord: AxialCoord | null | undefined,
): string[] {
  if (state.branchEstablished) return [];
  const blockers: string[] = [];
  if (!branchManagementResearched(state)) {
    blockers.push(
      "Research Branch Management (Research tab)",
    );
  }
  if (branchManagerAvailable(state) < 1) {
    blockers.push("Hire a Branch Manager at HQ (consumed on establish)");
  }
  if (!coord || !commercialSiteAt(coord)) {
    blockers.push("Select a yellow commercial lot on the map");
    return blockers;
  }
  if (
    canAffordAtOffice(state, "hq", BRANCH_OPENING_COST) &&
    branchManagerAvailable(state) >= 1 &&
    branchManagementResearched(state)
  ) {
    return blockers;
  }

  const { global, power } = splitResourceCost(BRANCH_OPENING_COST);
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

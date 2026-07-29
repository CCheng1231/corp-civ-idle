import type { AxialCoord } from "./hexLayout";
import { axialDistance, axialEquals, MAP_GOV, MAP_HQ } from "./hexLayout";
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
  powerAvailable,
  splitResourceCost,
} from "./constants";

export const REGION_LABELS: Record<MapRegion, string> = {
  metropolis: "Metropolis",
  suburban: "Suburban",
  rural: "Rural",
  countryside: "Countryside",
};

export const MAP_HQ_COORD = MAP_HQ;

export const OFFICE_TOWERS: OfficeTowerDefinition[] = [
  {
    id: "metro_central",
    name: "Central Exchange Tower",
    coord: { q: 1, r: -1 },
    region: "metropolis",
    companyCrewCapacity: 8,
  },
  {
    id: "suburban_park",
    name: "Parkview Office Tower",
    coord: { q: 4, r: -3 },
    region: "suburban",
    companyCrewCapacity: 5,
  },
  {
    id: "rural_crossing",
    name: "Crossroads Business Tower",
    coord: { q: -4, r: 1 },
    region: "rural",
    companyCrewCapacity: 3,
  },
  {
    id: "country_estate",
    name: "Hillside Corporate Tower",
    coord: { q: 2, r: 4 },
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
  { coord: { q: 3, r: -2 }, region: "suburban", label: "Suburban strip parcel" },
  { coord: { q: -3, r: 3 }, region: "rural", label: "Rural highway frontage" },
  { coord: { q: 0, r: 4 }, region: "countryside", label: "Countryside lot" },
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

export function regionAtCoord(coord: AxialCoord): MapRegion {
  const d = axialDistance(coord, MAP_GOV);
  if (d <= 2) return "metropolis";
  if (d <= 4) return "suburban";
  if (d <= 5) return "rural";
  return "countryside";
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

export function branchManagementResearched(state: GameState): boolean {
  return state.researchLevels.branch_management >= 1;
}

export function canEstablishBranch(
  state: GameState,
  coord: AxialCoord | null | undefined,
): boolean {
  if (state.branchEstablished) return false;
  if (!branchManagementResearched(state)) return false;
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
    blockers.push("Research Branch Management (Research tab, requires Efficiency Manuals)");
  }
  if (!coord || !commercialSiteAt(coord)) {
    blockers.push("Select a yellow commercial lot on the map");
    return blockers;
  }
  if (canAffordAtOffice(state, "hq", BRANCH_OPENING_COST)) return blockers;

  const { global, power } = splitResourceCost(BRANCH_OPENING_COST);
  for (const [key, amount] of Object.entries(global)) {
    const k = key as keyof GameState["resources"];
    const need = amount ?? 0;
    if (state.resources[k] < need) {
      blockers.push(`Need ${formatNumber(need)} ${k} (have ${formatNumber(state.resources[k])})`);
    }
  }
  const freePower = powerAvailable(state.locationStats.hq);
  if (power > freePower) {
    blockers.push(
      `Need ${power} power at HQ (${formatNumber(freePower)} free — build Power Grid or sell bids' power use)`,
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

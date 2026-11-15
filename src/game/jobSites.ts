import {
  MAP_GOV,
  MAP_RADIUS,
  axialEquals,
  generateHexagonMap,
  isCoordOnMapGrid,
  type AxialCoord,
} from "./hexLayout";
import { resolveZ1MajorHubs } from "./worldMapMajorHubs";
import type { GameSettings, MajorHubId, TowerId } from "./types";
import { effectiveLandmarkCoord } from "./mapDevLayout";

export const JOB_SLOTS_PER_SITE = 3;

/** Future aura mechanic — completing jobs elsewhere while crew is in range. */
export const JOB_SITE_AURA_RADIUS = 3;

export type JobLocationType =
  | "police_station"
  | "hospital"
  | "tower"
  | "major_hub"
  | "city_hall";

export type JobSiteId = string;

export interface JobSiteAuraBonus {
  /** Reserved for follow-up feature. */
  kind: "staging_bonus";
}

export interface JobSiteDefinition {
  id: JobSiteId;
  locationType: JobLocationType;
  label: string;
  coord: AxialCoord;
  landmarkKey?: string;
  towerId?: TowerId;
  majorHubId?: MajorHubId;
  aura?: JobSiteAuraBonus;
}

export const POLICE_WORLD_COORD: AxialCoord = { q: 0, r: -2 };
export const HOSPITAL_WORLD_COORD: AxialCoord = { q: -5, r: 3 };

const CANON_TOWER_JOB_SITES: JobSiteDefinition[] = [
  {
    id: "tower:metro_central",
    locationType: "tower",
    label: "Central Exchange Tower",
    coord: { q: 0, r: -4 },
    towerId: "metro_central",
    landmarkKey: "tower:metro_central",
  },
  {
    id: "tower:suburban_park",
    locationType: "tower",
    label: "Parkview Office Tower",
    coord: { q: 2, r: 5 },
    towerId: "suburban_park",
    landmarkKey: "tower:suburban_park",
  },
  {
    id: "tower:rural_crossing",
    locationType: "tower",
    label: "Crossroads Business Tower",
    coord: { q: -7, r: 2 },
    towerId: "rural_crossing",
    landmarkKey: "tower:rural_crossing",
  },
  {
    id: "tower:country_estate",
    locationType: "tower",
    label: "Hillside Corporate Tower",
    coord: { q: 7, r: -6 },
    towerId: "country_estate",
    landmarkKey: "tower:country_estate",
  },
];

const STATIC_JOB_SITES: JobSiteDefinition[] = [
  {
    id: "city_hall:gov",
    locationType: "city_hall",
    label: "City Hall",
    coord: MAP_GOV,
    landmarkKey: "gov",
  },
  {
    id: "police:world",
    locationType: "police_station",
    label: "Police Station",
    coord: POLICE_WORLD_COORD,
    landmarkKey: "police:world",
    aura: { kind: "staging_bonus" },
  },
  {
    id: "hospital:world",
    locationType: "hospital",
    label: "Hospital",
    coord: HOSPITAL_WORLD_COORD,
    landmarkKey: "hospital:world",
    aura: { kind: "staging_bonus" },
  },
  ...CANON_TOWER_JOB_SITES,
];

export function jobSitesForSettings(settings?: GameSettings): JobSiteDefinition[] {
  const hubs = resolveZ1MajorHubs(settings).map(
    (hub): JobSiteDefinition => ({
      id: `hub:${hub.id}`,
      locationType: "major_hub",
      label: hub.label,
      coord: hub.coord,
      majorHubId: hub.id as MajorHubId,
      landmarkKey: `major-hub-${hub.id}`,
    }),
  );
  return [...STATIC_JOB_SITES, ...hubs];
}

export function jobSiteById(
  id: JobSiteId,
  settings?: GameSettings,
): JobSiteDefinition | undefined {
  return jobSitesForSettings(settings).find((s) => s.id === id);
}

export function jobSiteAtCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): JobSiteDefinition | undefined {
  for (const site of jobSitesForSettings(settings)) {
    if (axialEquals(jobSiteCoord(site, settings), coord)) {
      return site;
    }
  }
  return undefined;
}

export function jobSiteCoord(
  site: JobSiteDefinition,
  settings?: GameSettings,
): AxialCoord {
  if (site.landmarkKey) {
    return effectiveLandmarkCoord(site.landmarkKey, settings) ?? site.coord;
  }
  if (site.towerId) {
    return (
      effectiveLandmarkCoord(`tower:${site.towerId}`, settings) ?? site.coord
    );
  }
  return site.coord;
}

/** Hexes within aura radius of a site (future bonus mechanic). */
export function jobSiteAuraCoords(
  site: JobSiteDefinition,
  settings?: GameSettings,
  radius = JOB_SITE_AURA_RADIUS,
): AxialCoord[] {
  const center = jobSiteCoord(site, settings);
  const cells = generateHexagonMap(MAP_RADIUS);
  return cells.filter((c) => {
    const dq = c.q - center.q;
    const dr = c.r - center.r;
    const ds = -c.q - c.r - (-center.q - center.r);
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
    return dist <= radius;
  });
}

export function assertJobSitesOnMap(settings?: GameSettings): void {
  for (const site of jobSitesForSettings(settings)) {
    const c = jobSiteCoord(site, settings);
    if (!isCoordOnMapGrid(c)) {
      throw new Error(`Job site ${site.id} off map grid at ${c.q},${c.r}`);
    }
  }
}

export function isLegacyStaticDefinitionId(definitionId: string): boolean {
  return !definitionId.startsWith("proc:");
}
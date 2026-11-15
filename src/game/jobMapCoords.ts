import { MAP_GOV } from "./hexLayout";
import { commercialLotById } from "./commercialLots";
import { devRegionAtCoord, effectiveLandmarkCoord } from "./mapDevLayout";
import { majorHubById, majorHubCoord } from "./worldMapMajorHubs";
import { officeTowerCoord, towerById } from "./officeTowers";
import type {
  AxialCoord,
  GameSettings,
  JobDefinition,
  JobPosting,
  MajorHubId,
  MapRegion,
  TowerId,
} from "./types";

const PROCEDURAL_JOB_SITE_COORDS: Record<string, AxialCoord> = {
  "city_hall:gov": MAP_GOV,
  "police:world": { q: 0, r: -2 },
  "hospital:world": { q: -5, r: 3 },
};

function proceduralJobSiteCoord(
  locationId: string,
  settings?: GameSettings,
): AxialCoord | null {
  const canon = PROCEDURAL_JOB_SITE_COORDS[locationId];
  if (canon) {
    return effectiveLandmarkCoord(locationId, settings) ?? canon;
  }
  if (locationId.startsWith("tower:")) {
    const towerId = locationId.slice("tower:".length) as TowerId;
    return officeTowerCoord(towerId, settings);
  }
  if (locationId.startsWith("hub:")) {
    const hubId = locationId.slice("hub:".length) as MajorHubId;
    return majorHubCoord(hubId, settings);
  }
  return null;
}

export function jobSiteCoordForDefinition(
  def: JobDefinition,
  settings?: GameSettings,
): AxialCoord {
  if (def.locationId) {
    const coord = proceduralJobSiteCoord(def.locationId, settings);
    if (coord) return coord;
  }
  if (def.commercialLotId) {
    const lot = commercialLotById(def.commercialLotId);
    return (
      effectiveLandmarkCoord(`commercial:${lot.id}`, settings) ?? {
        ...lot.coord,
      }
    );
  }
  if (def.majorHubId) {
    return majorHubCoord(def.majorHubId, settings);
  }
  if (def.towerId) {
    return officeTowerCoord(def.towerId, settings);
  }
  throw new Error(`Job ${def.id} has no map site`);
}

export function jobSiteCoordForPosting(
  posting: Pick<
    JobPosting,
    "towerId" | "majorHubId" | "commercialLotId" | "locationId"
  >,
  def: JobDefinition,
  settings?: GameSettings,
): AxialCoord {
  const locationId = posting.locationId ?? def.locationId;
  if (locationId) {
    const coord = proceduralJobSiteCoord(locationId, settings);
    if (coord) return coord;
  }
  if (posting.commercialLotId) {
    const lot = commercialLotById(posting.commercialLotId);
    return (
      effectiveLandmarkCoord(`commercial:${lot.id}`, settings) ?? {
        ...lot.coord,
      }
    );
  }
  const hubId = (posting.majorHubId ?? def.majorHubId) as MajorHubId | null;
  if (hubId) {
    return majorHubCoord(hubId, settings);
  }
  if (posting.towerId) {
    return officeTowerCoord(posting.towerId, settings);
  }
  return jobSiteCoordForDefinition(def, settings);
}

export function jobSiteRegionForDefinition(def: JobDefinition): MapRegion {
  if (def.commercialLotId) {
    return commercialLotById(def.commercialLotId).region;
  }
  if (def.majorHubId) {
    const hub = majorHubById(def.majorHubId);
    return hub ? (devRegionAtCoord(hub.coord) ?? "metropolis") : "metropolis";
  }
  if (def.towerId) {
    return towerById(def.towerId).region;
  }
  return "countryside";
}

export function jobSiteRegionForPosting(
  posting: Pick<
    JobPosting,
    "towerId" | "majorHubId" | "commercialLotId"
  >,
  def: JobDefinition,
  settings?: GameSettings,
): MapRegion {
  if (posting.commercialLotId) {
    return commercialLotById(posting.commercialLotId).region;
  }
  const hubId = posting.majorHubId ?? def.majorHubId;
  if (hubId) {
    const hub = majorHubById(hubId);
    return hub
      ? (devRegionAtCoord(hub.coord, settings) ?? "metropolis")
      : jobSiteRegionForDefinition(def);
  }
  if (posting.towerId ?? def.towerId) {
    return towerById((posting.towerId ?? def.towerId) as TowerId).region;
  }
  if (def.locationId) {
    const coord = proceduralJobSiteCoord(def.locationId, settings);
    if (coord) return devRegionAtCoord(coord, settings) ?? "metropolis";
  }
  return jobSiteRegionForDefinition(def);
}
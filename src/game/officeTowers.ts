import { effectiveLandmarkCoord } from "./mapDevLayout";
import type { AxialCoord, GameSettings, OfficeTowerDefinition, TowerId } from "./types";

export const OFFICE_TOWERS: OfficeTowerDefinition[] = [
  {
    id: "metro_central",
    name: "Central Exchange Tower",
    coord: { q: 0, r: -4 },
    region: "metropolis",
    companyCrewCapacity: 8,
  },
  {
    id: "suburban_park",
    name: "Parkview Office Tower",
    coord: { q: 2, r: 5 },
    region: "suburban",
    companyCrewCapacity: 5,
  },
  {
    id: "rural_crossing",
    name: "Crossroads Business Tower",
    coord: { q: -7, r: 2 },
    region: "rural",
    companyCrewCapacity: 3,
  },
  {
    id: "country_estate",
    name: "Hillside Corporate Tower",
    coord: { q: 7, r: -6 },
    region: "countryside",
    companyCrewCapacity: 4,
  },
];

export function towerById(id: TowerId): OfficeTowerDefinition {
  const t = OFFICE_TOWERS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tower ${id}`);
  return t;
}

function towerCoord(
  tower: OfficeTowerDefinition,
  settings?: GameSettings,
): AxialCoord {
  return (
    effectiveLandmarkCoord(`tower:${tower.id}`, settings) ?? tower.coord
  );
}

export function officeTowerCoord(
  towerId: TowerId,
  settings?: GameSettings,
): AxialCoord {
  return towerCoord(towerById(towerId), settings);
}
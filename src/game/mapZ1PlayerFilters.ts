/**
 * Per-player Z1 procedural layer visibility (map filter panel → settings.mapZ1LayerFilters).
 */
import {
  MAP_Z1_LAYER_DEFAULTS,
  type MapZ1FilterGroup,
} from "./worldMapLayout";
import type { GameSettings } from "./types";

export const MAP_Z1_FILTER_LABELS: Record<MapZ1FilterGroup, string> = {
  base: "Terrain base",
  geography: "Geography",
  hubs: "Hub glows",
  roads: "Road network",
  flavor: "District flavor",
};

export const MAP_Z1_FILTER_ORDER: MapZ1FilterGroup[] = [
  "base",
  "geography",
  "hubs",
  "roads",
  "flavor",
];

export function mapZ1FilterGroupVisible(
  settings: GameSettings | undefined,
  group: MapZ1FilterGroup,
): boolean {
  const override = settings?.mapZ1LayerFilters?.[group];
  if (typeof override === "boolean") return override;
  return MAP_Z1_LAYER_DEFAULTS[group];
}

export function setMapZ1LayerFilter(
  settings: GameSettings,
  group: MapZ1FilterGroup,
  visible: boolean,
): Partial<GameSettings> {
  const next = { ...settings.mapZ1LayerFilters };
  if (visible === MAP_Z1_LAYER_DEFAULTS[group]) {
    delete next[group];
  } else {
    next[group] = visible;
  }
  return {
    mapZ1LayerFilters:
      Object.keys(next).length > 0 ? next : undefined,
  };
}

export function countMapZ1FilterOverrides(settings: GameSettings): number {
  if (!settings.mapZ1LayerFilters) return 0;
  return MAP_Z1_FILTER_ORDER.filter(
    (g) => typeof settings.mapZ1LayerFilters?.[g] === "boolean",
  ).length;
}

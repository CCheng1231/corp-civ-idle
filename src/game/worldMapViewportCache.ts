import { MAP_ZOOM_REL_DEFAULT } from "./mapViewport";
import type { AxialCoord } from "./types";

export type WorldMapViewportCache = {
  mapZoomRel: number;
  mapPan: { x: number; y: number };
  inspectedCoord: AxialCoord | null;
  legendOpen: boolean;
  hasSession: boolean;
};

let cache: WorldMapViewportCache = {
  mapZoomRel: MAP_ZOOM_REL_DEFAULT,
  mapPan: { x: 0, y: 0 },
  inspectedCoord: null,
  legendOpen: false,
  hasSession: false,
};

export function readWorldMapViewportCache(): WorldMapViewportCache {
  return cache;
}

export function writeWorldMapViewportCache(
  next: Partial<Omit<WorldMapViewportCache, "hasSession">>,
): void {
  cache = { ...cache, ...next, hasSession: true };
}

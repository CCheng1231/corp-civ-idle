/**
 * World map v0.1 — raster zoom bands (hybrid-soft reference art).
 * Player base layer uses bundled PNGs, not procedural cream/schematic art.
 */
import {
  MAP_ZOOM_REL_MAX,
  MAP_ZOOM_REL_MIN,
  clampMapZoomRel,
} from "./mapViewport";

export interface MapBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export type WorldMapV01ZoomBand = 1 | 2 | 3 | 4;

/** Relative zoom at or above these thresholds steps up Z2 → Z4. Default 100% stays Z1. */
export const MAP_V01_ZOOM_Z2_MIN = 1.12;
export const MAP_V01_ZOOM_Z3_MIN = 1.32;
export const MAP_V01_ZOOM_Z4_MIN = 1.52;

export function worldMapV01ZoomBand(zoomRel: number): WorldMapV01ZoomBand {
  const z = clampMapZoomRel(zoomRel, { snapStep: false });
  if (z >= MAP_V01_ZOOM_Z4_MIN) return 4;
  if (z >= MAP_V01_ZOOM_Z3_MIN) return 3;
  if (z >= MAP_V01_ZOOM_Z2_MIN) return 2;
  return 1;
}

/** Human-readable band for dev overlay (optional). */
export function worldMapV01ZoomBandLabel(band: WorldMapV01ZoomBand): string {
  return `Z${band}`;
}

export const MAP_V01_ZOOM_BAND_RANGE: Record<
  WorldMapV01ZoomBand,
  { min: number; max: number }
> = {
  1: { min: MAP_ZOOM_REL_MIN, max: MAP_V01_ZOOM_Z2_MIN },
  2: { min: MAP_V01_ZOOM_Z2_MIN, max: MAP_V01_ZOOM_Z3_MIN },
  3: { min: MAP_V01_ZOOM_Z3_MIN, max: MAP_V01_ZOOM_Z4_MIN },
  4: { min: MAP_V01_ZOOM_Z4_MIN, max: MAP_ZOOM_REL_MAX },
};

/**
 * ViewBox anchor math for map landmark art (single-hex and multi-hex footprints).
 */
import { axialKey, type AxialCoord } from "./hexLayout";
import type { GameSettings } from "./types";
import { worldMapHexTileRadius } from "./mapWorld";
import { worldMapPresentationPixel } from "./mapDevLayout";

export type MapLandmarkFootprint = AxialCoord[];

export interface MapLandmarkViewBoxAnchor {
  x: number;
  y: number;
  /** Hex circumradius for layout presets (may exceed one cell on multi-hex). */
  hexRadius: number;
  /** Diameter used for widthSpanRatio (viewBox px). */
  layoutSpan: number;
}

/** Centroid anchor; layout span covers the footprint bounding box. */
export function mapLandmarkViewBoxAnchor(
  footprint: MapLandmarkFootprint,
  settings?: GameSettings,
): MapLandmarkViewBoxAnchor {
  if (footprint.length === 0) {
    return { x: 0, y: 0, hexRadius: 42, layoutSpan: 84 };
  }
  if (footprint.length === 1) {
    const coord = footprint[0]!;
    const { x, y } = worldMapPresentationPixel(coord, settings);
    const r = worldMapHexTileRadius(coord);
    return { x, y, hexRadius: r, layoutSpan: r * 2 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  let maxR = 0;

  for (const coord of footprint) {
    const { x, y } = worldMapPresentationPixel(coord, settings);
    const r = worldMapHexTileRadius(coord);
    maxR = Math.max(maxR, r);
    sumX += x;
    sumY += y;
    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  }

  const n = footprint.length;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  return {
    x: sumX / n,
    y: sumY / n,
    hexRadius: maxR,
    layoutSpan: Math.max(spanX, spanY, maxR * 2),
  };
}

export function mapLandmarkFootprintKeySet(
  footprint: MapLandmarkFootprint,
): Set<string> {
  return new Set(footprint.map(axialKey));
}

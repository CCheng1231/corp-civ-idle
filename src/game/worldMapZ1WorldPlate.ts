/**
 * Z1 visual-only world plate — extends art beyond hex bounds for min-zoom pan slack.
 * Does not change hex grid, hubs, or v5 raster alignment (see docs/z1-world-extend-gen-spec.md).
 */
import type { MapBounds } from "./worldMapV01";
/** ViewBox pad per side (from scripts/compute-z1-world-extend-margin.mjs). */
export const MAP_Z1_WORLD_PLATE_PAD = 2600;

export function z1WorldPlateBounds(cornerstone: MapBounds): MapBounds {
  const pad = MAP_Z1_WORLD_PLATE_PAD;
  return {
    minX: cornerstone.minX - pad,
    minY: cornerstone.minY - pad,
    width: cornerstone.width + pad * 2,
    height: cornerstone.height + pad * 2,
  };
}

/** SVG viewBox — plate margin through Z1 / Z1→Z2 crossfade; hex coords unchanged. */
export function worldMapPlayerSvgViewBounds(
  cornerstone: MapBounds,
  usePlateMargin: boolean,
): MapBounds {
  if (usePlateMargin) {
    return z1WorldPlateBounds(cornerstone);
  }
  return cornerstone;
}

/** Scale map zoom so cornerstone fill matches pre-plate 100% baseline. */
export function mapZ1ViewBoxZoomFactor(
  cornerstone: MapBounds,
  svgViewBounds: MapBounds,
): number {
  if (cornerstone.width <= 0) return 1;
  return svgViewBounds.width / cornerstone.width;
}

/** CSS scale on map content (`fitZoom * zoomRel` × plate viewBox factor). */
/** CSS scale on map content (`fitZoom * zoomRel`). */
export function mapAbsoluteZoomScale(
  fitZoom: number,
  zoomRel: number,
  _cornerstone?: MapBounds,
): number {
  return fitZoom * zoomRel;
}

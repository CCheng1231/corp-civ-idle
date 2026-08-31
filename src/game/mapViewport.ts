/**
 * World map viewport math — pan, zoom, fit, and Home centering.
 *
 * Must stay in sync with world-map presentation layout (`worldMapAxialToPixel`,
 * `worldMapHexBounds`). When map layout changes, update callers here and in
 * WorldView together (see `.cursor/rules/world-map-viewport.mdc`).
 */

import type { AxialCoord } from "./types";
import { worldMapAxialToPixel } from "./mapWorld";

export type MapViewBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type MapContentSize = {
  width: number;
  height: number;
};

/** Zoom relative to fit-to-viewport baseline (100% = map fills the panel). */
export const MAP_ZOOM_REL_MIN = 0.55;
export const MAP_ZOOM_REL_MAX = 1.75;
export const MAP_ZOOM_REL_STEP = 0.05;
/** Open at 100% — same scale as HQ focus on the new baseline. */
export const MAP_ZOOM_REL_DEFAULT = 1;
/** HQ button: center player HQ at 100% relative zoom. */
export const MAP_HQ_FOCUS_ZOOM_REL = 1;
/** Exponential wheel zoom — higher = faster scroll zoom. */
export const MAP_WHEEL_ZOOM_SENSITIVITY = 0.00115;
/**
 * Fit baseline calibrated so edge-HQ focus (~old 200%) reads as 100%.
 * (Previously MAP_FIT_BLEED ≈ 1.32 with rel max 2.0.)
 */
export const MAP_FIT_BLEED = 2.65;
/** Extra pan slack (per side) so edge sites can center; grey viewport may show at margins. */
export const MAP_PAN_OVERSCROLL_RATIO = 0.2;

export function clampMapZoomRel(
  zoomRel: number,
  options?: { snapStep?: number | false },
): number {
  const step = options?.snapStep ?? MAP_ZOOM_REL_STEP;
  let value = zoomRel;
  if (step !== false) {
    value = Math.round(value / step) * step;
    return Math.min(
      MAP_ZOOM_REL_MAX,
      Math.max(MAP_ZOOM_REL_MIN, Number(value.toFixed(2))),
    );
  }
  return Math.min(
    MAP_ZOOM_REL_MAX,
    Math.max(MAP_ZOOM_REL_MIN, Number(value.toFixed(4))),
  );
}

/** Continuous wheel factor from native deltaY / deltaMode. */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  let delta = deltaY;
  if (deltaMode === 1) delta *= 16;
  if (deltaMode === 2) delta *= 320;
  return Math.exp(-delta * MAP_WHEEL_ZOOM_SENSITIVITY);
}

/** Content-space point under a viewport pixel (matches scale-at-center + pan). */
export function contentPointAtViewportPixel(
  viewportX: number,
  viewportY: number,
  pan: { x: number; y: number },
  zoom: number,
  content: MapContentSize,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  if (zoom <= 0) return { x: content.width / 2, y: content.height / 2 };
  return {
    x: content.width / 2 + (viewportX - viewportW / 2 - pan.x) / zoom,
    y: content.height / 2 + (viewportY - viewportH / 2 - pan.y) / zoom,
  };
}

export function panForViewportAnchor(
  anchor: { x: number; y: number },
  viewportX: number,
  viewportY: number,
  zoom: number,
  content: MapContentSize,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  return {
    x: viewportX - viewportW / 2 - (anchor.x - content.width / 2) * zoom,
    y: viewportY - viewportH / 2 - (anchor.y - content.height / 2) * zoom,
  };
}

export function applyMapWheelZoom(input: {
  deltaY: number;
  deltaMode: number;
  viewportX: number;
  viewportY: number;
  viewportW: number;
  viewportH: number;
  fitZoom: number;
  zoomRel: number;
  pan: { x: number; y: number };
  content: MapContentSize;
}): { zoomRel: number; pan: { x: number; y: number } } {
  const {
    deltaY,
    deltaMode,
    viewportX,
    viewportY,
    viewportW,
    viewportH,
    fitZoom,
    zoomRel,
    pan,
    content,
  } = input;
  if (fitZoom <= 0 || content.width <= 0 || content.height <= 0) {
    return { zoomRel, pan };
  }

  const zoomBefore = fitZoom * zoomRel;
  const anchor = contentPointAtViewportPixel(
    viewportX,
    viewportY,
    pan,
    zoomBefore,
    content,
    viewportW,
    viewportH,
  );
  const zoomRelAfter = clampMapZoomRel(
    zoomRel * wheelZoomFactor(deltaY, deltaMode),
    { snapStep: false },
  );
  const zoomAfter = fitZoom * zoomRelAfter;
  const panAfter = clampMapPan(
    panForViewportAnchor(
      anchor,
      viewportX,
      viewportY,
      zoomAfter,
      content,
      viewportW,
      viewportH,
    ),
    zoomAfter,
    viewportW,
    viewportH,
    content,
  );
  return { zoomRel: zoomRelAfter, pan: panAfter };
}

export function mapContentLayout(
  viewportW: number,
  bounds: MapViewBounds,
): MapContentSize {
  const width = Math.max(viewportW, 1);
  const height =
    bounds.width > 0 ? width * (bounds.height / bounds.width) : width;
  return { width, height };
}

export function computeFitZoom(
  viewportW: number,
  viewportH: number,
  bounds: MapViewBounds,
  bleed: number = MAP_FIT_BLEED,
): number {
  if (viewportW < 8 || viewportH < 8 || bounds.width <= 0) return 1;
  const content = mapContentLayout(viewportW, bounds);
  return (
    Math.max(viewportW / content.width, viewportH / content.height) * bleed
  );
}

/** Pan stays mostly inside the map; small overscroll reveals grey margins for edge landmarks. */
export function clampMapPan(
  pan: { x: number; y: number },
  zoom: number,
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
  overscrollRatio: number = MAP_PAN_OVERSCROLL_RATIO,
): { x: number; y: number } {
  if (
    viewportW <= 0 ||
    viewportH <= 0 ||
    content.width <= 0 ||
    content.height <= 0
  ) {
    return pan;
  }
  const scaledW = content.width * zoom;
  const scaledH = content.height * zoom;
  const overscrollX = viewportW * overscrollRatio;
  const overscrollY = viewportH * overscrollRatio;
  const maxPanX = Math.max(0, (scaledW - viewportW) / 2) + overscrollX;
  const maxPanY = Math.max(0, (scaledH - viewportH) / 2) + overscrollY;
  return {
    x: Math.min(maxPanX, Math.max(-maxPanX, pan.x)),
    y: Math.min(maxPanY, Math.max(-maxPanY, pan.y)),
  };
}

/** Map viewBox / world pixel → layout content pixels (pre CSS scale). */
export function viewBoxPointToContentPixel(
  point: { x: number; y: number },
  bounds: MapViewBounds,
  content: MapContentSize,
): { x: number; y: number } {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: 0, y: 0 };
  }
  return {
    x: ((point.x - bounds.minX) / bounds.width) * content.width,
    y: ((point.y - bounds.minY) / bounds.height) * content.height,
  };
}

export function worldMapCoordToContentPixel(
  coord: AxialCoord,
  bounds: MapViewBounds,
  content: MapContentSize,
): { x: number; y: number } {
  return viewBoxPointToContentPixel(
    worldMapAxialToPixel(coord),
    bounds,
    content,
  );
}

/** Pan offset so `point` sits at the viewport center (scale origin = content center). */
export function panToCenterContentPoint(
  point: { x: number; y: number },
  content: MapContentSize,
  zoom: number,
): { x: number; y: number } {
  return {
    x: -(point.x - content.width / 2) * zoom,
    y: -(point.y - content.height / 2) * zoom,
  };
}

/**
 * Minimum absolute zoom so a content point can be panned to the viewport center.
 * Edge landmarks (e.g. countryside HQ) need more than fit-at-100% when the full map fits on screen.
 */
export function minZoomToCenterContentPoint(
  point: { x: number; y: number },
  content: MapContentSize,
  viewportW: number,
  viewportH: number,
): number {
  if (content.width <= 0 || content.height <= 0) return 1;

  const dx = Math.abs(point.x - content.width / 2);
  const dy = Math.abs(point.y - content.height / 2);
  const slack = 1;

  let minZoom = Math.max(
    viewportW / content.width,
    viewportH / content.height,
  );

  const spanX = content.width - 2 * dx - slack;
  if (spanX > 0) {
    minZoom = Math.max(minZoom, viewportW / spanX);
  } else {
    minZoom = Math.max(minZoom, (viewportW / content.width) * 2.25);
  }

  const spanY = content.height - 2 * dy - slack;
  if (spanY > 0) {
    minZoom = Math.max(minZoom, viewportH / spanY);
  } else {
    minZoom = Math.max(minZoom, (viewportH / content.height) * 2.25);
  }

  return minZoom;
}

export function focusViewportOnContentPoint(
  point: { x: number; y: number },
  content: MapContentSize,
  viewportW: number,
  viewportH: number,
  fitZoom: number,
  preferredZoomRel: number = MAP_HQ_FOCUS_ZOOM_REL,
): {
  zoomRel: number;
  zoom: number;
  pan: { x: number; y: number };
} {
  const preferredZoom = fitZoom * preferredZoomRel;
  const minZoom = minZoomToCenterContentPoint(
    point,
    content,
    viewportW,
    viewportH,
  );
  const zoom = Math.max(preferredZoom, minZoom);
  const zoomRel = clampMapZoomRel(zoom / fitZoom);
  const absoluteZoom = fitZoom * zoomRel;
  const pan = clampMapPan(
    panToCenterContentPoint(point, content, absoluteZoom),
    absoluteZoom,
    viewportW,
    viewportH,
    content,
  );
  return { zoomRel, zoom: absoluteZoom, pan };
}

export function measureMapViewport(
  viewportW: number,
  viewportH: number,
  bounds: MapViewBounds,
): { fitZoom: number; content: MapContentSize } {
  const content = mapContentLayout(viewportW, bounds);
  return {
    content,
    fitZoom: computeFitZoom(viewportW, viewportH, bounds),
  };
}

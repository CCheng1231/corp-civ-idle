/**
 * World map viewport math — pan, zoom, fit, and Home centering.
 *
 * Must stay in sync with world-map presentation layout (`worldMapAxialToPixel`,
 * `worldMapHexBounds`). When map layout changes, update callers here and in
 * WorldView together (see `.cursor/rules/world-map-viewport.mdc`).
 */

import type { AxialCoord, GameSettings } from "./types";
import { worldMapPresentationPixel } from "./mapDevLayout";
import { mapAbsoluteZoomScale } from "./worldMapZ1WorldPlate";

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
export const MAP_ZOOM_REL_MIN = 0.2;
export const MAP_ZOOM_REL_MAX = 1.75;
export const MAP_ZOOM_REL_STEP = 0.05;
/** Open at 100% — same scale as HQ focus on the new baseline. */
export const MAP_ZOOM_REL_DEFAULT = 1;
/** HQ button: center player HQ at 100% relative zoom. */
export const MAP_HQ_FOCUS_ZOOM_REL = 1;

/** Keep in sync with `MAP_V01_ZOOM_Z2_MIN` in worldMapV01.ts */
export const MAP_V01_ZOOM_Z2_MIN_TILT = 1.2;

/**
 * v0.1 — oblique tilt (never fully flat). Z1 band uses stronger tilt (hybrid-soft ref).
 * @param zoomBand — from `worldMapV01ZoomBand(zoomRel)`; omit for Z2+ style ramp only.
 */
export function mapPresentationTiltDeg(
  _zoomRel: number,
  _zoomBand?: 1 | 2 | 3 | 4,
): number {
  /** Map oblique tilt paused — flat top-down zoom until art/UI revisit. */
  return 0;
}

/** Must match `.map-presentation-player .map-zoom-scale-layer-tilt` transform-origin Y. */
export const MAP_PRESENTATION_TILT_ORIGIN_Y_RATIO = 0.55;

/**
 * Content-pixel position after rotateX(tilt) about (50%, 55%) — aligns markers with tilted hexes.
 */
export function mapContentPointAfterTilt(
  point: { x: number; y: number },
  content: MapContentSize,
  tiltDeg: number,
  originYRatio = MAP_PRESENTATION_TILT_ORIGIN_Y_RATIO,
): { x: number; y: number } {
  if (content.width <= 0 || content.height <= 0 || tiltDeg <= 0) {
    return point;
  }
  const oy = content.height * originYRatio;
  const rad = (tiltDeg * Math.PI) / 180;
  const dy = point.y - oy;
  return {
    x: point.x,
    y: oy + dy * Math.cos(rad),
  };
}

/** Tower footprint + height scaled to rendered hex size (stable silhouette at any zoom). */
export function mapHqTowerDimensionsFromHexScreenPx(hexSpanPx: number): {
  width: number;
  depth: number;
  height: number;
} {
  const span = Math.max(hexSpanPx, 1);
  /** On-phone hexes are smaller on screen — keep towers inside the cell. */
  const tight =
    span < 56 ? 0.78 : span < 72 ? 0.88 : span < 96 ? 0.94 : 1;
  return {
    height: Math.min(140, Math.max(10, span * 0.52 * tight)),
    width: Math.min(52, Math.max(8, span * 0.23 * tight)),
    depth: Math.min(38, Math.max(6, span * 0.17 * tight)),
  };
}

/** Isometric major-hub SVG footprint (hub-iso-supertall, viewBox 300×320). */
export function mapMajorHubArtSizeFromHexScreenPx(hexSpanPx: number): {
  width: number;
  height: number;
} {
  const span = Math.max(hexSpanPx, 1);
  const tight =
    span < 56 ? 0.8 : span < 72 ? 0.88 : span < 96 ? 0.94 : 1;
  const width = Math.min(132, Math.max(52, span * 0.94 * tight));
  return { width, height: width * (320 / 300) };
}

/** Body rotateX for HQ tower — stay closer to upright at all zoom levels. */
export function mapHqTowerPresentationTiltDeg(towerHeightPx: number): number {
  const h = Math.min(140, Math.max(10, towerHeightPx));
  const t = (h - 10) / 130;
  return -10 + t * 4;
}

/** Exponential wheel zoom — higher = faster scroll zoom. */
export const MAP_WHEEL_ZOOM_SENSITIVITY = 0.00115;
/**
 * Fit baseline calibrated so edge-HQ focus (~old 200%) reads as 100%.
 * (Previously MAP_FIT_BLEED ≈ 1.32 with rel max 2.0.)
 */
export const MAP_FIT_BLEED = 2.65;
/** Dev-only pan slack so edge sites can center past the art edge. */
export const MAP_PAN_OVERSCROLL_RATIO = 0.2;

export function mapPanOverscrollRatio(isDevPresentation: boolean): number {
  return isDevPresentation ? MAP_PAN_OVERSCROLL_RATIO : 0;
}

/** Minimum CSS scale so map content fully covers the viewport (no letterbox). */
export function minAbsoluteZoomToCoverViewport(
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
): number {
  if (content.width <= 0 || content.height <= 0) return 1;
  return Math.max(
    viewportW / content.width,
    viewportH / content.height,
  );
}

/**
 * Lowest zoomRel that still covers the panel (replaces fixed 20% floor when higher).
 */
export function minMapZoomRelForCover(
  fitZoom: number,
  cornerstone: MapViewBounds,
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
): number {
  const minAbs = minAbsoluteZoomToCoverViewport(viewportW, viewportH, content);
  if (fitZoom <= 0) return MAP_ZOOM_REL_MIN;

  let zLo = MAP_ZOOM_REL_MIN;
  let zHi = MAP_ZOOM_REL_MAX;
  for (let i = 0; i < 40; i++) {
    const mid = (zLo + zHi) / 2;
    const abs = mapAbsoluteZoomScale(fitZoom, mid, cornerstone);
    if (abs >= minAbs) {
      zHi = mid;
    } else {
      zLo = mid;
    }
  }
  return clampMapZoomRel(zHi, { snapStep: false });
}

export function clampMapZoomRelForCover(
  zoomRel: number,
  fitZoom: number,
  cornerstone: MapViewBounds,
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
): number {
  const floor = minMapZoomRelForCover(
    fitZoom,
    cornerstone,
    viewportW,
    viewportH,
    content,
  );
  return clampMapZoomRel(Math.max(zoomRel, floor), { snapStep: false });
}

/** Inset at max zoom-out (1 = edge-to-edge contain). */
export const MAP_SHOWCASE_FIT_PADDING = 1;

/**
 * Max zoom-out: entire map visible in the panel (contain), not cover-crop.
 * Replaces cover floor for player/dev min zoom.
 */
export function mapZoomRelForFullFit(
  fitZoom: number,
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
  padding: number = MAP_SHOWCASE_FIT_PADDING,
): number {
  if (fitZoom <= 0 || content.width <= 0 || content.height <= 0) {
    return MAP_ZOOM_REL_MIN;
  }
  const containAbs =
    Math.min(viewportW / content.width, viewportH / content.height) / padding;
  const rel = containAbs / fitZoom;
  return clampMapZoomRel(
    Math.max(MAP_ZOOM_REL_MIN, Math.min(MAP_ZOOM_REL_MAX, rel)),
    { snapStep: false },
  );
}

export function clampMapZoomRelForPlayer(
  zoomRel: number,
  fitZoom: number,
  viewportW: number,
  viewportH: number,
  content: MapContentSize,
): number {
  const floor = mapZoomRelForFullFit(
    fitZoom,
    viewportW,
    viewportH,
    content,
  );
  return clampMapZoomRel(Math.max(zoomRel, floor), { snapStep: false });
}

/** SVG uses meet (full art) at or below this rel; slice when zoomed in. */
export const MAP_SHOWCASE_PRESERVE_MEET_MAX_REL = 0.72;

export function mapSvgPreserveAspectRatio(
  zoomRel: number,
  showcaseFloorRel: number = MAP_ZOOM_REL_MIN,
): string {
  const meetUntil = Math.max(
    MAP_SHOWCASE_PRESERVE_MEET_MAX_REL,
    showcaseFloorRel * 1.08,
  );
  return zoomRel <= meetUntil ? "xMidYMid meet" : "xMidYMid slice";
}

export type MapSvgAspectFit = "meet" | "slice";

export function mapSvgAspectFit(
  zoomRel: number,
  showcaseFloorRel: number = MAP_ZOOM_REL_MIN,
): MapSvgAspectFit {
  return mapSvgPreserveAspectRatio(zoomRel, showcaseFloorRel).includes("meet")
    ? "meet"
    : "slice";
}

/** viewBox → layout content px (matches SVG xMidYMid meet / slice). */
export function viewBoxToContentPixelScale(
  bounds: MapViewBounds,
  content: MapContentSize,
  fit: MapSvgAspectFit,
): number {
  if (bounds.width <= 0 || bounds.height <= 0) return 1;
  return fit === "meet"
    ? Math.min(content.width / bounds.width, content.height / bounds.height)
    : Math.max(content.width / bounds.width, content.height / bounds.height);
}

export function viewBoxPointToContentPixelWithAspect(
  point: { x: number; y: number },
  bounds: MapViewBounds,
  content: MapContentSize,
  fit: MapSvgAspectFit,
): { x: number; y: number } {
  const scale = viewBoxToContentPixelScale(bounds, content, fit);
  const offsetX = (content.width - bounds.width * scale) / 2;
  const offsetY = (content.height - bounds.height * scale) / 2;
  return {
    x: (point.x - bounds.minX) * scale + offsetX,
    y: (point.y - bounds.minY) * scale + offsetY,
  };
}

/** Below this relative zoom, player sees Gov + own HQ pins only. */
export const MAP_STRATEGIC_ZOOM_PIN_MAX_REL = 0.35;

/** Z1→Z2 raster crossfade (continuous zoomRel; band Z2 starts at HI). */
export const MAP_Z1_Z2_CROSSFADE_LO = 1;
export const MAP_Z1_Z2_CROSSFADE_HI = 1.2;

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function mapZ1Z2CrossfadeWeights(zoomRel: number): {
  z1: number;
  z2: number;
} {
  const z = clampMapZoomRel(zoomRel, { snapStep: false });
  if (z <= MAP_Z1_Z2_CROSSFADE_LO) return { z1: 1, z2: 0 };
  if (z >= MAP_Z1_Z2_CROSSFADE_HI) return { z1: 0, z2: 1 };
  const t = smoothstep01(
    (z - MAP_Z1_Z2_CROSSFADE_LO) /
      (MAP_Z1_Z2_CROSSFADE_HI - MAP_Z1_Z2_CROSSFADE_LO),
  );
  return { z1: 1 - t, z2: t };
}

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
  resolveAbsoluteZoom?: (zoomRel: number) => number;
  panOverscrollRatio?: number;
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
    resolveAbsoluteZoom,
    panOverscrollRatio,
  } = input;
  if (fitZoom <= 0 || content.width <= 0 || content.height <= 0) {
    return { zoomRel, pan };
  }

  const absZoom = (zRel: number) =>
    resolveAbsoluteZoom?.(zRel) ?? fitZoom * zRel;

  const zoomBefore = absZoom(zoomRel);
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
  const zoomAfter = absZoom(zoomRelAfter);
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
    panOverscrollRatio ?? MAP_PAN_OVERSCROLL_RATIO,
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
  settings?: GameSettings,
): { x: number; y: number } {
  return viewBoxPointToContentPixel(
    worldMapPresentationPixel(coord, settings),
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

/** Pan so the map viewBox center sits in the viewport (full-map / showcase framing). */
export function panToCenterMapView(
  bounds: MapViewBounds,
  content: MapContentSize,
  zoom: number,
): { x: number; y: number } {
  return panToCenterContentPoint(
    viewBoxPointToContentPixel(
      {
        x: bounds.minX + bounds.width / 2,
        y: bounds.minY + bounds.height / 2,
      },
      bounds,
      content,
    ),
    content,
    zoom,
  );
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

/** Hit target for a map hex (shared data-map-q / data-map-r attrs). */
export function findMapHexElement(
  svg: SVGSVGElement,
  coord: AxialCoord,
): Element | null {
  return svg.querySelector(
    `[data-map-q="${coord.q}"][data-map-r="${coord.r}"]`,
  );
}

/** Nudge pan so a DOM rect's center aligns with the viewport center. */
export function panToCenterViewportRect(
  viewportRect: DOMRect,
  targetRect: DOMRect,
  currentPan: { x: number; y: number },
): { x: number; y: number } {
  const targetCenterX =
    targetRect.left + targetRect.width / 2 - viewportRect.left;
  const targetCenterY =
    targetRect.top + targetRect.height / 2 - viewportRect.top;
  return {
    x: currentPan.x + (viewportRect.width / 2 - targetCenterX),
    y: currentPan.y + (viewportRect.height / 2 - targetCenterY),
  };
}

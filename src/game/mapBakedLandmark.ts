/**
 * Baked raster landmarks on the player world map (Gov capitol, future structures).
 *
 * **SVG `<image>` in viewBox units** — same transform chain as hex polygons (scales with zoom).
 * HTML overlay + counter-scale fights `preserveAspectRatio` meet/slice and min-width clamps.
 *
 * Sharpness: ship `@2x` PNG; optional canvas overlay later for extreme zoom.
 */

export type MapBakedLandmarkPreset = {
  id: string;
  widthSpanRatio: number;
  heightWidthRatio: number;
  /** Down from hex center (viewBox px); pointy-top south vertex ≈ 0.5 × span. */
  footOffsetSpanRatio: number;
  /**
   * Isometric bakes: distance from PNG bottom to hex-center anchor, as a multiple of
   * laid-out image height (measure widest opaque row from bottom ÷ PNG height).
   */
  footAnchorHeightRatio?: number;
  /** Extra south offset for isometric contact (× hex span); 0 = hex center. */
  footContactSpanRatio?: number;
  maxWidthViewBox: number;
  minWidthViewBox: number;
};

/** Layout in world-map viewBox coordinates (hex diameter = 2 × hexRadius). */
export function mapBakedLandmarkLayoutFromHexSpanViewBox(
  hexSpanViewBox: number,
  preset: MapBakedLandmarkPreset,
): {
  width: number;
  height: number;
  footOffsetY: number;
} {
  const span = Math.max(hexSpanViewBox, 1);
  const tight = span < 72 ? 0.9 : span < 96 ? 0.94 : 1;
  const width = Math.min(
    preset.maxWidthViewBox,
    Math.max(preset.minWidthViewBox, span * preset.widthSpanRatio * tight),
  );
  const height = width * preset.heightWidthRatio;
  const contactExtra =
    preset.footAnchorHeightRatio != null
      ? span * (preset.footContactSpanRatio ?? 0)
      : 0;
  const footOffsetY =
    preset.footAnchorHeightRatio != null
      ? preset.footAnchorHeightRatio * height + contactExtra
      : span * preset.footOffsetSpanRatio;
  return {
    width,
    height,
    footOffsetY,
  };
}

/** Farthest pointy-top hex extent below center (SVG y+, matches `hexPolygonPoints`). */
export function hexPointyTopSouthExtentY(hexRadius: number): number {
  return hexRadius;
}

/** Same rect math as `MapBakedLandmarkSvgImage` (world-map viewBox units). */
export function mapBakedLandmarkSvgImageLayout(
  hexCenterX: number,
  hexCenterY: number,
  hexRadius: number,
  preset: MapBakedLandmarkPreset,
): {
  x: number;
  y: number;
  width: number;
  height: number;
  footY: number;
  footOffsetY: number;
  contactY: number;
} {
  const hexSpan = hexRadius * 2;
  const { width, height, footOffsetY } = mapBakedLandmarkLayoutFromHexSpanViewBox(
    hexSpan,
    preset,
  );
  const contactSouth =
    preset.footAnchorHeightRatio != null
      ? hexSpan * (preset.footContactSpanRatio ?? 0)
      : 0;
  const footY = hexCenterY + footOffsetY;
  return {
    x: hexCenterX - width / 2,
    y: footY - height,
    width,
    height,
    footY,
    footOffsetY,
    /** Where isometric pad meets hex center (when using footAnchorHeightRatio). */
    contactY:
      preset.footAnchorHeightRatio != null
        ? hexCenterY + contactSouth
        : footY,
  };
}

/** ViewBox string for HTML preview SVG (1 viewBox unit = 1 in-game unit). */
export function mapBakedLandmarkPreviewViewBox(
  hexRadius: number,
  preset: MapBakedLandmarkPreset,
  pad = 14,
): string {
  const cx = 0;
  const cy = 0;
  const layout = mapBakedLandmarkSvgImageLayout(cx, cy, hexRadius, preset);
  const hexMaxX = (hexRadius * Math.sqrt(3)) / 2;
  const minX = Math.min(-hexMaxX, layout.x) - pad;
  const maxX = Math.max(hexMaxX, layout.x + layout.width) + pad;
  const minY = Math.min(cy - hexRadius, layout.y) - pad;
  const maxY = Math.max(cy + hexRadius, layout.footY) + pad;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

/**
 * Gov capitol bake — layout preset (864×1152 logical base; @2x via mapLandmarkBakedAssets).
 *
 * Higher-quality master (when ready): PNG with alpha at
 * gov-capitol-isometric-bake-master.png (≥1728px wide), then
 * node scripts/key-gov-capitol-bake.mjs --master <path>
 */
export const MAP_BAKED_LANDMARK_GOV_CAPITOL: MapBakedLandmarkPreset = {
  id: "gov-capitol",
  widthSpanRatio: 0.88,
  heightWidthRatio: 991 / 852,
  footOffsetSpanRatio: 0.34,
  maxWidthViewBox: 96,
  minWidthViewBox: 28,
};

/** Commercial parcel bakes — alpha-trimmed; heightWidthRatio matches keyed PNG. */
export const MAP_BAKED_LANDMARK_COMMERCIAL_SUBURBAN_STRIP: MapBakedLandmarkPreset =
  {
    id: "commercial-suburban-strip",
    widthSpanRatio: 0.66,
    heightWidthRatio: 425 / 844,
    footOffsetSpanRatio: 0.34,
    footAnchorHeightRatio: 0.447,
    footContactSpanRatio: 0.055,
    maxWidthViewBox: 74,
    minWidthViewBox: 24,
  };

export const MAP_BAKED_LANDMARK_COMMERCIAL_RURAL_HIGHWAY: MapBakedLandmarkPreset =
  {
    id: "commercial-rural-highway",
    widthSpanRatio: 0.62,
    heightWidthRatio: 429 / 853,
    footOffsetSpanRatio: 0.34,
    footAnchorHeightRatio: 0.448,
    footContactSpanRatio: 0.055,
    maxWidthViewBox: 70,
    minWidthViewBox: 22,
  };

export const MAP_BAKED_LANDMARK_COMMERCIAL_COUNTRYSIDE_LOT: MapBakedLandmarkPreset =
  {
    id: "commercial-countryside-lot",
    widthSpanRatio: 0.6,
    heightWidthRatio: 519 / 837,
    footOffsetSpanRatio: 0.34,
    footAnchorHeightRatio: 0.399,
    footContactSpanRatio: 0.055,
    maxWidthViewBox: 68,
    minWidthViewBox: 22,
  };

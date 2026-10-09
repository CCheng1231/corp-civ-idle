/**
 * Z1 pass-1 bake alignment — tune offsets so painted hubs match engine hex pixels.
 * Pass-2 guide PNG marks fictional hub centers; engine dots use `mapArtHubSites()`.
 */
import type { MapBounds } from "./worldMapV01";
import { MAP_PRESENTATION_HEX_SCALE } from "./mapWorld";
import {
  z1CanonicalRasterAlign,
  z1CanonicalRasterAlignV6Draft,
} from "./z1LayoutCanonical";

export interface Z1RasterAlignment {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationDeg: number;
}

/** Chris sign-off defaults (`z1-layout-canonical.json`). */
export const DEFAULT_Z1_RASTER_ALIGNMENT: Z1RasterAlignment =
  z1CanonicalRasterAlign();

/** Fitted via `npx tsx scripts/fit-z1-v6-raster-align.mjs` — canon in `z1-layout-canonical.json`. */
export const Z1_V6_DRAFT_RASTER_ALIGNMENT: Z1RasterAlignment =
  z1CanonicalRasterAlignV6Draft();

export function resolveZ1RasterAlignmentForBake(
  variant: "v5" | "v6-draft",
  partial?: Partial<Z1RasterAlignment> | null,
): Z1RasterAlignment {
  const base =
    variant === "v6-draft"
      ? Z1_V6_DRAFT_RASTER_ALIGNMENT
      : DEFAULT_Z1_RASTER_ALIGNMENT;
  if (!partial) return { ...base };
  return {
    offsetX:
      typeof partial.offsetX === "number" && Number.isFinite(partial.offsetX)
        ? partial.offsetX
        : base.offsetX,
    offsetY:
      typeof partial.offsetY === "number" && Number.isFinite(partial.offsetY)
        ? partial.offsetY
        : base.offsetY,
    scale:
      typeof partial.scale === "number" &&
      Number.isFinite(partial.scale) &&
      partial.scale > 0
        ? partial.scale
        : base.scale,
    rotationDeg:
      typeof partial.rotationDeg === "number" &&
      Number.isFinite(partial.rotationDeg)
        ? partial.rotationDeg
        : base.rotationDeg,
  };
}

export function resolveZ1RasterAlignment(
  partial?: Partial<Z1RasterAlignment> | null,
): Z1RasterAlignment {
  const base = { ...DEFAULT_Z1_RASTER_ALIGNMENT };
  if (!partial) return base;
  return {
    offsetX:
      typeof partial.offsetX === "number" && Number.isFinite(partial.offsetX)
        ? partial.offsetX
        : base.offsetX,
    offsetY:
      typeof partial.offsetY === "number" && Number.isFinite(partial.offsetY)
        ? partial.offsetY
        : base.offsetY,
    scale:
      typeof partial.scale === "number" &&
      Number.isFinite(partial.scale) &&
      partial.scale > 0
        ? partial.scale
        : base.scale,
    rotationDeg:
      typeof partial.rotationDeg === "number" &&
      Number.isFinite(partial.rotationDeg)
        ? partial.rotationDeg
        : base.rotationDeg,
  };
}

export function unionMapBounds(a: MapBounds, b: MapBounds): MapBounds {
  const minX = Math.min(a.minX, b.minX);
  const minY = Math.min(a.minY, b.minY);
  const maxX = Math.max(a.minX + a.width, b.minX + b.width);
  const maxY = Math.max(a.minY + a.height, b.minY + b.height);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Axis-aligned bounds of the Z1 bake after scale/rotate/offset (hex-sized source image). */
export function z1RasterViewBounds(
  hexBounds: MapBounds,
  align: Z1RasterAlignment,
): MapBounds {
  const { offsetX, offsetY, scale, rotationDeg } = align;
  const layout = MAP_PRESENTATION_HEX_SCALE;
  const w = hexBounds.width;
  const h = hexBounds.height;
  const cx = hexBounds.minX + w / 2;
  const cy = hexBounds.minY + h / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const halfW = (w * scale) / 2;
  const halfH = (h * scale) / 2;
  const rotHalfW = halfW * cos + halfH * sin;
  const rotHalfH = halfW * sin + halfH * cos;
  const ox = offsetX * layout;
  const oy = offsetY * layout;
  return {
    minX: cx + ox - rotHalfW,
    minY: cy + oy - rotHalfH,
    width: rotHalfW * 2,
    height: rotHalfH * 2,
  };
}

/**
 * Player SVG viewBox on Z1 — hex grid plus scaled bake bleed (v6+).
 * v5 scale≈1 keeps hex-only bounds (large align offsets are hub nudge, not extra art).
 */
export function z1PlayerViewBounds(
  hexBounds: MapBounds,
  align: Z1RasterAlignment,
): MapBounds {
  if (align.scale <= 1.02) {
    return hexBounds;
  }
  return unionMapBounds(hexBounds, z1RasterViewBounds(hexBounds, align));
}

export function z1RasterGroupTransform(
  bounds: MapBounds,
  align: Z1RasterAlignment = DEFAULT_Z1_RASTER_ALIGNMENT,
): string {
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const { offsetX, offsetY, scale, rotationDeg } = align;
  const layout = MAP_PRESENTATION_HEX_SCALE;
  return [
    `translate(${cx} ${cy})`,
    `rotate(${rotationDeg})`,
    `scale(${scale})`,
    `translate(${-bounds.width / 2} ${-bounds.height / 2})`,
    `translate(${offsetX * layout} ${offsetY * layout})`,
  ].join(" ");
}

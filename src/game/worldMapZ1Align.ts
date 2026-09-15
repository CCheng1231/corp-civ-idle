/**
 * Z1 pass-1 bake alignment — tune offsets so painted hubs match engine hex pixels.
 * Pass-2 guide PNG marks fictional hub centers; engine dots use `mapArtHubSites()`.
 */
import type { MapBounds } from "./worldMapV01";
import { z1CanonicalRasterAlign } from "./z1LayoutCanonical";

export interface Z1RasterAlignment {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationDeg: number;
}

/** Chris sign-off defaults (`z1-layout-canonical.json`). */
export const DEFAULT_Z1_RASTER_ALIGNMENT: Z1RasterAlignment =
  z1CanonicalRasterAlign();

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

export function z1RasterGroupTransform(
  bounds: MapBounds,
  align: Z1RasterAlignment = DEFAULT_Z1_RASTER_ALIGNMENT,
): string {
  const cx = bounds.minX + bounds.width / 2;
  const cy = bounds.minY + bounds.height / 2;
  const { offsetX, offsetY, scale, rotationDeg } = align;
  return [
    `translate(${cx} ${cy})`,
    `rotate(${rotationDeg})`,
    `scale(${scale})`,
    `translate(${-bounds.width / 2} ${-bounds.height / 2})`,
    `translate(${offsetX} ${offsetY})`,
  ].join(" ");
}

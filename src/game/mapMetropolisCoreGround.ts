import { MAP_GOV } from "./hexLayout";
import type { GameSettings } from "./types";
import { worldMapPresentationPixel } from "./mapDevLayout";

/** Live core ground texture (isometric-authored; gov-centered field). */
import metropolisCoreGroundTextureUrl from "../assets/reference/map/core-region-vA-iso-strong.jpg?url";

export const METROPOLIS_CORE_GROUND_TEXTURE_URL = metropolisCoreGroundTextureUrl;

export const METROPOLIS_CORE_GROUND_TEXTURE_SIZE = 1024;

/**
 * Rotate the field about Gov so iso block axes line up with landmark bake footing
 * and pointy-top hex rows (~30° dimetric, same order of magnitude as bake camera).
 */
export const METROPOLIS_CORE_GROUND_PATTERN_ROTATE_DEG = 30;

/** Pattern origin in world-map viewBox px — one field across the inner basin. */
export function metropolisCoreGroundPatternOrigin(settings: GameSettings): {
  x: number;
  y: number;
} {
  const gov = worldMapPresentationPixel(MAP_GOV, settings);
  const half = METROPOLIS_CORE_GROUND_TEXTURE_SIZE / 2;
  return { x: gov.x - half, y: gov.y - half };
}

export function metropolisCoreGroundPatternPivot(settings: GameSettings): {
  x: number;
  y: number;
} {
  return worldMapPresentationPixel(MAP_GOV, settings);
}

export function metropolisCoreGroundPatternTransform(settings: GameSettings): string {
  const { x, y } = metropolisCoreGroundPatternPivot(settings);
  const deg = METROPOLIS_CORE_GROUND_PATTERN_ROTATE_DEG;
  return `rotate(${deg} ${x} ${y})`;
}
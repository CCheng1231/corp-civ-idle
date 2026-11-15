import { MAP_GOV } from "./hexLayout";
import type { GameSettings } from "./types";
import { worldMapPresentationPixel } from "./mapDevLayout";

/** Live county ground (rural ring); gov-centered field, iso-strong. */
import countyGroundTextureUrl from "../assets/reference/map/county-iso-strong.jpg?url";

export const COUNTY_GROUND_TEXTURE_URL = countyGroundTextureUrl;

export const COUNTY_GROUND_TEXTURE_SIZE = 1024;

export const COUNTY_GROUND_PATTERN_ROTATE_DEG = 30;

export function countyGroundPatternOrigin(settings: GameSettings): {
  x: number;
  y: number;
} {
  const gov = worldMapPresentationPixel(MAP_GOV, settings);
  const half = COUNTY_GROUND_TEXTURE_SIZE / 2;
  return { x: gov.x - half, y: gov.y - half };
}

export function countyGroundPatternPivot(settings: GameSettings): {
  x: number;
  y: number;
} {
  return worldMapPresentationPixel(MAP_GOV, settings);
}

export function countyGroundPatternTransform(settings: GameSettings): string {
  const { x, y } = countyGroundPatternPivot(settings);
  const deg = COUNTY_GROUND_PATTERN_ROTATE_DEG;
  return `rotate(${deg} ${x} ${y})`;
}
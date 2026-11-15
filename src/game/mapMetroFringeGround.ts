import { MAP_GOV } from "./hexLayout";
import type { GameSettings } from "./types";
import { worldMapPresentationPixel } from "./mapDevLayout";

/** Live metro-fringe ground (suburban ring); gov-centered field, iso-strong. */
import metroFringeGroundTextureUrl from "../assets/reference/map/metro-fringe-iso-strong.jpg?url";

export const METRO_FRINGE_GROUND_TEXTURE_URL = metroFringeGroundTextureUrl;

export const METRO_FRINGE_GROUND_TEXTURE_SIZE = 1024;

export const METRO_FRINGE_GROUND_PATTERN_ROTATE_DEG = 30;

export function metroFringeGroundPatternOrigin(settings: GameSettings): {
  x: number;
  y: number;
} {
  const gov = worldMapPresentationPixel(MAP_GOV, settings);
  const half = METRO_FRINGE_GROUND_TEXTURE_SIZE / 2;
  return { x: gov.x - half, y: gov.y - half };
}

export function metroFringeGroundPatternPivot(settings: GameSettings): {
  x: number;
  y: number;
} {
  return worldMapPresentationPixel(MAP_GOV, settings);
}

export function metroFringeGroundPatternTransform(settings: GameSettings): string {
  const { x, y } = metroFringeGroundPatternPivot(settings);
  const deg = METRO_FRINGE_GROUND_PATTERN_ROTATE_DEG;
  return `rotate(${deg} ${x} ${y})`;
}
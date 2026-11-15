import { MAP_GOV } from "./hexLayout";
import type { GameSettings } from "./types";
import { worldMapPresentationPixel } from "./mapDevLayout";

/** Live greenbelt ground (countryside); gov-centered field, iso-strong. */
import greenbeltGroundTextureUrl from "../assets/reference/map/greenbelt-iso-strong.jpg?url";

export const GREENBELT_GROUND_TEXTURE_URL = greenbeltGroundTextureUrl;

export const GREENBELT_GROUND_TEXTURE_SIZE = 1024;

export const GREENBELT_GROUND_PATTERN_ROTATE_DEG = 30;

export function greenbeltGroundPatternOrigin(settings: GameSettings): {
  x: number;
  y: number;
} {
  const gov = worldMapPresentationPixel(MAP_GOV, settings);
  const half = GREENBELT_GROUND_TEXTURE_SIZE / 2;
  return { x: gov.x - half, y: gov.y - half };
}

export function greenbeltGroundPatternPivot(settings: GameSettings): {
  x: number;
  y: number;
} {
  return worldMapPresentationPixel(MAP_GOV, settings);
}

export function greenbeltGroundPatternTransform(settings: GameSettings): string {
  const { x, y } = greenbeltGroundPatternPivot(settings);
  const deg = GREENBELT_GROUND_PATTERN_ROTATE_DEG;
  return `rotate(${deg} ${x} ${y})`;
}
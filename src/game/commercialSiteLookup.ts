import { COMMERCIAL_REAL_ESTATE } from "./commercialLots";
import { effectiveLandmarkCoord } from "./mapDevLayout";
import type { AxialCoord, CommercialLotDefinition, GameSettings } from "./types";

export function commercialSiteAt(
  coord: AxialCoord,
  settings?: GameSettings,
): CommercialLotDefinition | undefined {
  return COMMERCIAL_REAL_ESTATE.find((s) => {
    const c =
      effectiveLandmarkCoord(`commercial:${s.id}`, settings) ?? s.coord;
    return c.q === coord.q && c.r === coord.r;
  });
}
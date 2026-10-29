/**
 * Canon multi-hex landmarks — enable providers here when footprint + art are ready.
 * Footprints are world geography (same for all players), not per-save builds.
 */
import {
  landmarkArtInstanceMultiHex,
  type MapLandmarkSiteProvider,
} from "./mapLandmarkInstances";

/**
 * Live multi-hex canon sites. Empty until art is baked and coords are locked.
 *
 * Example (do not enable until ready):
 *
 * export const canonMultiHexLandmarkProviders: MapLandmarkSiteProvider[] = [
 *   () => [
 *     landmarkArtInstanceMultiHex({
 *       instanceKey: "plant-example",
 *       siteId: "plant-example",
 *       artId: "unique-plant-example",
 *       footprint: [
 *         { q: 1, r: 0 },
 *         { q: 2, r: 0 },
 *         { q: 1, r: 1 },
 *       ],
 *       primaryCoord: { q: 1, r: 0 },
 *       siteKind: "unique",
 *     }),
 *   ],
 * ];
 */
export const canonMultiHexLandmarkProviders: MapLandmarkSiteProvider[] = [];

export { landmarkArtInstanceMultiHex };

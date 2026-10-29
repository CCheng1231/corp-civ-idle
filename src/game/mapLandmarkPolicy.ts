/**
 * World landmark art — product rules (canon map, visibility, cosmetics).
 *
 * - **Canon world-building:** footprints and art come from layout/canonical data,
 *   not per-player save (same geography for everyone online/offline).
 * - **Visibility (per player):** `mapShowWorldLandmarkArt` lives in each account's
 *   private save only — Tim hiding landmarks does not change Chris's map. Online
 *   sync means *your* preference follows *your* account across devices, not shared
 *   with other players.
 * - **When shown:** everyone sees the same canon art (not per-player landmark variants).
 * - **Future skins:** world landmarks stay shared. Player cosmetics (e.g. office /
 *   HQ tower skin) apply only on **that player's client** when they view their
 *   own assets — other players still see the default/canonical map presentation.
 * - **Not here:** player-placed structures use separate overlay/providers.
 */
import type { GameSettings } from "./types";

/** Default true — map Filter panel toggles `settings.mapShowWorldLandmarkArt`. */
export function playerWorldLandmarkArtVisible(
  settings?: GameSettings,
): boolean {
  return settings?.mapShowWorldLandmarkArt !== false;
}

/** Multi-hex footprints: authored in repo canon (JSON and/or providers), not GameState progression. */
export const MAP_LANDMARK_CANON_SOURCE = "layout-canonical" as const;

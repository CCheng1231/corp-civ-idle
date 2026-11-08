import type { WorldMapDevLayoutStore } from "../game/worldMapDevLayoutStore";
import type { GameSettings, GameState } from "../game/types";

/** Canon map geometry — Firestore `worlds/{id}/shared/mapLayout` only (not per-player saves). */
let latestSharedLayout: WorldMapDevLayoutStore | null = null;
let latestSharedLayoutUpdatedAt = 0;

export function setLatestSharedWorldMapLayout(
  layout: WorldMapDevLayoutStore | null,
  updatedAt: number,
): void {
  latestSharedLayout = layout;
  latestSharedLayoutUpdatedAt = updatedAt;
}

export function latestSharedWorldMapLayout(): WorldMapDevLayoutStore | null {
  return latestSharedLayout;
}

export function latestSharedWorldMapLayoutUpdatedAt(): number {
  return latestSharedLayoutUpdatedAt;
}

export const SHARED_WORLD_MAP_SETTING_KEYS = [
  "mapDevLandmarkCoords",
  "mapDevExtraHexes",
  "mapDevRegionOverrides",
  "mapDevRegionBrush",
  "mapDevOpenOffices",
  "mapDevHexNudges",
  "mapDevGridNudge",
  "mapDevSiteNudges",
  "mapZ1BakeVariant",
  "mapZ1RasterAlign",
  "mapZ1RasterAlignV6",
  "mapZ1MajorHubMarkers",
] as const satisfies readonly (keyof GameSettings)[];

type SharedWorldMapSettingKey = (typeof SHARED_WORLD_MAP_SETTING_KEYS)[number];

export function layoutSettingsPatchFromStore(
  store: WorldMapDevLayoutStore,
): Partial<GameSettings> {
  const patch: Partial<GameSettings> = {};
  for (const key of SHARED_WORLD_MAP_SETTING_KEYS) {
    const value = store[key as keyof WorldMapDevLayoutStore];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return patch;
}

export function worldMapLayoutStoreFromSettings(
  settings: GameSettings,
): WorldMapDevLayoutStore {
  return pickSharedWorldMapSettings(settings) as WorldMapDevLayoutStore;
}

export function pickSharedWorldMapSettings(
  settings: GameSettings,
): Partial<GameSettings> {
  const patch: Partial<GameSettings> = {};
  for (const key of SHARED_WORLD_MAP_SETTING_KEYS) {
    const value = settings[key as SharedWorldMapSettingKey];
    if (value !== undefined) {
      (patch as Record<string, unknown>)[key] = value;
    }
  }
  return patch;
}

export function stripSharedWorldMapSettings(
  settings: GameSettings,
): GameSettings {
  const next = { ...settings };
  for (const key of SHARED_WORLD_MAP_SETTING_KEYS) {
    delete next[key as SharedWorldMapSettingKey];
  }
  return next;
}

export function applySharedWorldMapSettings(
  settings: GameSettings,
  layout: WorldMapDevLayoutStore | null | undefined,
): GameSettings {
  const base = stripSharedWorldMapSettings(settings);
  if (!layout) return base;
  return {
    ...base,
    ...layoutSettingsPatchFromStore(layout),
  };
}

export function applySharedWorldLayoutToGameState(
  state: GameState,
  layout: WorldMapDevLayoutStore | null | undefined,
): GameState {
  const settings = applySharedWorldMapSettings(state.settings, layout);
  if (settings === state.settings) return state;
  return { ...state, settings };
}

/** Legacy per-account map toggles — must not change world terrain vs other players online. */
export function sanitizeOnlinePrivateMapClientSettings(
  settings: GameSettings,
): GameSettings {
  const next = { ...settings };
  delete next.mapZ1LayerFilters;
  if (next.mapShowWorldLandmarkArt === false) {
    delete next.mapShowWorldLandmarkArt;
  }
  return next;
}

/**
 * Online LOAD: private settings from the remote save only — never rehydrate shared
 * map fields from another player's (or legacy) private blob.
 */
export function mergeOnlineSettings(
  current: GameSettings,
  incoming: GameSettings,
): GameSettings {
  const viewportPreview =
    current.viewportPreview ?? incoming.viewportPreview ?? "auto";
  const privateOnly = sanitizeOnlinePrivateMapClientSettings(
    stripSharedWorldMapSettings(incoming),
  );
  privateOnly.viewportPreview = viewportPreview;

  const layout = latestSharedWorldMapLayout();
  if (layout) {
    return applySharedWorldMapSettings(privateOnly, layout);
  }

  return {
    ...privateOnly,
    ...pickSharedWorldMapSettings(current),
  };
}

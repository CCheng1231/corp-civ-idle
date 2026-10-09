/**
 * Shared world-map dev layout (hex moves, region paint, extra hexes).
 * Browser-local so online bootstrap / per-account Firestore saves do not wipe the playtest map.
 */
import type { GameSettings, GameState, MapRegion } from "./types";

const STORAGE_KEY = "corp-civ-idle.worldMapDevLayout";

export type WorldMapDevLayoutStore = {
  mapDevLandmarkCoords?: Record<string, { q: number; r: number }>;
  mapDevExtraHexes?: Array<{ q: number; r: number }>;
  mapDevRegionOverrides?: Record<string, MapRegion>;
  mapDevRegionBrush?: MapRegion;
};

export function readWorldMapDevLayoutStore(): WorldMapDevLayoutStore | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorldMapDevLayoutStore;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWorldMapDevLayoutStore(store: WorldMapDevLayoutStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function clearWorldMapDevLayoutStore(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function worldMapDevLayoutFromSettings(
  settings: GameSettings,
): WorldMapDevLayoutStore | null {
  const hasLandmarks =
    settings.mapDevLandmarkCoords &&
    Object.keys(settings.mapDevLandmarkCoords).length > 0;
  const hasExtra =
    settings.mapDevExtraHexes && settings.mapDevExtraHexes.length > 0;
  const hasRegions =
    settings.mapDevRegionOverrides &&
    Object.keys(settings.mapDevRegionOverrides).length > 0;
  if (!hasLandmarks && !hasExtra && !hasRegions) {
    return null;
  }
  return {
    mapDevLandmarkCoords: settings.mapDevLandmarkCoords,
    mapDevExtraHexes: settings.mapDevExtraHexes,
    mapDevRegionOverrides: settings.mapDevRegionOverrides,
    mapDevRegionBrush: settings.mapDevRegionBrush,
  };
}

export function syncWorldMapDevLayoutFromSettings(settings: GameSettings): void {
  const payload = worldMapDevLayoutFromSettings(settings);
  if (payload) {
    writeWorldMapDevLayoutStore(payload);
  } else {
    clearWorldMapDevLayoutStore();
  }
}

export function applyWorldMapDevLayoutToSettings(
  settings: GameSettings,
): GameSettings {
  const dev = readWorldMapDevLayoutStore();
  if (!dev) return settings;
  return {
    ...settings,
    ...(dev.mapDevLandmarkCoords
      ? { mapDevLandmarkCoords: dev.mapDevLandmarkCoords }
      : {}),
    ...(dev.mapDevExtraHexes ? { mapDevExtraHexes: dev.mapDevExtraHexes } : {}),
    ...(dev.mapDevRegionOverrides
      ? { mapDevRegionOverrides: dev.mapDevRegionOverrides }
      : {}),
    ...(dev.mapDevRegionBrush
      ? { mapDevRegionBrush: dev.mapDevRegionBrush }
      : {}),
  };
}

export function applyWorldMapDevLayoutToGameState(state: GameState): GameState {
  const settings = applyWorldMapDevLayoutToSettings(state.settings);
  if (settings === state.settings) return state;
  return { ...state, settings };
}

function normalizeWorldMapDevLayoutStore(
  store: WorldMapDevLayoutStore | null,
): WorldMapDevLayoutStore {
  if (!store) return {};
  return store;
}

/** True when localStorage matches the layout fields in settings (Save before Push). */
export function isWorldMapDevLayoutSavedToLocalStore(
  settings: GameSettings,
): boolean {
  const pending = worldMapDevLayoutFromSettings(settings);
  const stored = readWorldMapDevLayoutStore();
  return (
    JSON.stringify(normalizeWorldMapDevLayoutStore(pending)) ===
    JSON.stringify(normalizeWorldMapDevLayoutStore(stored))
  );
}

/** Settings snapshot to publish — uses the last Save layout, not unsaved edits. */
export function settingsFromSavedWorldMapDevLayout(
  settings: GameSettings,
): GameSettings {
  const stored = readWorldMapDevLayoutStore();
  if (!stored) {
    return {
      ...settings,
      mapDevLandmarkCoords: undefined,
      mapDevExtraHexes: undefined,
      mapDevRegionOverrides: undefined,
    };
  }
  return applyWorldMapDevLayoutToSettings(settings);
}

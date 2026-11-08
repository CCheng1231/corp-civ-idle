/**
 * Shared world-map layout payload (hex moves, regions, Z1 align, open pads).
 * Online: authoritative copy lives in Firestore — localStorage is offline-dev only.
 */
import type { GameSettings, GameState } from "./types";
import {
  SHARED_WORLD_MAP_SETTING_KEYS,
  worldMapLayoutStoreFromSettings,
} from "../multiplayer/sharedWorldMap";

const STORAGE_KEY = "corp-civ-idle.worldMapDevLayout";

export type WorldMapDevLayoutStore = Partial<
  Pick<GameSettings, (typeof SHARED_WORLD_MAP_SETTING_KEYS)[number]>
>;

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
  const store = worldMapLayoutStoreFromSettings(settings);
  if (Object.keys(store).length === 0) return null;
  return store;
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

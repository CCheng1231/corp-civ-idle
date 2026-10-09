import type { GameSettings, GameState } from "./types";
import type { Z1RasterAlignment } from "./worldMapZ1Align";

const STORAGE_KEY = "corp-civ-idle.devMapZ1Align";

export type DevMapZ1AlignStore = {
  mapZ1BakeVariant?: "v5" | "v6-draft";
  mapZ1RasterAlign?: Z1RasterAlignment;
  mapZ1RasterAlignV6?: Z1RasterAlignment;
};

export function readDevMapZ1AlignStore(): DevMapZ1AlignStore | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevMapZ1AlignStore;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDevMapZ1AlignStore(store: DevMapZ1AlignStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function devMapZ1AlignFromSettings(
  settings: GameSettings,
): DevMapZ1AlignStore | null {
  const variant = settings.mapZ1BakeVariant ?? "v5";
  const align =
    variant === "v6-draft"
      ? settings.mapZ1RasterAlignV6
      : settings.mapZ1RasterAlign;
  if (!align) return null;
  return {
    mapZ1BakeVariant: variant,
    ...(variant === "v6-draft"
      ? { mapZ1RasterAlignV6: align }
      : { mapZ1RasterAlign: align }),
  };
}

export function syncDevMapZ1AlignFromSettings(settings: GameSettings): void {
  const payload = devMapZ1AlignFromSettings(settings);
  if (payload) writeDevMapZ1AlignStore(payload);
}

export function applyDevMapZ1AlignToSettings(
  settings: GameSettings,
): GameSettings {
  const dev = readDevMapZ1AlignStore();
  if (!dev) return settings;
  return {
    ...settings,
    ...(dev.mapZ1BakeVariant
      ? { mapZ1BakeVariant: dev.mapZ1BakeVariant }
      : {}),
    ...(dev.mapZ1RasterAlign
      ? { mapZ1RasterAlign: dev.mapZ1RasterAlign }
      : {}),
    ...(dev.mapZ1RasterAlignV6
      ? { mapZ1RasterAlignV6: dev.mapZ1RasterAlignV6 }
      : {}),
  };
}

export function applyDevMapZ1AlignToGameState(state: GameState): GameState {
  const settings = applyDevMapZ1AlignToSettings(state.settings);
  if (settings === state.settings) return state;
  return { ...state, settings };
}

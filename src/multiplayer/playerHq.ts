import { MAP_HQ, officeAtCoord } from "../game/hexLayout";
import type { AxialCoord, GameState, OfficeLocationId } from "../game/types";
import type { PlayerId } from "./types";

/** Chris HQ — fixed countryside-adjacent hex, distinct from Tim. */
export const CHRIS_HQ: AxialCoord = { q: -4, r: -6 };

const HQ_BY_PLAYER: Record<PlayerId, AxialCoord> = {
  tim: MAP_HQ,
  chris: CHRIS_HQ,
};

export function playerHqCoord(playerId: PlayerId): AxialCoord {
  return HQ_BY_PLAYER[playerId];
}

export function hqCoordForState(state: GameState): AxialCoord {
  if (
    state.onlineSession?.playMode === "online" &&
    state.onlineSession.playerId
  ) {
    return playerHqCoord(state.onlineSession.playerId);
  }
  return MAP_HQ;
}

export function isOnlineMode(state: GameState): boolean {
  return state.onlineSession?.playMode === "online";
}

/** Online play disables local dev cheats and the developer map view. */
export function sanitizeOnlineDevSettings<T extends GameState["settings"]>(
  settings: T,
): T {
  return {
    ...settings,
    ignoreCosts: false,
    ignoreTimers: false,
    mapPresentation: "player",
  };
}

export function applyOnlineDevRestrictions(state: GameState): GameState {
  if (!isOnlineMode(state)) return state;
  const settings = sanitizeOnlineDevSettings(state.settings);
  if (settings === state.settings) return state;
  return { ...state, settings };
}

export function activePlayerId(state: GameState): string {
  if (state.onlineSession?.playMode === "online") {
    return state.onlineSession.playerId;
  }
  return "local";
}

export function branchContext(state: GameState) {
  return {
    established: state.branchEstablished,
    coord: state.branchCoord,
  };
}

export function officeAtForState(
  coord: AxialCoord,
  state: GameState,
): OfficeLocationId | null {
  return officeAtCoord(coord, branchContext(state), hqCoordForState(state));
}

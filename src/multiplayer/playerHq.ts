import { MAP_HQ, officeAtCoord } from "../game/hexLayout";
import type { AxialCoord, GameState, OfficeLocationId } from "../game/types";
import type { CompanyPresence, OnlineSession, PlayerId } from "./types";
import { PLAYER_IDS } from "./types";

export function resolveOnlineSession(
  state: GameState,
  session?: OnlineSession | null,
): OnlineSession | null {
  if (session?.playMode === "online") return session;
  if (state.onlineSession?.playMode === "online") return state.onlineSession;
  return null;
}

/** Chris HQ — fixed countryside-adjacent hex, distinct from Tim (must fit MAP_RADIUS). */
export const CHRIS_HQ: AxialCoord = { q: -2, r: -4 };

const HQ_BY_PLAYER: Record<PlayerId, AxialCoord> = {
  tim: MAP_HQ,
  chris: CHRIS_HQ,
};

export function playerHqCoord(playerId: PlayerId): AxialCoord {
  return HQ_BY_PLAYER[playerId];
}

export function presenceHqNeedsRepair(presence: CompanyPresence): boolean {
  const canonical = playerHqCoord(presence.playerId);
  return (
    presence.hqCoord.q !== canonical.q || presence.hqCoord.r !== canonical.r
  );
}

/** Firestore presence may carry stale HQ coords from older builds — code wins. */
export function canonicalCompanyPresence(
  presence: CompanyPresence,
): CompanyPresence {
  const hqCoord = playerHqCoord(presence.playerId);
  if (presence.hqCoord.q === hqCoord.q && presence.hqCoord.r === hqCoord.r) {
    return presence;
  }
  return { ...presence, hqCoord };
}

export function canonicalCompanyPresenceMap(
  map: Record<PlayerId, CompanyPresence>,
): Record<PlayerId, CompanyPresence> {
  const next = { ...map };
  for (const playerId of PLAYER_IDS) {
    if (next[playerId]) {
      next[playerId] = canonicalCompanyPresence(next[playerId]);
    }
  }
  return next;
}

export function hqCoordForState(
  state: GameState,
  session?: OnlineSession | null,
): AxialCoord {
  const onlineSession = resolveOnlineSession(state, session);
  if (onlineSession) {
    return playerHqCoord(onlineSession.playerId);
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
    branchSites: state.branchSites,
  };
}

export function officeAtForState(
  coord: AxialCoord,
  state: GameState,
  session?: OnlineSession | null,
): OfficeLocationId | null {
  return officeAtCoord(
    coord,
    branchContext(state),
    hqCoordForState(state, session),
  );
}

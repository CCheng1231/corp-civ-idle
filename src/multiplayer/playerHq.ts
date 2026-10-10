import { effectiveLandmarkCoord } from "../game/mapDevLayout";
import { MAP_HQ, axialEquals, officeAtCoord } from "../game/hexLayout";
import type { AxialCoord, GameState, OfficeLocationId } from "../game/types";
import {
  isDevAccount,
  PLAYER_IDS,
  type CompanyPresence,
  type OnlineSession,
  type PlayerId,
} from "./types";

export function resolveOnlineSession(
  state: GameState,
  session?: OnlineSession | null,
): OnlineSession | null {
  if (session?.playMode === "online") return session;
  if (state.onlineSession?.playMode === "online") return state.onlineSession;
  return null;
}

/** Chris HQ — fixed countryside-adjacent hex, distinct from Tim (must fit MAP_RADIUS). */
export const CHRIS_HQ: AxialCoord = { q: 4, r: -1 };

const HQ_BY_DEV: Record<PlayerId, AxialCoord> = {
  tim: MAP_HQ,
  chris: CHRIS_HQ,
};

/** Deterministic HQ hex for guest playtest accounts. */
function guestHqCoord(accountId: string): AxialCoord {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = (hash * 31 + accountId.charCodeAt(i)) | 0;
  }
  return {
    q: (hash % 5) - 2,
    r: ((hash >> 3) % 5) - 2,
  };
}

export function playerHqCoord(
  accountId: string,
  settings?: GameState["settings"],
): AxialCoord {
  if (isDevAccount(accountId)) {
    if (accountId === "tim") {
      return effectiveLandmarkCoord("hq:tim", settings) ?? HQ_BY_DEV.tim;
    }
    if (accountId === "chris") {
      return effectiveLandmarkCoord("hq:chris", settings) ?? HQ_BY_DEV.chris;
    }
    return HQ_BY_DEV[accountId];
  }
  return guestHqCoord(accountId);
}

export function presenceHqNeedsRepair(presence: CompanyPresence): boolean {
  const canonical = playerHqCoord(presence.accountId);
  return (
    presence.hqCoord.q !== canonical.q || presence.hqCoord.r !== canonical.r
  );
}

/** Firestore presence may carry stale HQ coords from older builds — code wins. */
export function canonicalCompanyPresence(
  presence: CompanyPresence,
): CompanyPresence {
  const hqCoord = playerHqCoord(presence.accountId);
  // presence repair ignores dev overrides — canonical dev hexes live in code/settings export
  if (presence.hqCoord.q === hqCoord.q && presence.hqCoord.r === hqCoord.r) {
    return presence;
  }
  return { ...presence, hqCoord };
}

export function canonicalCompanyPresenceMap(
  map: Record<string, CompanyPresence>,
): Record<string, CompanyPresence> {
  const next = { ...map };
  for (const accountId of Object.keys(next)) {
    next[accountId] = canonicalCompanyPresence(next[accountId]);
  }
  return next;
}

function sessionAccountId(
  state: GameState,
  session?: OnlineSession | null,
): string | null {
  const resolved = session ?? state.onlineSession;
  return resolved?.accountId ?? null;
}

export function hqCoordForState(
  state: GameState,
  session?: OnlineSession | null,
): AxialCoord {
  const onlineSession = resolveOnlineSession(state, session);
  if (onlineSession) {
    return playerHqCoord(onlineSession.accountId, state.settings);
  }
  const accountId = sessionAccountId(state, session);
  if (accountId && PLAYER_IDS.includes(accountId as PlayerId)) {
    return playerHqCoord(accountId, state.settings);
  }
  return effectiveLandmarkCoord("hq:tim", state.settings) ?? MAP_HQ;
}

/** Tim + Chris HQ hexes on the shared playtest map (respects dev landmark moves). */
export function authoredPlayerHqSites(
  settings?: GameState["settings"],
): { id: PlayerId; coord: AxialCoord }[] {
  return [
    {
      id: "tim",
      coord: effectiveLandmarkCoord("hq:tim", settings) ?? MAP_HQ,
    },
    {
      id: "chris",
      coord: effectiveLandmarkCoord("hq:chris", settings) ?? CHRIS_HQ,
    },
  ];
}

export function playerHqSiteAt(
  coord: AxialCoord,
  settings?: GameState["settings"],
): { id: PlayerId; coord: AxialCoord } | null {
  for (const site of authoredPlayerHqSites(settings)) {
    if (axialEquals(site.coord, coord)) return site;
  }
  return null;
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
    return state.onlineSession.accountId;
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

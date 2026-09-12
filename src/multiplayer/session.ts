import type { OnlineSession, PlayerId, PlayMode, WorldId } from "./types";
import { isValidOnlineAccountId, PLAYER_IDS } from "./types";

const SESSION_KEY = "corp-civ-idle-session";
const DEFAULT_WORLD_ID: WorldId = "dev";

function normalizeSession(raw: Partial<OnlineSession>): OnlineSession | null {
  const accountId = raw.accountId ?? (raw as { playerId?: string }).playerId;
  if (!accountId || typeof accountId !== "string") return null;
  if (raw.playMode !== "offline" && raw.playMode !== "online") return null;

  if (raw.playMode === "offline" && !PLAYER_IDS.includes(accountId as PlayerId)) {
    return null;
  }
  if (raw.playMode === "online" && !isValidOnlineAccountId(accountId)) {
    return null;
  }

  return {
    accountId,
    displayName:
      typeof raw.displayName === "string" ? raw.displayName : undefined,
    playMode: raw.playMode,
    worldId: raw.worldId === "dev" ? "dev" : DEFAULT_WORLD_ID,
  };
}

export function readSession(): OnlineSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return normalizeSession(JSON.parse(raw) as Partial<OnlineSession>);
  } catch {
    return null;
  }
}

export function writeSession(session: OnlineSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function createOfflineSession(playerId: PlayerId): OnlineSession {
  return { accountId: playerId, playMode: "offline", worldId: DEFAULT_WORLD_ID };
}

export function createOnlineSession(
  accountId: string,
  displayName?: string,
): OnlineSession {
  return {
    accountId,
    displayName,
    playMode: "online",
    worldId: DEFAULT_WORLD_ID,
  };
}

/** @deprecated Use createOfflineSession / createOnlineSession */
export function createSession(
  playerId: PlayerId,
  playMode: PlayMode,
): OnlineSession {
  return playMode === "online"
    ? createOnlineSession(playerId)
    : createOfflineSession(playerId);
}

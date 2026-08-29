import type { OnlineSession, PlayerId, PlayMode, WorldId } from "./types";
import { PLAYER_IDS } from "./types";

const SESSION_KEY = "corp-civ-idle-session";
const DEFAULT_WORLD_ID: WorldId = "dev";

export function readSession(): OnlineSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnlineSession>;
    if (!parsed.playerId || !PLAYER_IDS.includes(parsed.playerId)) return null;
    if (parsed.playMode !== "offline" && parsed.playMode !== "online") return null;
    return {
      playerId: parsed.playerId,
      playMode: parsed.playMode,
      worldId: parsed.worldId === "dev" ? "dev" : DEFAULT_WORLD_ID,
    };
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

export function createSession(
  playerId: PlayerId,
  playMode: PlayMode,
): OnlineSession {
  return { playerId, playMode, worldId: DEFAULT_WORLD_ID };
}

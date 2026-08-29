import type { GameState, JobPosting } from "../game/types";
import type { OnlineSession } from "./types";

const OFFLINE_SAVE_PREFIX = "corp-civ-idle-save-v2";
const ONLINE_CACHE_PREFIX = "corp-civ-idle-online-cache";

export function offlineSaveKey(playerId: string): string {
  return `${OFFLINE_SAVE_PREFIX}-${playerId}`;
}

export function onlineCacheKey(session: OnlineSession): string {
  return `${ONLINE_CACHE_PREFIX}-${session.worldId}-${session.playerId}`;
}

/** Fields excluded from persistence (session/ephemeral). */
function stripEphemeral(state: GameState): Partial<GameState> {
  const {
    pendingOfflineSummary: _welcome,
    pendingCompletionAlerts: _alerts,
    recruitFocusUnitId: _recruitFocus,
    logbookHighlightEntryId: _logHighlight,
    companyPresence: _presence,
    onlineConnectionStatus: _conn,
    ...persistable
  } = state;
  return persistable;
}

/** Private company blob for Firestore / local cache — no shared jobPostings. */
export function serializePrivateState(state: GameState): Record<string, unknown> {
  const stripped = stripEphemeral(state) as GameState;
  const { jobPostings: _jobs, ...privateFields } = stripped;
  return privateFields as Record<string, unknown>;
}

export function deserializePrivateState(
  raw: Record<string, unknown>,
  session: OnlineSession,
): Partial<GameState> {
  return {
    ...raw,
    onlineSession: session,
    jobPostings: [],
    companyPresence: {},
    completedPostingPayouts: Array.isArray(raw.completedPostingPayouts)
      ? (raw.completedPostingPayouts as string[])
      : [],
  } as Partial<GameState>;
}

export function parseJobPosting(data: Record<string, unknown>): JobPosting {
  return {
    id: String(data.id ?? ""),
    definitionId: String(data.definitionId ?? ""),
    towerId: data.towerId as JobPosting["towerId"],
    spawnedAt: Number(data.spawnedAt ?? 0),
    expiresAt: Number(data.expiresAt ?? 0),
    unitHoursCompleted: Number(data.unitHoursCompleted ?? 0),
    status: (data.status as JobPosting["status"]) ?? "open",
    contributors: Array.isArray(data.contributors)
      ? data.contributors.map((c) => {
          const row = c as Record<string, unknown>;
          return {
            playerId: String(row.playerId ?? ""),
            unitHours: Number(row.unitHours ?? 0),
          };
        })
      : [],
  };
}

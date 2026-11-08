import type { GameState, JobPosting } from "../game/types";
import type { OnlineSession, WorldId } from "./types";
import { PLAYER_IDS } from "./types";
import { stripSharedWorldMapSettings } from "./sharedWorldMap";
import { writeProtectedLocalSaveBlob } from "../game/saveIntegrity";

const OFFLINE_SAVE_PREFIX = "corp-civ-idle-save-v2";
const ONLINE_CACHE_PREFIX = "corp-civ-idle-online-cache";

export function offlineSaveKey(playerId: string): string {
  return `${OFFLINE_SAVE_PREFIX}-${playerId}`;
}

export function offlineSaveBackupKey(playerId: string): string {
  return `${offlineSaveKey(playerId)}-backup`;
}

export function saveBlobBackupKey(primaryKey: string): string {
  return `${primaryKey}-backup`;
}

export function onlineCacheKey(session: OnlineSession): string {
  return `${ONLINE_CACHE_PREFIX}-${session.worldId}-${session.accountId}`;
}

/** Drop browser caches for every online account in a world. */
export function clearAllOnlineLocalCaches(worldId: WorldId = "dev"): void {
  if (typeof localStorage === "undefined") return;
  for (const playerId of PLAYER_IDS) {
    clearOnlineLocalCache(playerId, worldId);
  }
}

export function clearOnlineLocalCache(
  accountId: string,
  worldId: WorldId = "dev",
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(
    onlineCacheKey({ accountId, playMode: "online", worldId }),
  );
}

/**
 * After Firestore bootstrap / pull-server / remote LOAD — replace the browser
 * cache without stale-revision guards (local cache must not block authoritative server).
 */
export function saveAuthoritativeOnlineLocalCache(
  state: GameState,
  session: OnlineSession,
): void {
  clearOnlineLocalCache(session.accountId, session.worldId);
  const blob = serializePrivateState(
    state,
    Date.now(),
    state.onlineResetGeneration ?? 0,
  );
  writeProtectedLocalSaveBlob(onlineCacheKey(session), blob, {
    rejectStale: false,
  });
}

/** Fields excluded from persistence (session/ephemeral). */
function stripEphemeral(state: GameState): Partial<GameState> {
  const {
    pendingOfflineSummary: _welcome,
    pendingCompletionAlerts: _alerts,
    recruitFocusUnitId: _recruitFocus,
    structureFocusStructureId: _structureFocus,
    researchFocusResearchId: _researchFocus,
    logbookHighlightEntryId: _logHighlight,
    jobFocusPostingId: _jobFocus,
    companyPresence: _presence,
    marketLeaderboard: _leaderboard,
    onlineConnectionStatus: _conn,
    onlineResetGeneration: _resetGen,
    onlineSession: _session,
    saveLoadFailed: _saveLoadFailed,
    ...persistable
  } = state;
  return persistable;
}

/** Firestore rejects undefined anywhere in a document. */
export function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item));
  }
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (child === undefined) continue;
    out[key] = stripUndefinedDeep(child);
  }
  return out;
}

/** Private company blob for Firestore / local cache — no shared jobPostings. */
export function serializePrivateState(
  state: GameState,
  updatedAt = Date.now(),
  resetGeneration = 0,
): Record<string, unknown> {
  const stripped = stripEphemeral(state) as GameState;
  const { jobPostings: _jobs, ...privateFields } = stripped;
  const isOnline = stripped.onlineSession?.playMode === "online";
  const settings = isOnline
    ? stripSharedWorldMapSettings(stripped.settings)
    : stripped.settings;
  const persistable = isOnline
    ? (() => {
        const {
          branchSites: _sites,
          worldBranchNameSeq: _seq,
          ...economyFields
        } = privateFields as GameState;
        return economyFields;
      })()
    : privateFields;
  return stripUndefinedDeep({
    ...persistable,
    settings,
    updatedAt,
    resetGeneration,
  }) as Record<string, unknown>;
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
    marketLeaderboard: {},
    completedPostingPayouts: Array.isArray(raw.completedPostingPayouts)
      ? (raw.completedPostingPayouts as string[])
      : [],
  } as Partial<GameState>;
}

export function parseJobPosting(data: Record<string, unknown>): JobPosting {
  return {
    id: String(data.id ?? ""),
    definitionId: String(data.definitionId ?? ""),
    towerId: (data.towerId as JobPosting["towerId"]) ?? null,
    majorHubId: (data.majorHubId as JobPosting["majorHubId"]) ?? null,
    commercialLotId:
      (data.commercialLotId as JobPosting["commercialLotId"]) ?? null,
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

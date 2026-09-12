import type { AxialCoord, JobPosting } from "../game/types";

export type PlayerId = "tim" | "chris";
export type PlayMode = "offline" | "online";
export type WorldId = "dev";

/** Offline pick tim/chris; online uses tim, chris, or guest-* from access keys. */
export type OnlineAccountId = string;

export interface OnlineSession {
  accountId: OnlineAccountId;
  displayName?: string;
  playMode: PlayMode;
  worldId: WorldId;
}

export interface CompanyPresence {
  accountId: OnlineAccountId;
  displayName: string;
  hqCoord: AxialCoord;
  branchSites: Array<{
    coord: AxialCoord;
    name: string;
  }>;
  lastSeenAt: number;
}

export interface WorldMeta {
  mapRegionSeed: number;
  jobPostingsInitialized: boolean;
  createdAt: number;
  /** When set, private saves with updatedAt before this are stale (account reset). */
  playerResetAt?: Partial<Record<OnlineAccountId, number>>;
  /** Save session id issued on reset — stale tabs cannot overwrite with old progress. */
  playerSaveSessionId?: Partial<Record<OnlineAccountId, string>>;
  /** Active browser tab lease — only one online client per account. */
  playerBrowserLease?: Partial<
    Record<
      OnlineAccountId,
      { leaseId: string; lastSeenAt: number; claimGeneration?: number }
    >
  >;
}

export interface SharedJobSnapshot {
  postings: JobPosting[];
}

export const PLAYER_IDS: PlayerId[] = ["tim", "chris"];

export const DEV_ACCOUNT_IDS: PlayerId[] = ["tim", "chris"];

export const PLAYER_LABELS: Record<PlayerId, string> = {
  tim: "Tim",
  chris: "Chris",
};

export function isDevAccount(accountId: string): accountId is PlayerId {
  return DEV_ACCOUNT_IDS.includes(accountId as PlayerId);
}

export function isValidOnlineAccountId(accountId: string): boolean {
  if (accountId === "tim" || accountId === "chris") return true;
  return /^guest-[a-z0-9-]{4,32}$/.test(accountId);
}

export function accountDisplayName(
  accountId: string,
  displayName?: string,
): string {
  if (displayName && displayName.trim().length > 0) return displayName.trim();
  if (isDevAccount(accountId)) return PLAYER_LABELS[accountId];
  return accountId;
}

export function isOnlineSession(
  session: OnlineSession | null | undefined,
): session is OnlineSession & { playMode: "online" } {
  return session?.playMode === "online";
}

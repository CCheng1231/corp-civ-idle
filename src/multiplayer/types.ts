import type { AxialCoord, JobPosting } from "../game/types";

export type PlayerId = "tim" | "chris";
export type PlayMode = "offline" | "online";
export type WorldId = "dev";

export interface OnlineSession {
  playerId: PlayerId;
  playMode: PlayMode;
  worldId: WorldId;
}

export interface CompanyPresence {
  playerId: PlayerId;
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
  playerResetAt?: Partial<Record<PlayerId, number>>;
  /** Save session id issued on reset — stale tabs cannot overwrite with old progress. */
  playerSaveSessionId?: Partial<Record<PlayerId, string>>;
  /** Active browser tab lease — only one online client per account. */
  playerBrowserLease?: Partial<
    Record<PlayerId, { leaseId: string; lastSeenAt: number; claimGeneration?: number }>
  >;
}

export interface SharedJobSnapshot {
  postings: JobPosting[];
}

export const PLAYER_IDS: PlayerId[] = ["tim", "chris"];

export const PLAYER_LABELS: Record<PlayerId, string> = {
  tim: "Tim",
  chris: "Chris",
};

export function isOnlineSession(
  session: OnlineSession | null | undefined,
): session is OnlineSession & { playMode: "online" } {
  return session?.playMode === "online";
}

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
  branchEstablished: boolean;
  branchCoord: AxialCoord | null;
  branchName: string | null;
  lastSeenAt: number;
}

export interface WorldMeta {
  mapRegionSeed: number;
  jobPostingsInitialized: boolean;
  createdAt: number;
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

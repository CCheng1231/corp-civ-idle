import { PLAYER_LABELS, isDevAccount } from "../multiplayer/types";

export function defaultPlayerBranchName(
  ownerId: string,
  seq: number,
): string {
  const label = isDevAccount(ownerId)
    ? PLAYER_LABELS[ownerId]
    : ownerId === "local"
      ? "Player"
      : ownerId;
  return `${label}'s branch ${String(seq).padStart(3, "0")}`;
}

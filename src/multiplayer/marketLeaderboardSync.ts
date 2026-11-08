import { onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { GameState } from "../game/types";
import { accountDisplayName } from "./types";
import type { MarketLeaderboardEntry, OnlineSession, WorldId } from "./types";
import { marketLeaderboardRef } from "./worldDocs";

export function parseMarketLeaderboardEntry(
  accountId: string,
  raw: unknown,
): MarketLeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id =
    typeof row.accountId === "string" && row.accountId.trim().length > 0
      ? row.accountId.trim()
      : accountId;
  return {
    accountId: id,
    displayName:
      typeof row.displayName === "string" && row.displayName.trim().length > 0
        ? row.displayName.trim()
        : accountDisplayName(id),
    netWorth:
      typeof row.netWorth === "number" && Number.isFinite(row.netWorth)
        ? Math.max(0, Math.floor(row.netWorth))
        : 0,
    lastSeenAt:
      typeof row.lastSeenAt === "number" && Number.isFinite(row.lastSeenAt)
        ? row.lastSeenAt
        : 0,
  };
}

function leaderboardFromSnapshotData(
  raw: Record<string, unknown> | undefined,
): Record<string, MarketLeaderboardEntry> {
  const accounts = raw?.accounts;
  if (!accounts || typeof accounts !== "object") return {};
  const map: Record<string, MarketLeaderboardEntry> = {};
  for (const [accountId, entry] of Object.entries(
    accounts as Record<string, unknown>,
  )) {
    const parsed = parseMarketLeaderboardEntry(accountId, entry);
    if (parsed) map[parsed.accountId] = parsed;
  }
  return map;
}

export async function upsertMarketLeaderboardEntry(
  session: OnlineSession,
  state: GameState,
): Promise<void> {
  const netWorth = Math.max(0, Math.floor(state.netWorth ?? 0));
  const now = Date.now();
  await setDoc(
    marketLeaderboardRef(session.worldId),
    {
      accounts: {
        [session.accountId]: {
          accountId: session.accountId,
          displayName: accountDisplayName(
            session.accountId,
            session.displayName,
          ),
          netWorth,
          lastSeenAt: now,
        },
      },
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function clearMarketLeaderboard(worldId: WorldId = "dev"): Promise<void> {
  await setDoc(marketLeaderboardRef(worldId), { accounts: {}, updatedAt: Date.now() });
}

export function subscribeMarketLeaderboard(
  session: OnlineSession,
  onChange: (entries: Record<string, MarketLeaderboardEntry>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    marketLeaderboardRef(session.worldId),
    (snap) => {
      onChange(
        snap.exists()
          ? leaderboardFromSnapshotData(snap.data() as Record<string, unknown>)
          : {},
      );
    },
    (err) => onError(err),
  );
}

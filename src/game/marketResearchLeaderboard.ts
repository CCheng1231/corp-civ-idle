import { formatResourceShort, WIN_NET_WORTH } from "./constants";
import { accountDisplayName, isOnlineSession } from "../multiplayer/types";
import type { GameState } from "./types";

export interface MarketResearchLeaderboardRow {
  rank: number;
  accountId: string;
  displayName: string;
  netWorth: number;
  netWorthLabel: string;
  goalProgressLabel: string;
  isSelf: boolean;
  lastSeenAt: number;
}

const PRESENCE_ACTIVE_MS = 60_000;

export function isCompanyPresenceActive(lastSeenAt: number, now = Date.now()): boolean {
  return lastSeenAt > 0 && now - lastSeenAt <= PRESENCE_ACTIVE_MS;
}

function goalProgressLabel(netWorth: number): string {
  if (WIN_NET_WORTH <= 0) return "—";
  const pct = Math.min(100, Math.floor((netWorth / WIN_NET_WORTH) * 100));
  return `${pct}% of $100M goal`;
}

export function buildMarketResearchLeaderboard(
  state: GameState,
  now = Date.now(),
): MarketResearchLeaderboardRow[] {
  const session = state.onlineSession;
  const selfId =
    session && isOnlineSession(session) ? session.accountId : session?.accountId;
  const leaderboard = state.marketLeaderboard ?? {};
  const presence = state.companyPresence ?? {};
  const byAccount = new Map<string, MarketResearchLeaderboardRow>();

  const sources = [
    ...Object.values(leaderboard),
    ...Object.values(presence).map((entry) => ({
      accountId: entry.accountId,
      displayName: entry.displayName,
      netWorth: entry.netWorth ?? 0,
      lastSeenAt: entry.lastSeenAt ?? 0,
    })),
  ];

  for (const entry of sources) {
    const accountId = entry.accountId;
    if (!accountId) continue;
    const existing = byAccount.get(accountId);
    const netWorthFromEntry = entry.netWorth ?? 0;
    const netWorth =
      selfId && accountId === selfId
        ? Math.max(netWorthFromEntry, state.netWorth ?? 0)
        : netWorthFromEntry;
    const lastSeenAt = Math.max(existing?.lastSeenAt ?? 0, entry.lastSeenAt ?? 0);
    const displayName =
      entry.displayName ||
      presence[accountId]?.displayName ||
      leaderboard[accountId]?.displayName ||
      accountDisplayName(accountId, session?.displayName);

    if (
      !existing ||
      netWorth > existing.netWorth ||
      lastSeenAt > existing.lastSeenAt
    ) {
      byAccount.set(accountId, {
        rank: 0,
        accountId,
        displayName,
        netWorth,
        netWorthLabel: formatResourceShort(netWorth),
        goalProgressLabel: goalProgressLabel(netWorth),
        isSelf: selfId === accountId,
        lastSeenAt,
      });
    }
  }

  if (selfId && !byAccount.has(selfId)) {
    const netWorth = Math.max(0, Math.floor(state.netWorth ?? 0));
    byAccount.set(selfId, {
      rank: 0,
      accountId: selfId,
      displayName: accountDisplayName(selfId, session?.displayName),
      netWorth,
      netWorthLabel: formatResourceShort(netWorth),
      goalProgressLabel: goalProgressLabel(netWorth),
      isSelf: true,
      lastSeenAt: now,
    });
  }

  if (byAccount.size === 0 && session) {
    const netWorth = Math.max(0, Math.floor(state.netWorth ?? 0));
    byAccount.set(session.accountId, {
      rank: 1,
      accountId: session.accountId,
      displayName: accountDisplayName(session.accountId, session.displayName),
      netWorth,
      netWorthLabel: formatResourceShort(netWorth),
      goalProgressLabel: goalProgressLabel(netWorth),
      isSelf: true,
      lastSeenAt: now,
    });
  }

  const sorted = [...byAccount.values()].sort((a, b) => {
    if (b.netWorth !== a.netWorth) return b.netWorth - a.netWorth;
    return a.displayName.localeCompare(b.displayName);
  });

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function marketResearchOnlineReady(state: GameState): boolean {
  const session = state.onlineSession;
  return (
    isOnlineSession(session) &&
    session.playMode === "online" &&
    state.onlineConnectionStatus === "connected"
  );
}

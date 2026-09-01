import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "./firebase";
import type { OnlineSession, PlayerId, WorldId, WorldMeta } from "./types";

const LEASE_STORAGE_PREFIX = "corp-civ-idle-browser-lease";

export interface PlayerBrowserLease {
  leaseId: string;
  lastSeenAt: number;
  claimGeneration: number;
}

function leaseStorageKey(session: OnlineSession): string {
  return `${LEASE_STORAGE_PREFIX}-${session.worldId}-${session.playerId}`;
}

function claimGenStorageKey(session: OnlineSession): string {
  return `${LEASE_STORAGE_PREFIX}-gen-${session.worldId}-${session.playerId}`;
}

function metaRef(worldId: WorldId) {
  return doc(getDb(), "worlds", worldId, "meta", "world");
}

function newLeaseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Stable per browser tab — survives refresh, unique across tabs/windows. */
export function getOrCreateBrowserLeaseId(session: OnlineSession): string {
  const key = leaseStorageKey(session);
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const created = newLeaseId();
    sessionStorage.setItem(key, created);
    return created;
  } catch {
    return newLeaseId();
  }
}

export function clearBrowserLeaseId(session: OnlineSession): void {
  try {
    sessionStorage.removeItem(leaseStorageKey(session));
    sessionStorage.removeItem(claimGenStorageKey(session));
  } catch {
    /* ignore */
  }
}

function bumpClaimGeneration(session: OnlineSession): number {
  const key = claimGenStorageKey(session);
  try {
    const prev = Number(sessionStorage.getItem(key) ?? 0);
    const next = prev + 1;
    sessionStorage.setItem(key, String(next));
    return next;
  } catch {
    return Date.now();
  }
}

export function readPlayerBrowserLease(
  meta: WorldMeta | undefined,
  playerId: PlayerId,
): PlayerBrowserLease | undefined {
  const lease = meta?.playerBrowserLease?.[playerId];
  if (
    !lease ||
    typeof lease.leaseId !== "string" ||
    lease.leaseId.length === 0
  ) {
    return undefined;
  }
  return {
    leaseId: lease.leaseId,
    lastSeenAt: Number(lease.lastSeenAt ?? 0),
    claimGeneration: Number(lease.claimGeneration ?? 0),
  };
}

function stillHoldsLease(
  held: PlayerBrowserLease | undefined,
  leaseId: string,
  claimGeneration: number,
): boolean {
  if (!held || held.leaseId !== leaseId) return false;
  if (held.claimGeneration === 0) return true;
  return held.claimGeneration === claimGeneration;
}

function supersededByOtherClient(
  held: PlayerBrowserLease | undefined,
  leaseId: string,
  claimGeneration: number,
): boolean {
  if (!held?.leaseId) return false;
  if (held.leaseId !== leaseId) return true;
  if (held.claimGeneration === 0) return false;
  return held.claimGeneration !== claimGeneration;
}

/** Take the active browser lease for this account (kicks other tabs). */
export async function claimBrowserLease(
  session: OnlineSession,
  leaseId: string,
): Promise<number> {
  const claimGeneration = bumpClaimGeneration(session);
  const now = Date.now();
  await setDoc(
    metaRef(session.worldId),
    {
      playerBrowserLease: {
        [session.playerId]: { leaseId, lastSeenAt: now, claimGeneration },
      },
    },
    { merge: true },
  );
  return claimGeneration;
}

/** Keep lease alive while this tab remains authoritative. */
export async function heartbeatBrowserLease(
  session: OnlineSession,
  leaseId: string,
  claimGeneration: number,
): Promise<boolean> {
  const ref = metaRef(session.worldId);
  return runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(ref);
    const meta = snap.exists() ? (snap.data() as WorldMeta) : undefined;
    const held = readPlayerBrowserLease(meta, session.playerId);
    if (!stillHoldsLease(held, leaseId, claimGeneration)) return false;
    tx.set(
      ref,
      {
        playerBrowserLease: {
          [session.playerId]: {
            leaseId,
            lastSeenAt: Date.now(),
            claimGeneration,
          },
        },
      },
      { merge: true },
    );
    return true;
  });
}

/**
 * After a failed heartbeat, reclaim if the lease was vacated (e.g. stale release).
 * Returns true only when another client actively holds the lease.
 */
export async function tryRecoverVacantBrowserLease(
  session: OnlineSession,
  leaseId: string,
  claimGeneration: number,
): Promise<"held" | "recovered" | "lost"> {
  const ref = metaRef(session.worldId);
  const snap = await getDoc(ref);
  const meta = snap.exists() ? (snap.data() as WorldMeta) : undefined;
  const held = readPlayerBrowserLease(meta, session.playerId);

  if (stillHoldsLease(held, leaseId, claimGeneration)) return "held";
  if (supersededByOtherClient(held, leaseId, claimGeneration)) return "lost";

  await setDoc(
    ref,
    {
      playerBrowserLease: {
        [session.playerId]: {
          leaseId,
          lastSeenAt: Date.now(),
          claimGeneration,
        },
      },
    },
    { merge: true },
  );
  return "recovered";
}

/** Release lease when tab closes (only if this claim generation still holds it). */
export async function releaseBrowserLease(
  session: OnlineSession,
  leaseId: string,
  claimGeneration: number,
): Promise<void> {
  const ref = metaRef(session.worldId);
  try {
    await runTransaction(getDb(), async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const meta = snap.data() as WorldMeta;
      const held = readPlayerBrowserLease(meta, session.playerId);
      if (!stillHoldsLease(held, leaseId, claimGeneration)) return;
      tx.set(
        ref,
        {
          playerBrowserLease: {
            [session.playerId]: { leaseId: "", lastSeenAt: 0, claimGeneration: 0 },
          },
        },
        { merge: true },
      );
    });
  } catch {
    /* tab may be unloading */
  }
}

export function subscribeBrowserLease(
  session: OnlineSession,
  leaseId: string,
  claimGeneration: number,
  onSuperseded: () => void,
): Unsubscribe {
  return onSnapshot(metaRef(session.worldId), (snap) => {
    const meta = snap.exists() ? (snap.data() as WorldMeta) : undefined;
    const held = readPlayerBrowserLease(meta, session.playerId);
    if (supersededByOtherClient(held, leaseId, claimGeneration)) {
      onSuperseded();
    }
  });
}

export const ONLINE_KICKED_MESSAGE =
  "You logged in elsewhere. This tab was returned to account selection so only one browser stays connected per online account.";

import {
  deleteDoc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { GameState } from "../game/types";
import { createFreshOnlineState, loadOnlineStateFromRemote } from "../game/save";
import { clearOnlineLocalCache, serializePrivateState } from "./companySave";
import { getDb } from "./firebase";
import type { OnlineSession, WorldId, WorldMeta } from "./types";
import {
  assignPlayerSaveSessionId,
  loadWorldMeta,
  playerResetTimestamp,
  playerSaveSessionId
} from "./worldMeta";
import { metaRef, privateStateRef, WORLD_ID } from "./worldDocs";

const STALE_TAB_CASH_THRESHOLD = 12_000;

function remoteSaveCash(remote: Record<string, unknown>): number {
  const resources = remote.resources as { cash?: number } | undefined;
  return Number(resources?.cash ?? 0);
}

/** Ensure in-memory state can pass save guards after bootstrap/load. */
export function authorizeOnlineSaveState(
  state: GameState,
  resetAt: number,
  sessionId?: string,
): GameState {
  return {
    ...state,
    onlineResetGeneration: Math.max(state.onlineResetGeneration ?? 0, resetAt),
    ...(sessionId ? { onlineSaveSessionId: sessionId } : {})
};
}

export function isPrivateStateStale(
  remote: Record<string, unknown> | null,
  resetAt: number,
  expectedSessionId?: string,
): boolean {
  if (resetAt <= 0) return false;
  if (!remote) return true;

  const updatedAt = Number(remote.updatedAt ?? 0);
  const generation = Number(remote.resetGeneration ?? 0);

  // Save entirely predates the last account reset.
  if (updatedAt < resetAt && generation < resetAt) {
    return true;
  }

  // Stale tab re-uploaded old wealth under a superseded session id.
  if (expectedSessionId) {
    const remoteSessionId = remote.onlineSaveSessionId;
    if (
      typeof remoteSessionId === "string" &&
      remoteSessionId !== expectedSessionId &&
      updatedAt >= resetAt &&
      remoteSaveCash(remote) >= STALE_TAB_CASH_THRESHOLD
    ) {
      return true;
    }
  }

  return false;
}

/** Backfill auth fields on saves written after reset before generation/session was wired. */
export async function patchRemoteSaveAuthFields(
  session: OnlineSession,
  remote: Record<string, unknown>,
  resetAt: number,
  expectedSessionId?: string,
): Promise<Record<string, unknown>> {
  const updatedAt = Number(remote.updatedAt ?? 0);
  if (resetAt > 0 && updatedAt < resetAt) return remote;

  const patches: Record<string, unknown> = {};
  let next = remote;

  if (resetAt > 0 && Number(next.resetGeneration ?? 0) < resetAt) {
    patches.resetGeneration = resetAt;
    next = { ...next, resetGeneration: resetAt };
  }

  if (expectedSessionId) {
    const remoteSessionId = next.onlineSaveSessionId;
    const sessionMismatch =
      typeof remoteSessionId === "string" &&
      remoteSessionId !== expectedSessionId;
    if (
      typeof remoteSessionId !== "string" ||
      (sessionMismatch && remoteSaveCash(next) < STALE_TAB_CASH_THRESHOLD)
    ) {
      patches.onlineSaveSessionId = expectedSessionId;
      next = { ...next, onlineSaveSessionId: expectedSessionId };
    }
  }

  if (Object.keys(patches).length > 0) {
    await setDoc(
      privateStateRef(session.accountId, session.worldId),
      patches,
      { merge: true },
    );
  }

  return next;
}

export class OnlineSaveRejectedError extends Error {
  readonly requiredGeneration: number;

  constructor(requiredGeneration: number) {
    super("Online save rejected: account was reset on the server");
    this.name = "OnlineSaveRejectedError";
    this.requiredGeneration = requiredGeneration;
  }
}

export async function writeFreshPrivateState(
  session: OnlineSession,
  accountId: string,
  resetAt: number,
  saveSessionId: string,
): Promise<void> {
  const playerSession: OnlineSession = { ...session, accountId };
  await setDoc(
    privateStateRef(accountId, session.worldId),
    serializePrivateState(
      createFreshOnlineState(playerSession, resetAt, saveSessionId),
      resetAt,
      resetAt,
    ),
  );
}

export function remoteResetGeneration(
  remote: Record<string, unknown>,
): number {
  return Number(remote.resetGeneration ?? 0);
}

/** Load remote save or rewrite Firestore when it predates playerResetAt. */
export async function repairPrivateStateIfStale(
  session: OnlineSession,
  resetAt: number,
  expectedSessionId?: string,
): Promise<GameState> {
  const meta = await loadWorldMeta(session);
  const sessionId =
    expectedSessionId ?? playerSaveSessionId(meta, session.accountId);
  let remote = await loadPrivateState(session);
  if (!remote) {
    clearOnlineLocalCache(session.accountId, session.worldId);
    if (resetAt > 0) {
      const saveSessionId =
        sessionId ??
        (await assignPlayerSaveSessionId(session.worldId, session.accountId));
      await writeFreshPrivateState(
        session,
        session.accountId,
        resetAt,
        saveSessionId,
      );
      return createFreshOnlineState(session, resetAt, saveSessionId);
    }
    return createFreshOnlineState(session, resetAt);
  }

  if (sessionId) {
    remote = await patchRemoteSaveAuthFields(
      session,
      remote,
      resetAt,
      sessionId,
    );
  }

  if (isPrivateStateStale(remote, resetAt, sessionId)) {
    clearOnlineLocalCache(session.accountId, session.worldId);
    if (resetAt > 0) {
      const saveSessionId =
        sessionId ??
        (await assignPlayerSaveSessionId(session.worldId, session.accountId));
      await writeFreshPrivateState(
        session,
        session.accountId,
        resetAt,
        saveSessionId,
      );
      return createFreshOnlineState(session, resetAt, saveSessionId);
    }
    return createFreshOnlineState(session, resetAt);
  }

  const generation = Math.max(Number(remote.resetGeneration ?? 0), resetAt);
  const patches: Record<string, unknown> = {};
  if (generation > Number(remote.resetGeneration ?? 0)) {
    patches.resetGeneration = generation;
    remote.resetGeneration = generation;
  }
  if (Object.keys(patches).length > 0) {
    await setDoc(
      privateStateRef(session.accountId, session.worldId),
      patches,
      { merge: true },
    );
  }

  return loadOnlineStateFromRemote(session, remote, resetAt, sessionId);
}

/** Dev / recovery: pull authoritative save from Firestore (respects playerResetAt). */
export async function forceResyncPrivateState(
  session: OnlineSession,
): Promise<GameState> {
  const meta = await loadWorldMeta(session);
  const resetAt = playerResetTimestamp(meta, session.accountId);
  return repairPrivateStateIfStale(
    session,
    resetAt,
    playerSaveSessionId(meta, session.accountId),
  );
}

export async function loadPrivateState(
  session: OnlineSession,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(privateStateRef(session.accountId, session.worldId));
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

export async function savePrivateState(
  session: OnlineSession,
  state: GameState,
  updatedAt = Date.now(),
): Promise<{ updatedAt: number; generation: number }> {
  const ref = privateStateRef(session.accountId, session.worldId);
  const metaRefDoc = metaRef(session.worldId);

  return runTransaction(getDb(), async (tx) => {
    const metaSnap = await tx.get(metaRefDoc);
    const meta = metaSnap.exists() ? (metaSnap.data() as WorldMeta) : undefined;
    const requiredGeneration = playerResetTimestamp(meta, session.accountId);
    const expectedSessionId = playerSaveSessionId(meta, session.accountId);
    const localGeneration = state.onlineResetGeneration ?? 0;
    let localSessionId = state.onlineSaveSessionId;

    if (requiredGeneration > 0 && localGeneration < requiredGeneration) {
      throw new OnlineSaveRejectedError(requiredGeneration);
    }

    if (expectedSessionId) {
      if (!localSessionId) {
        localSessionId = expectedSessionId;
      } else if (localSessionId !== expectedSessionId) {
        throw new OnlineSaveRejectedError(requiredGeneration);
      }
      const remoteSnap = await tx.get(ref);
      if (remoteSnap.exists()) {
        const remote = remoteSnap.data() as Record<string, unknown>;
        const remoteSessionId = remote.onlineSaveSessionId;
        if (
          typeof remoteSessionId === "string" &&
          remoteSessionId !== expectedSessionId
        ) {
          throw new OnlineSaveRejectedError(requiredGeneration);
        }
      }
    }

    const generation = Math.max(localGeneration, requiredGeneration);
    const payload = serializePrivateState(
      expectedSessionId && !state.onlineSaveSessionId
        ? { ...state, onlineSaveSessionId: expectedSessionId }
        : state,
      updatedAt,
      generation,
    );
    tx.set(ref, payload);
    return { updatedAt, generation };
  });
}

export function subscribePrivateState(
  session: OnlineSession,
  onChange: (data: Record<string, unknown> | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    privateStateRef(session.accountId, session.worldId),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    },
    (err) => onError(err),
  );
}

export async function deletePrivateStateDoc(
  accountId: string,
  worldId: WorldId = WORLD_ID,
): Promise<void> {
  await deleteDoc(privateStateRef(accountId, worldId));
}

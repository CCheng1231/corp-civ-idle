import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  deleteDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { MAP_REGION_SEED, branchSiteCoord } from "../game/mapWorld";
import {
  createPostingFromDefinition,
  initializeJobPostings,
  jobDefinitionById,
} from "../game/jobs";
import type { JobPosting } from "../game/types";
import { createFreshOnlineState, loadOnlineStateFromRemote } from "../game/save";
import { parseJobPosting, serializePrivateState, clearAllOnlineLocalCaches, clearOnlineLocalCache } from "./companySave";
import { getDb } from "./firebase";
import { playerHqCoord, canonicalCompanyPresenceMap, canonicalCompanyPresence, presenceHqNeedsRepair } from "./playerHq";
import type {
  CompanyPresence,
  OnlineSession,
  PlayerId,
  WorldId,
  WorldMeta,
} from "./types";
import { PLAYER_LABELS } from "./types";
import { PLAYER_IDS } from "./types";
import type { GameState, AxialCoord } from "../game/types";

const WORLD_ID: WorldId = "dev";

export function playerResetTimestamp(
  meta: WorldMeta | undefined,
  playerId: PlayerId,
): number {
  return meta?.playerResetAt?.[playerId] ?? 0;
}

export function playerSaveSessionId(
  meta: WorldMeta | undefined,
  playerId: PlayerId,
): string | undefined {
  const id = meta?.playerSaveSessionId?.[playerId];
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function newSaveSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
    ...(sessionId ? { onlineSaveSessionId: sessionId } : {}),
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
      privateStateRef(session.playerId, session.worldId),
      patches,
      { merge: true },
    );
  }

  return next;
}

/** @deprecated Use patchRemoteSaveAuthFields */
export async function ensureRemoteSaveSessionId(
  session: OnlineSession,
  remote: Record<string, unknown>,
  resetAt: number,
  expectedSessionId: string,
): Promise<Record<string, unknown>> {
  return patchRemoteSaveAuthFields(
    session,
    remote,
    resetAt,
    expectedSessionId,
  );
}

export class OnlineSaveRejectedError extends Error {
  readonly requiredGeneration: number;

  constructor(requiredGeneration: number) {
    super("Online save rejected: account was reset on the server");
    this.name = "OnlineSaveRejectedError";
    this.requiredGeneration = requiredGeneration;
  }
}

async function assignPlayerSaveSessionId(
  worldId: WorldId,
  playerId: PlayerId,
  saveSessionId = newSaveSessionId(),
): Promise<string> {
  await setDoc(
    metaRef(worldId),
    { playerSaveSessionId: { [playerId]: saveSessionId } },
    { merge: true },
  );
  return saveSessionId;
}

async function bumpPlayerResetAt(
  worldId: WorldId,
  playerId: PlayerId,
  resetAt = Date.now(),
): Promise<{ resetAt: number; saveSessionId: string }> {
  const saveSessionId = newSaveSessionId();
  await setDoc(
    metaRef(worldId),
    {
      playerResetAt: { [playerId]: resetAt },
      playerSaveSessionId: { [playerId]: saveSessionId },
    },
    { merge: true },
  );
  return { resetAt, saveSessionId };
}

async function writeFreshPrivateState(
  session: OnlineSession,
  playerId: PlayerId,
  resetAt: number,
  saveSessionId: string,
): Promise<void> {
  const playerSession: OnlineSession = { ...session, playerId };
  await setDoc(
    privateStateRef(playerId, session.worldId),
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
    expectedSessionId ?? playerSaveSessionId(meta, session.playerId);
  let remote = await loadPrivateState(session);
  if (!remote) {
    clearOnlineLocalCache(session.playerId, session.worldId);
    if (resetAt > 0) {
      const saveSessionId =
        sessionId ??
        (await assignPlayerSaveSessionId(session.worldId, session.playerId));
      await writeFreshPrivateState(
        session,
        session.playerId,
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
    clearOnlineLocalCache(session.playerId, session.worldId);
    if (resetAt > 0) {
      const saveSessionId =
        sessionId ??
        (await assignPlayerSaveSessionId(session.worldId, session.playerId));
      await writeFreshPrivateState(
        session,
        session.playerId,
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
      privateStateRef(session.playerId, session.worldId),
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
  const resetAt = playerResetTimestamp(meta, session.playerId);
  return repairPrivateStateIfStale(
    session,
    resetAt,
    playerSaveSessionId(meta, session.playerId),
  );
}

export async function loadWorldMeta(
  session: OnlineSession,
): Promise<WorldMeta> {
  const snap = await getDoc(metaRef(session.worldId));
  if (!snap.exists()) {
    return {
      mapRegionSeed: MAP_REGION_SEED,
      jobPostingsInitialized: false,
      createdAt: Date.now(),
    };
  }
  return snap.data() as WorldMeta;
}

function worldRoot(worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId);
}

function metaRef(worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId, "meta", "world");
}

function jobPostingsCol(worldId: WorldId = WORLD_ID) {
  return collection(getDb(), "worlds", worldId, "jobPostings");
}

function companyRef(playerId: PlayerId, worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId, "companies", playerId);
}

function privateStateRef(playerId: PlayerId, worldId: WorldId = WORLD_ID) {
  return doc(getDb(), "worlds", worldId, "companies", playerId, "private", "state");
}

function companiesCol(worldId: WorldId = WORLD_ID) {
  return collection(getDb(), "worlds", worldId, "companies");
}

export function presenceFromState(
  session: OnlineSession,
  state: GameState,
): CompanyPresence {
  return {
    playerId: session.playerId,
    displayName: PLAYER_LABELS[session.playerId],
    hqCoord: playerHqCoord(session.playerId),
    branchSites: state.branchSites.map((site) => ({
      coord: branchSiteCoord(site),
      name: site.name,
    })),
    lastSeenAt: Date.now(),
  };
}

function parseAxialCoord(raw: unknown): AxialCoord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const q = Number(row.q);
  const r = Number(row.r);
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}

export function parseCompanyPresence(
  docId: string,
  raw: Record<string, unknown>,
): CompanyPresence | null {
  const playerId =
    raw.playerId === "tim" || raw.playerId === "chris"
      ? raw.playerId
      : docId === "tim" || docId === "chris"
        ? docId
        : null;
  if (!playerId) return null;

  const hqCoord = parseAxialCoord(raw.hqCoord) ?? { q: 0, r: 0 };
  const branchSites = Array.isArray(raw.branchSites)
    ? raw.branchSites.flatMap((entry) => {
        const row = entry as Record<string, unknown>;
        const coord = parseAxialCoord(row.coord);
        if (!coord) return [];
        return [
          {
            coord,
            name: typeof row.name === "string" ? row.name : "",
          },
        ];
      })
    : [];

  return {
    playerId,
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : PLAYER_LABELS[playerId],
    hqCoord,
    branchSites,
    lastSeenAt: Number(raw.lastSeenAt ?? 0),
  };
}

export async function repairCompanyPresenceDoc(
  playerId: PlayerId,
  worldId: WorldId,
  presence: CompanyPresence,
): Promise<void> {
  if (!presenceHqNeedsRepair(presence)) return;
  await setDoc(
    companyRef(playerId, worldId),
    canonicalCompanyPresence(presence),
  );
}

/** Rewrite any stale HQ coords in Firestore (dev world). */
export async function repairStaleCompanyPresences(
  worldId: WorldId = WORLD_ID,
): Promise<void> {
  const snap = await getDocs(companiesCol(worldId));
  await Promise.all(
    snap.docs.map(async (d) => {
      const parsed = parseCompanyPresence(d.id, d.data() as Record<string, unknown>);
      if (!parsed) return;
      await repairCompanyPresenceDoc(parsed.playerId, worldId, parsed);
    }),
  );
}

export async function ensureWorldBootstrapped(
  session: OnlineSession,
): Promise<WorldMeta> {
  const metaDoc = metaRef(session.worldId);
  const existing = await getDoc(metaDoc);
  if (existing.exists()) {
    return existing.data() as WorldMeta;
  }

  const meta: WorldMeta = {
    mapRegionSeed: MAP_REGION_SEED,
    jobPostingsInitialized: false,
    createdAt: Date.now(),
  };
  await setDoc(metaDoc, meta);
  await setDoc(worldRoot(session.worldId), { id: session.worldId });
  return meta;
}

export async function seedSharedJobPostingsIfNeeded(
  session: OnlineSession,
): Promise<void> {
  const metaDoc = metaRef(session.worldId);
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(metaDoc);
    const meta = snap.data() as WorldMeta | undefined;
    if (meta?.jobPostingsInitialized) return;

    const now = Date.now();
    const postings = initializeJobPostings(now);
    for (const posting of postings) {
      const ref = doc(jobPostingsCol(session.worldId), posting.id);
      tx.set(ref, posting);
    }
    tx.set(
      metaDoc,
      {
        mapRegionSeed: MAP_REGION_SEED,
        jobPostingsInitialized: true,
        createdAt: meta?.createdAt ?? now,
      },
      { merge: true },
    );
  });
}

export async function loadPrivateState(
  session: OnlineSession,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(privateStateRef(session.playerId, session.worldId));
  if (!snap.exists()) return null;
  return snap.data() as Record<string, unknown>;
}

export async function savePrivateState(
  session: OnlineSession,
  state: GameState,
  updatedAt = Date.now(),
): Promise<{ updatedAt: number; generation: number }> {
  const ref = privateStateRef(session.playerId, session.worldId);
  const metaRefDoc = metaRef(session.worldId);

  return runTransaction(getDb(), async (tx) => {
    const metaSnap = await tx.get(metaRefDoc);
    const meta = metaSnap.exists() ? (metaSnap.data() as WorldMeta) : undefined;
    const requiredGeneration = playerResetTimestamp(meta, session.playerId);
    const expectedSessionId = playerSaveSessionId(meta, session.playerId);
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

export async function upsertCompanyPresence(
  session: OnlineSession,
  state: GameState,
): Promise<void> {
  await setDoc(
    companyRef(session.playerId, session.worldId),
    presenceFromState(session, state),
  );
}

export function subscribeJobPostings(
  session: OnlineSession,
  onChange: (postings: JobPosting[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    jobPostingsCol(session.worldId),
    (snap) => {
      const postings = snap.docs
        .map((d) => parseJobPosting(d.data() as Record<string, unknown>))
        .sort((a, b) => a.spawnedAt - b.spawnedAt);
      onChange(postings);
    },
    (err) => onError(err),
  );
}

export function subscribeCompanies(
  session: OnlineSession,
  onChange: (presence: Record<PlayerId, CompanyPresence>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    companiesCol(session.worldId),
    (snap) => {
      const map = {} as Record<PlayerId, CompanyPresence>;
      for (const d of snap.docs) {
        const parsed = parseCompanyPresence(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (!parsed) continue;
        map[parsed.playerId] = parsed;
        if (presenceHqNeedsRepair(parsed)) {
          void repairCompanyPresenceDoc(
            parsed.playerId,
            session.worldId,
            parsed,
          ).catch((err) =>
            console.error("Repair company presence failed", err),
          );
        }
      }
      onChange(canonicalCompanyPresenceMap(map));
    },
    (err) => onError(err),
  );
}

export function subscribePrivateState(
  session: OnlineSession,
  onChange: (data: Record<string, unknown> | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    privateStateRef(session.playerId, session.worldId),
    (snap) => {
      onChange(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
    },
    (err) => onError(err),
  );
}

export async function flushPostingWorkDelta(
  session: OnlineSession,
  postingId: string,
  playerId: string,
  deltaHours: number,
): Promise<JobPosting | null> {
  if (deltaHours <= 0) return null;
  const postingRef = doc(jobPostingsCol(session.worldId), postingId);

  return runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(postingRef);
    if (!snap.exists()) return null;
    const posting = parseJobPosting(snap.data() as Record<string, unknown>);
    if (posting.status !== "open") return posting;

    const def = jobDefinitionById(posting.definitionId);
    const remaining = Math.max(0, def.unitHoursTotal - posting.unitHoursCompleted);
    const effective = Math.min(deltaHours, remaining);
    if (effective <= 0) return posting;

    const contributors = [...posting.contributors];
    const existing = contributors.find((c) => c.playerId === playerId);
    if (existing) {
      existing.unitHours += effective;
    } else {
      contributors.push({ playerId, unitHours: effective });
    }

    const next: JobPosting = {
      ...posting,
      unitHoursCompleted: posting.unitHoursCompleted + effective,
      contributors,
    };
    if (next.unitHoursCompleted >= def.unitHoursTotal) {
      next.status = "completed";
    }
    tx.set(postingRef, next);
    return next;
  });
}

export async function respawnSharedPosting(
  session: OnlineSession,
  definitionId: string,
  now: number,
): Promise<void> {
  const def = jobDefinitionById(definitionId);
  const posting = createPostingFromDefinition(def, now);
  await setDoc(doc(jobPostingsCol(session.worldId), posting.id), posting);
}

export async function resetSharedWorld(
  session: OnlineSession,
): Promise<void> {
  const col = jobPostingsCol(session.worldId);
  const existing = await getDocs(col);
  const refs = existing.docs.map((d) => d.ref);
  const BATCH_LIMIT = 450;
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(getDb());
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) {
      batch.delete(ref);
    }
    await batch.commit();
  }

  await setDoc(
    metaRef(session.worldId),
    {
      mapRegionSeed: MAP_REGION_SEED,
      jobPostingsInitialized: false,
      createdAt: Date.now(),
    },
    { merge: true },
  );

  await seedSharedJobPostingsIfNeeded(session);
}

/** Remove a completed/expired posting doc and optionally spawn replacement. */
export async function replaceClosedPosting(
  session: OnlineSession,
  closedPostingId: string,
  definitionId: string,
  now: number,
): Promise<void> {
  const batch = writeBatch(getDb());
  batch.delete(doc(jobPostingsCol(session.worldId), closedPostingId));
  const next = createPostingFromDefinition(jobDefinitionById(definitionId), now);
  batch.set(doc(jobPostingsCol(session.worldId), next.id), next);
  await batch.commit();
}

export async function expireSharedPosting(
  session: OnlineSession,
  postingId: string,
): Promise<void> {
  const postingRef = doc(jobPostingsCol(session.worldId), postingId);
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(postingRef);
    if (!snap.exists()) return;
    const posting = parseJobPosting(snap.data() as Record<string, unknown>);
    if (posting.status !== "open") return;
    tx.set(postingRef, { ...posting, status: "expired" });
  });
}

export async function deletePrivateStateDoc(
  playerId: PlayerId,
  worldId: WorldId = WORLD_ID,
): Promise<void> {
  await deleteDoc(privateStateRef(playerId, worldId));
}

/** Dev: wipe one player's private save, presence, and local online cache. */
export async function resetOnlinePlayerAccount(
  session: OnlineSession,
  playerId: PlayerId,
): Promise<void> {
  const { resetAt, saveSessionId } = await bumpPlayerResetAt(
    session.worldId,
    playerId,
  );
  await writeFreshPrivateState(session, playerId, resetAt, saveSessionId);
  await setDoc(companyRef(playerId, session.worldId), {
    playerId,
    displayName: PLAYER_LABELS[playerId],
    hqCoord: playerHqCoord(playerId),
    branchSites: [],
    lastSeenAt: Date.now(),
  });
  clearOnlineLocalCache(playerId, session.worldId);
}

/** Dev: reseed shared job board; keep private saves and map presence. */
export async function resetOnlineSharedWorldPreserveAccounts(
  session: OnlineSession,
): Promise<void> {
  await resetSharedWorld(session);
  await Promise.all(
    PLAYER_IDS.map(async (playerId) => {
      const snap = await getDoc(privateStateRef(playerId, session.worldId));
      if (!snap.exists()) return;
      await setDoc(
        privateStateRef(playerId, session.worldId),
        {
          jobEngagements: [],
          completedPostingPayouts: [],
        },
        { merge: true },
      );
    }),
  );
}

/** Dev: wipe shared job board + all player saves/presence for this world. */
export async function resetOnlineDatabase(
  session: OnlineSession,
): Promise<void> {
  clearAllOnlineLocalCaches(session.worldId);
  const resetAt = Date.now();
  const saveSessionIds = Object.fromEntries(
    PLAYER_IDS.map((playerId) => [playerId, newSaveSessionId()]),
  ) as Record<PlayerId, string>;
  await setDoc(
    metaRef(session.worldId),
    {
      playerResetAt: {
        tim: resetAt,
        chris: resetAt,
      },
      playerSaveSessionId: saveSessionIds,
    },
    { merge: true },
  );
  await Promise.all(
    PLAYER_IDS.map(async (playerId) => {
      await writeFreshPrivateState(
        session,
        playerId,
        resetAt,
        saveSessionIds[playerId],
      );
      await setDoc(companyRef(playerId, session.worldId), {
        playerId,
        displayName: PLAYER_LABELS[playerId],
        hqCoord: playerHqCoord(playerId),
        branchSites: [],
        lastSeenAt: Date.now(),
      });
    }),
  );
  await resetSharedWorld(session);
}

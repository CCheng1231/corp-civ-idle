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
import { MAP_REGION_SEED } from "../game/mapWorld";
import {
  createPostingFromDefinition,
  initializeJobPostings,
  jobDefinitionById,
} from "../game/jobs";
import type { JobPosting } from "../game/types";
import { parseJobPosting, serializePrivateState } from "./companySave";
import { getDb } from "./firebase";
import { playerHqCoord } from "./playerHq";
import type {
  CompanyPresence,
  OnlineSession,
  PlayerId,
  WorldId,
  WorldMeta,
} from "./types";
import { PLAYER_LABELS } from "./types";
import type { GameState } from "../game/types";

const WORLD_ID: WorldId = "dev";

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
    branchEstablished: state.branchEstablished,
    branchCoord: state.branchCoord,
    branchName: state.branchName,
    lastSeenAt: Date.now(),
  };
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
): Promise<void> {
  await setDoc(
    privateStateRef(session.playerId, session.worldId),
    serializePrivateState(state),
  );
}

export async function upsertCompanyPresence(
  session: OnlineSession,
  state: GameState,
): Promise<void> {
  await setDoc(
    companyRef(session.playerId, session.worldId),
    presenceFromState(session, state),
    { merge: true },
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
        const data = d.data() as CompanyPresence;
        if (data.playerId === "tim" || data.playerId === "chris") {
          map[data.playerId] = data;
        }
      }
      onChange(map);
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
  const batch = writeBatch(getDb());
  for (const d of existing.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();

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

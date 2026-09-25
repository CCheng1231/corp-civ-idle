import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import { MAP_REGION_SEED } from "../game/mapWorld";
import { initializeJobPostings } from "../game/jobs";
import { getDb } from "./firebase";
import type { OnlineSession, WorldId, WorldMeta } from "./types";
import { jobPostingsCol, metaRef, worldRoot } from "./worldDocs";

export function playerResetTimestamp(
  meta: WorldMeta | undefined,
  accountId: string,
): number {
  return meta?.playerResetAt?.[accountId] ?? 0;
}

export function playerSaveSessionId(
  meta: WorldMeta | undefined,
  accountId: string,
): string | undefined {
  const id = meta?.playerSaveSessionId?.[accountId];
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function newSaveSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function assignPlayerSaveSessionId(
  worldId: WorldId,
  accountId: string,
  saveSessionId = newSaveSessionId(),
): Promise<string> {
  await setDoc(
    metaRef(worldId),
    { playerSaveSessionId: { [accountId]: saveSessionId } },
    { merge: true },
  );
  return saveSessionId;
}

export async function bumpPlayerResetAt(
  worldId: WorldId,
  accountId: string,
  resetAt = Date.now(),
): Promise<{ resetAt: number; saveSessionId: string }> {
  const saveSessionId = newSaveSessionId();
  await setDoc(
    metaRef(worldId),
    {
      playerResetAt: { [accountId]: resetAt },
      playerSaveSessionId: { [accountId]: saveSessionId }
},
    { merge: true },
  );
  return { resetAt, saveSessionId };
}

export async function loadWorldMeta(
  session: OnlineSession,
): Promise<WorldMeta> {
  const snap = await getDoc(metaRef(session.worldId));
  if (!snap.exists()) {
    return {
      mapRegionSeed: MAP_REGION_SEED,
      jobPostingsInitialized: false,
      createdAt: Date.now()
};
  }
  return snap.data() as WorldMeta;
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
    createdAt: Date.now()
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
        createdAt: meta?.createdAt ?? now
},
      { merge: true },
    );
  });
}

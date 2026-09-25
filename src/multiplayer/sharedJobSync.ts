import {
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { createPostingFromDefinition, jobDefinitionById } from "../game/jobs";
import { MAP_REGION_SEED } from "../game/mapWorld";
import type { JobPosting } from "../game/types";
import { parseJobPosting } from "./companySave";
import { getDb } from "./firebase";
import type { OnlineSession } from "./types";
import { seedSharedJobPostingsIfNeeded } from "./worldMeta";
import { jobPostingsCol, metaRef } from "./worldDocs";

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
      contributors
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
      createdAt: Date.now()
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

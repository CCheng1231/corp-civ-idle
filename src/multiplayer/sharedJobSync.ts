import {
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { jobDefinitionForPosting } from "../game/jobs";
import { MAP_REGION_SEED } from "../game/mapWorld";
import type { JobPosting } from "../game/types";
import { parseJobPosting } from "./companySave";
import { getDb } from "./firebase";
import type { OnlineSession } from "./types";
import {
  ensureCanonSharedJobSlots,
  scheduleSharedSlotRespawn,
  reseedSharedJobPostings,
  spawnReadySharedJobSlots,
} from "./sharedJobSlotSync";
import { resetSharedBranches } from "./sharedBranchSync";
import { jobPostingsCol, metaRef } from "./worldDocs";

export { reseedSharedJobPostings, seedSharedJobPostingsIfNeeded } from "./sharedJobSlotSync";

/** Reseed when the shared collection is empty (e.g. reset failed mid-flight). */
export async function ensureSharedJobPostingsPresent(
  session: OnlineSession,
): Promise<void> {
  const snap = await getDocs(jobPostingsCol(session.worldId));
  if (!snap.empty) return;
  await reseedSharedJobPostings(session);
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

    const def = jobDefinitionForPosting(posting);
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

  await reseedSharedJobPostings(session);
  await resetSharedBranches(session.worldId);
}

/** Remove closed posting and start hidden slot cooldown — no instant replacement. */
export async function replaceClosedPosting(
  session: OnlineSession,
  closedPostingId: string,
  _definitionId: string,
  now: number,
): Promise<void> {
  const postingRef = doc(jobPostingsCol(session.worldId), closedPostingId);
  const snap = await getDoc(postingRef);
  if (!snap.exists()) return;
  const posting = parseJobPosting(snap.data() as Record<string, unknown>);
  await scheduleSharedSlotRespawn(session, posting, now);
  await spawnReadySharedJobSlots(session, now);
}

export async function maintainOnlineJobSlots(
  session: OnlineSession,
  now: number,
): Promise<void> {
  await ensureCanonSharedJobSlots(session, now);
  await spawnReadySharedJobSlots(session, now);
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
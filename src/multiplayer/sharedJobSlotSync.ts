import { doc, runTransaction } from "firebase/firestore";
import type { JobPosting, JobSiteSlotState } from "../game/types";
import { seedProceduralJobWorld } from "../game/jobSlots";
import { jobPostingsCol } from "./worldDocs";
import { getDb } from "./firebase";
import type { OnlineSession } from "./types";
import { metaRef } from "./worldDocs";
import { MAP_REGION_SEED } from "../game/mapWorld";
import type { WorldMeta } from "./types";
import { respawnDelayMsForSlot } from "../game/jobProcedural";
import {
  JOB_SLOTS_PER_SITE,
  jobSitesForSettings,
  type JobSiteDefinition,
} from "../game/jobSites";
import {
  proceduralDefinitionId,
  rollProceduralJob,
} from "../game/jobProcedural";

export function sharedJobSlotsRef(worldId: string) {
  return doc(getDb(), "worlds", worldId, "shared", "jobSlots");
}

function newPostingId(
  locationId: string,
  slotIndex: number,
  generation: number,
  now: number,
): string {
  return `posting_${locationId}_${slotIndex}_g${generation}_${now}`;
}

function buildPosting(
  site: JobSiteDefinition,
  slotIndex: number,
  generation: number,
  now: number,
  worldSeed: string,
): JobPosting {
  const roll = rollProceduralJob({
    worldSeed,
    locationId: site.id,
    locationType: site.locationType,
    slotIndex,
    generation,
  });
  const definitionId = proceduralDefinitionId(site.id, slotIndex, generation);
  return {
    id: newPostingId(site.id, slotIndex, generation, now),
    definitionId,
    locationId: site.id,
    slotIndex,
    generation,
    locationType: site.locationType,
    towerId: site.towerId ?? null,
    majorHubId: site.majorHubId ?? null,
    commercialLotId: null,
    title: roll.title,
    description: roll.description,
    tier: roll.tier,
    size: roll.size,
    durationSec: roll.durationSec,
    expirationSec: roll.expirationSec,
    cashPerUnitHour: roll.cashPerUnitHour,
    unitHoursTotal: roll.unitHoursTotal,
    bonusPercent: roll.bonusPercent,
    minUnitTier: roll.minUnitTier,
    completionPayout: roll.completionPayout,
    spawnedAt: now,
    expiresAt: now + roll.expirationSec * 1000,
    unitHoursCompleted: 0,
    status: "open",
    contributors: [],
  };
}

export function emptySharedSlotRows(): JobSiteSlotState[] {
  const rows: JobSiteSlotState[] = [];
  for (const site of jobSitesForSettings()) {
    for (let slotIndex = 0; slotIndex < JOB_SLOTS_PER_SITE; slotIndex += 1) {
      rows.push({
        locationId: site.id,
        slotIndex,
        postingId: null,
        respawnAt: null,
        generation: 0,
      });
    }
  }
  return rows;
}

export async function seedSharedJobPostingsIfNeeded(
  session: OnlineSession,
): Promise<void> {
  const metaDoc = metaRef(session.worldId);
  const slotsRef = sharedJobSlotsRef(session.worldId);

  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(metaDoc);
    const meta = snap.data() as WorldMeta | undefined;
    if (meta?.jobPostingsInitialized) return;

    const now = Date.now();
    const seeded = seedProceduralJobWorld(
      { worldSeed: session.worldId },
      now,
    );

    for (const posting of seeded.jobPostings) {
      tx.set(doc(jobPostingsCol(session.worldId), posting.id), posting);
    }
    tx.set(slotsRef, {
      slots: seeded.jobSiteSlots,
      schemaVersion: 1,
    });

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

export async function scheduleSharedSlotRespawn(
  session: OnlineSession,
  posting: JobPosting,
  now: number,
): Promise<void> {
  if (posting.locationId == null || posting.slotIndex == null) return;

  const postingRef = doc(jobPostingsCol(session.worldId), posting.id);
  const slotsRef = sharedJobSlotsRef(session.worldId);

  await runTransaction(getDb(), async (tx) => {
    const slotSnap = await tx.get(slotsRef);
    const slots = (slotSnap.data()?.slots ?? []) as JobSiteSlotState[];
    const delay = respawnDelayMsForSlot({
      worldSeed: session.worldId,
      locationId: posting.locationId!,
      slotIndex: posting.slotIndex!,
      closedAt: now,
    });
    const nextSlots = slots.map((s) => {
      if (
        s.locationId === posting.locationId &&
        s.slotIndex === posting.slotIndex
      ) {
        return {
          ...s,
          postingId: null,
          respawnAt: now + delay,
        };
      }
      return s;
    });
    tx.delete(postingRef);
    tx.set(slotsRef, { slots: nextSlots, schemaVersion: 1 }, { merge: true });
  });
}

function slotKey(locationId: string, slotIndex: number): string {
  return `${locationId}:${slotIndex}`;
}

export async function ensureCanonSharedJobSlots(
  session: OnlineSession,
  now: number,
): Promise<void> {
  const slotsRef = sharedJobSlotsRef(session.worldId);

  await runTransaction(getDb(), async (tx) => {
    const slotSnap = await tx.get(slotsRef);
    const prev = (slotSnap.data()?.slots ?? []) as JobSiteSlotState[];
    const prevByKey = new Map(
      prev.map((s) => [slotKey(s.locationId, s.slotIndex), s]),
    );
    let slots = emptySharedSlotRows().map(
      (c) => prevByKey.get(slotKey(c.locationId, c.slotIndex)) ?? c,
    );

    const sites = jobSitesForSettings();
    let changed = slots.length !== prev.length;

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i]!;
      if (slot.postingId || slot.respawnAt != null) continue;

      const site = sites.find((s) => s.id === slot.locationId);
      if (!site) continue;

      const key = slotKey(slot.locationId, slot.slotIndex);
      const prev = prevByKey.get(key);
      const isNewSite = !prevByKey.has(key);
      const legacyNeverSeeded =
        prev != null &&
        prev.generation === 0 &&
        !prev.postingId &&
        prev.respawnAt == null;
      if (!isNewSite && !legacyNeverSeeded) continue;

      const generation = Math.max(slot.generation, 0) + 1;
      const posting = buildPosting(
        site,
        slot.slotIndex,
        generation,
        now,
        session.worldId,
      );
      tx.set(doc(jobPostingsCol(session.worldId), posting.id), posting);
      slots = [...slots];
      slots[i] = {
        ...slot,
        postingId: posting.id,
        generation,
        respawnAt: null,
      };
      changed = true;
    }

    if (changed || !slotSnap.exists()) {
      tx.set(slotsRef, { slots, schemaVersion: 1 }, { merge: true });
    }
  });
}

export async function spawnReadySharedJobSlots(
  session: OnlineSession,
  now: number,
): Promise<void> {
  const slotsRef = sharedJobSlotsRef(session.worldId);

  await runTransaction(getDb(), async (tx) => {
    const slotSnap = await tx.get(slotsRef);
    let slots = (slotSnap.data()?.slots ?? emptySharedSlotRows()) as JobSiteSlotState[];
    if (!slotSnap.exists()) {
      slots = emptySharedSlotRows();
    }

    const sites = jobSitesForSettings();
    let changed = false;

    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i]!;
      if (slot.postingId) continue;
      if (slot.respawnAt == null || now < slot.respawnAt) continue;

      const site = sites.find((s) => s.id === slot.locationId);
      if (!site) continue;

      const generation = slot.generation + 1;
      const posting = buildPosting(
        site,
        slot.slotIndex,
        generation,
        now,
        session.worldId,
      );
      const postingRef = doc(jobPostingsCol(session.worldId), posting.id);
      tx.set(postingRef, posting);
      slots = [...slots];
      slots[i] = {
        ...slot,
        postingId: posting.id,
        generation,
        respawnAt: null,
      };
      changed = true;
    }

    if (changed || !slotSnap.exists()) {
      tx.set(slotsRef, { slots, schemaVersion: 1 }, { merge: true });
    }
  });
}
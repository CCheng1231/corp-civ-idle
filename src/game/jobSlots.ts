import type { GameState, JobPosting, JobSiteSlotState } from "./types";
import {
  JOB_SLOTS_PER_SITE,
  jobSitesForSettings,
  type JobSiteDefinition,
} from "./jobSites";
import {
  proceduralDefinitionId,
  respawnDelayMsForSlot,
  rollProceduralJob,
} from "./jobProcedural";
import { isOnlineMode } from "../multiplayer/playerHq";

function worldSeedForState(state: GameState): string {
  if (state.onlineSession?.worldId) {
    return state.onlineSession.worldId;
  }
  return "offline";
}

function newPostingId(
  locationId: string,
  slotIndex: number,
  generation: number,
  now: number,
): string {
  return `posting_${locationId}_${slotIndex}_g${generation}_${now}`;
}

export function createEmptyJobSiteSlots(
  settings?: GameState["settings"],
): JobSiteSlotState[] {
  const slots: JobSiteSlotState[] = [];
  for (const site of jobSitesForSettings(settings)) {
    for (let slotIndex = 0; slotIndex < JOB_SLOTS_PER_SITE; slotIndex += 1) {
      slots.push({
        locationId: site.id,
        slotIndex,
        postingId: null,
        respawnAt: null,
        generation: 0,
      });
    }
  }
  return slots;
}

function findSlot(
  slots: JobSiteSlotState[],
  locationId: string,
  slotIndex: number,
): JobSiteSlotState | undefined {
  return slots.find(
    (s) => s.locationId === locationId && s.slotIndex === slotIndex,
  );
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

export function spawnPostingForSlot(
  state: GameState,
  locationId: string,
  slotIndex: number,
  now: number,
): { state: GameState; posting: JobPosting | null } {
  const slots = [...(state.jobSiteSlots ?? createEmptyJobSiteSlots(state.settings))];
  const slot = findSlot(slots, locationId, slotIndex);
  if (!slot) return { state, posting: null };

  const site = jobSitesForSettings(state.settings).find((s) => s.id === locationId);
  if (!site) return { state, posting: null };

  const generation = slot.generation + 1;
  const worldSeed = worldSeedForState(state);
  const posting = buildPosting(site, slotIndex, generation, now, worldSeed);

  const nextSlot: JobSiteSlotState = {
    ...slot,
    postingId: posting.id,
    respawnAt: null,
    generation,
  };
  const slotIdx = slots.findIndex(
    (s) => s.locationId === locationId && s.slotIndex === slotIndex,
  );
  slots[slotIdx] = nextSlot;

  return {
    state: {
      ...state,
      jobSiteSlots: slots,
      jobPostings: [...state.jobPostings, posting],
    },
    posting,
  };
}

export function scheduleSlotRespawn(
  state: GameState,
  locationId: string,
  slotIndex: number,
  now: number,
): GameState {
  const slots = [...(state.jobSiteSlots ?? createEmptyJobSiteSlots(state.settings))];
  const slot = findSlot(slots, locationId, slotIndex);
  if (!slot) return state;

  const delay = respawnDelayMsForSlot({
    worldSeed: worldSeedForState(state),
    locationId,
    slotIndex,
    closedAt: now,
  });

  const slotIdx = slots.findIndex(
    (s) => s.locationId === locationId && s.slotIndex === slotIndex,
  );
  slots[slotIdx] = {
    ...slot,
    postingId: null,
    respawnAt: now + delay,
  };

  return {
    ...state,
    jobSiteSlots: slots,
    jobPostings: state.jobPostings.filter((p) => p.id !== slot.postingId),
  };
}

export function seedProceduralJobWorld(
  input: {
    settings?: GameState["settings"];
    worldSeed?: string;
    jobPostings?: JobPosting[];
    jobSiteSlots?: JobSiteSlotState[];
  },
  now: number,
): Pick<GameState, "jobPostings" | "jobSiteSlots"> {
  const base = {
    settings: input.settings,
    jobPostings: input.jobPostings ?? [],
    jobSiteSlots: input.jobSiteSlots,
    onlineSession: input.worldSeed
      ? ({ worldId: input.worldSeed } as GameState["onlineSession"])
      : undefined,
  } as GameState;
  const full = initializeJobWorld(base, now);
  return {
    jobPostings: full.jobPostings,
    jobSiteSlots: full.jobSiteSlots,
  };
}

export function initializeJobWorld(state: GameState, now: number): GameState {
  let slots = createEmptyJobSiteSlots(state.settings);
  let postings: JobPosting[] = [];
  let next = { ...state, jobSiteSlots: slots, jobPostings: postings };

  for (const site of jobSitesForSettings(state.settings)) {
    for (let slotIndex = 0; slotIndex < JOB_SLOTS_PER_SITE; slotIndex += 1) {
      const slot = findSlot(slots, site.id, slotIndex)!;
      const generation = 1;
      const posting = buildPosting(
        site,
        slotIndex,
        generation,
        now,
        worldSeedForState(state),
      );
      postings = [...postings, posting];
      const idx = slots.findIndex(
        (s) => s.locationId === site.id && s.slotIndex === slotIndex,
      );
      slots = [...slots];
      slots[idx] = {
        ...slot,
        postingId: posting.id,
        generation,
        respawnAt: null,
      };
    }
  }

  return { ...next, jobSiteSlots: slots, jobPostings: postings };
}

function slotKey(locationId: string, slotIndex: number): string {
  return `${locationId}:${slotIndex}`;
}

/** Add slots for new canon sites (e.g. police/hospital) and spawn open postings. */
export function reconcileJobSiteSlotsWithCanon(
  state: GameState,
  now: number,
): GameState {
  if (isOnlineMode(state)) return state;

  const canon = createEmptyJobSiteSlots(state.settings);
  const prevByKey = new Map(
    (state.jobSiteSlots ?? []).map((s) => [slotKey(s.locationId, s.slotIndex), s]),
  );
  let slots = canon.map(
    (c) => prevByKey.get(slotKey(c.locationId, c.slotIndex)) ?? c,
  );

  let next: GameState = { ...state, jobSiteSlots: slots };

  for (const slot of slots) {
    if (slot.postingId) {
      if (!next.jobPostings.some((p) => p.id === slot.postingId)) {
        const idx = slots.findIndex(
          (s) =>
            s.locationId === slot.locationId && s.slotIndex === slot.slotIndex,
        );
        if (idx >= 0) {
          slots = [...slots];
          slots[idx] = { ...slot, postingId: null };
          next = { ...next, jobSiteSlots: slots };
        }
      }
      continue;
    }
    if (slot.respawnAt != null) continue;

    const key = slotKey(slot.locationId, slot.slotIndex);
    const prev = prevByKey.get(key);
    const isNewSite = !prevByKey.has(key);
    const legacyNeverSeeded =
      prev != null &&
      prev.generation === 0 &&
      !prev.postingId &&
      prev.respawnAt == null;
    if (!isNewSite && !legacyNeverSeeded) continue;

    const spawned = spawnPostingForSlot(
      next,
      slot.locationId,
      slot.slotIndex,
      now,
    );
    if (spawned.posting) {
      next = spawned.state;
      slots = next.jobSiteSlots ?? slots;
    }
  }

  return next;
}

/** Tick: respawn empty slots; expire open postings (offline). Online expiry handled separately. */
export function processJobSiteSlots(
  state: GameState,
  now: number,
): GameState {
  let next = state;
  let slots = [...(next.jobSiteSlots ?? createEmptyJobSiteSlots(next.settings))];

  if (!next.jobSiteSlots?.length) {
    return initializeJobWorld(next, now);
  }

  next = reconcileJobSiteSlotsWithCanon(next, now);
  slots = [...(next.jobSiteSlots ?? slots)];

  const online = isOnlineMode(next);

  for (let i = 0; i < slots.length; i += 1) {
    const slot = slots[i]!;
    if (slot.postingId) {
      const posting = next.jobPostings.find((p) => p.id === slot.postingId);
      if (!posting) {
        slots[i] = { ...slot, postingId: null };
        continue;
      }
      if (
        !online &&
        posting.status === "open" &&
        posting.expiresAt <= now
      ) {
        const expired: JobPosting = { ...posting, status: "expired" };
        next = {
          ...next,
          jobPostings: next.jobPostings.map((p) =>
            p.id === posting.id ? expired : p,
          ),
        };
        next = closeSlotAfterPostingEnd(next, slot.locationId, slot.slotIndex, now);
        slots = [...(next.jobSiteSlots ?? slots)];
      }
      continue;
    }

    if (slot.respawnAt != null && now >= slot.respawnAt) {
      const spawned = spawnPostingForSlot(
        { ...next, jobSiteSlots: slots },
        slot.locationId,
        slot.slotIndex,
        now,
      );
      next = spawned.state;
      slots = [...(next.jobSiteSlots ?? slots)];
    }
  }

  return next;
}

export function closeSlotAfterPostingEnd(
  state: GameState,
  locationId: string,
  slotIndex: number,
  now: number,
): GameState {
  const posting = state.jobPostings.find(
    (p) => p.locationId === locationId && p.slotIndex === slotIndex,
  );
  let next = state;
  if (posting) {
    next = {
      ...next,
      jobPostings: next.jobPostings.filter((p) => p.id !== posting.id),
    };
  }
  return scheduleSlotRespawn(next, locationId, slotIndex, now);
}

export function postingForSiteSlot(
  state: GameState,
  locationId: string,
  slotIndex: number,
): JobPosting | undefined {
  const slot = state.jobSiteSlots?.find(
    (s) => s.locationId === locationId && s.slotIndex === slotIndex,
  );
  if (!slot?.postingId) return undefined;
  return state.jobPostings.find((p) => p.id === slot.postingId);
}
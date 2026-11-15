import type { JobTier, JobSize, Resources } from "./types";
import type { JobLocationType, JobSiteId } from "./jobSites";
import {
  jobDescriptionForTitle,
  pickJobTitle,
} from "./jobNamePools";

export const JOB_TIER1_PROBABILITY = 0.85;

export const JOB_RESPAWN_MS_MIN = 3_600_000;
export const JOB_RESPAWN_MS_MAX = 10_800_000;

export interface ProceduralJobParams {
  title: string;
  description: string;
  tier: JobTier;
  size: JobSize;
  durationSec: number;
  expirationSec: number;
  cashPerUnitHour: number;
  unitHoursTotal: number;
  bonusPercent: number;
  completionPayout: Partial<Resources>;
  minUnitTier: number;
}

function hashSeed(parts: string[]): number {
  let h = 2_166_136_261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16_777_619);
    }
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function uniform(rng: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + rng() * (max - min);
}

function tierSize(tier: JobTier, unitHoursTotal: number): JobSize {
  if (tier === 2) return unitHoursTotal >= 650 ? "huge" : "mid";
  return unitHoursTotal >= 150 ? "mid" : "small";
}

export function proceduralDefinitionId(
  locationId: JobSiteId,
  slotIndex: number,
  generation: number,
): string {
  return `proc:${locationId}:${slotIndex}:${generation}`;
}

export function rollProceduralJob(input: {
  worldSeed: string;
  locationId: JobSiteId;
  locationType: JobLocationType;
  slotIndex: number;
  generation: number;
}): ProceduralJobParams {
  const seed = hashSeed([
    input.worldSeed,
    input.locationId,
    String(input.slotIndex),
    String(input.generation),
  ]);
  const rng = makeRng(seed);

  const tier: JobTier = rng() < JOB_TIER1_PROBABILITY ? 1 : 2;

  const cashPerUnitHour =
    tier === 1
      ? Math.round(uniform(rng, 10, 30))
      : Math.round(uniform(rng, 100, 200));

  const durationSec = Math.round(
    tier === 1
      ? uniform(rng, 3600, 7200)
      : uniform(rng, 7200, 14_400),
  );

  const unitHoursTotal = Math.round(
    tier === 1
      ? uniform(rng, 80, 220)
      : uniform(rng, 400, 900),
  );

  const expirationSec = Math.round(
    tier === 1
      ? uniform(rng, 64_800, 172_800)
      : uniform(rng, 86_400, 259_200),
  );

  const bonusPercent = uniform(rng, 0.1, 0.15);

  const resourceRoll = rng();
  const resourceAmount = Math.round(uniform(rng, 100, 500));
  const completionPayout: Partial<Resources> =
    resourceRoll < 0.5
      ? { supply: resourceAmount }
      : { connection: resourceAmount };

  const title = pickJobTitle(input.locationType, rng());
  const description = jobDescriptionForTitle(title, tier);
  const size = tierSize(tier, unitHoursTotal);

  return {
    title,
    description,
    tier,
    size,
    durationSec,
    expirationSec,
    cashPerUnitHour,
    unitHoursTotal,
    bonusPercent,
    completionPayout,
    minUnitTier: tier,
  };
}

export function rollRespawnDelayMs(rngUnit: number): number {
  return Math.round(
    JOB_RESPAWN_MS_MIN +
      rngUnit * (JOB_RESPAWN_MS_MAX - JOB_RESPAWN_MS_MIN),
  );
}

export function respawnDelayMsForSlot(input: {
  worldSeed: string;
  locationId: JobSiteId;
  slotIndex: number;
  closedAt: number;
}): number {
  const seed = hashSeed([
    input.worldSeed,
    input.locationId,
    String(input.slotIndex),
    "respawn",
    String(input.closedAt),
  ]);
  const rng = makeRng(seed);
  return rollRespawnDelayMs(rng());
}
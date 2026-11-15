import { describe, expect, it } from "vitest";
import {
  JOB_TIER1_PROBABILITY,
  rollProceduralJob,
  rollRespawnDelayMs,
} from "./jobProcedural";

describe("rollProceduralJob", () => {
  const base = {
    worldSeed: "test-world",
    locationId: "tower:metro_central",
    locationType: "tower" as const,
    slotIndex: 0,
    generation: 1,
  };

  it("is deterministic for the same seed inputs", () => {
    const a = rollProceduralJob(base);
    const b = rollProceduralJob(base);
    expect(b).toEqual(a);
  });

  it("rolls bonusPercent in 10–15% range", () => {
    for (let gen = 1; gen <= 40; gen += 1) {
      const job = rollProceduralJob({ ...base, generation: gen });
      expect(job.bonusPercent).toBeGreaterThanOrEqual(0.1);
      expect(job.bonusPercent).toBeLessThanOrEqual(0.15);
    }
  });

  it("rolls tier-appropriate pay bands", () => {
    let sawT1 = false;
    let sawT2 = false;
    for (let gen = 1; gen <= 200; gen += 1) {
      const job = rollProceduralJob({ ...base, generation: gen });
      if (job.tier === 1) {
        sawT1 = true;
        expect(job.cashPerUnitHour).toBeGreaterThanOrEqual(10);
        expect(job.cashPerUnitHour).toBeLessThanOrEqual(30);
      } else {
        sawT2 = true;
        expect(job.cashPerUnitHour).toBeGreaterThanOrEqual(100);
        expect(job.cashPerUnitHour).toBeLessThanOrEqual(200);
      }
    }
    expect(sawT1).toBe(true);
    expect(sawT2).toBe(true);
    expect(JOB_TIER1_PROBABILITY).toBe(0.85);
  });
});

describe("rollRespawnDelayMs", () => {
  it("stays within 1–3 hours", () => {
    expect(rollRespawnDelayMs(0)).toBe(3_600_000);
    expect(rollRespawnDelayMs(1)).toBe(10_800_000);
    expect(rollRespawnDelayMs(0.5)).toBe(7_200_000);
  });
});
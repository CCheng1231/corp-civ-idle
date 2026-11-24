import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import {
  govAcceptGrowthProgram,
  govFailsafeInterruptedGrowthCoach,
  govGrowthCoachInProgress,
} from "./govProgram";

describe("gov growth coach load failsafe", () => {
  it("no-ops when growth coach is idle", () => {
    const state = govAcceptGrowthProgram(createInitialState());
    expect(govGrowthCoachInProgress(state.govProgram)).toBe(false);
    expect(govFailsafeInterruptedGrowthCoach(state)).toBe(state);
  });

  it("clears mid-map coach and parks on Secretary → Govt Prog", () => {
    let state = govAcceptGrowthProgram(createInitialState());
    state = {
      ...state,
      view: "world",
      govProgram: {
        ...state.govProgram,
        growthStepId: "growth_job",
        growthJobCoach: "map_send",
        growthJobCoachPostingId: "posting_test",
        growthMapCoach: "pick_job",
      },
    };
    expect(govGrowthCoachInProgress(state.govProgram)).toBe(true);
    const next = govFailsafeInterruptedGrowthCoach(state);
    expect(next.view).toBe("secretary");
    expect(next.secretaryPanel).toBe("govProgram");
    expect(next.govProgram.growthJobCoach).toBeNull();
    expect(next.govProgram.growthMapCoach).toBeNull();
    expect(next.govProgram.mapSiteInspected).toBe(false);
    expect(next.govProgram.pendingModal).toBeNull();
  });

  it("resumes map travel coach when step 3 already engaged on reload", () => {
    let state = govAcceptGrowthProgram(createInitialState());
    const now = Date.now();
    state = {
      ...state,
      view: "world",
      activityLog: [
        ...state.activityLog,
        {
          id: "log_eng_test",
          at: now - 1000,
          category: "job_engage" as const,
          summary: "Engaged test",
        },
      ],
      govProgram: {
        ...state.govProgram,
        growthStepId: "growth_job",
        mapSiteInspected: true,
        growthStepStartedAt: now - 60_000,
        growthJobCoach: "map_engage",
        growthJobCoachPostingId: "posting_test",
      },
      jobEngagements: [
        {
          id: "eng_posting_test",
          postingId: "posting_test",
          definitionId: "test_def",
          towerId: null,
          majorHubId: null,
          commercialLotId: null,
          officeId: "hq",
          crewAssigned: { fresh_graduate: 10 },
          teamLeadSecretaryId: null,
          phase: "outbound",
          travelStartedAt: now - 500,
          travelArrivesAt: now + 60_000,
          startedAt: 0,
          endsAt: 0,
          lastAccruedAt: now,
          earnedSoFar: 0,
          unitHoursApplied: 0,
        },
      ],
    };
    const next = govFailsafeInterruptedGrowthCoach(state);
    expect(next.view).toBe("world");
    expect(next.govProgram.pendingModal).toBe("growth_job_travel_coach");
    expect(next.govProgram.mapSiteInspected).toBe(true);
  });
});
import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import {
  govAcceptGrowthProgram,
  govOnMapSiteInspected,
  govWorldMapHeaderTitle,
} from "./govProgram";
import { govProgramLiveCue } from "./govProgramLiveCue";

describe("gov program live cue", () => {
  it("stays quiet until the growth program is accepted", () => {
    const state = createInitialState();
    expect(govProgramLiveCue(state, "operations")).toBeNull();
  });

  it("keeps step 1 structure off the live cue strip", () => {
    const state = govAcceptGrowthProgram(createInitialState());
    expect(govProgramLiveCue(state, "operations")).toBeNull();
    expect(govProgramLiveCue(state, "recruitment")).toBeNull();
  });

  it("does not count a map open as a site inspect", () => {
    const state = govAcceptGrowthProgram(createInitialState());
    expect(govOnMapSiteInspected(state).govProgram.mapSiteInspected).toBe(
      false,
    );
  });

  it("finishes the survey step when a hex is inspected during that step", () => {
    let state = govAcceptGrowthProgram(createInitialState());
    state = {
      ...state,
      govProgram: {
        ...state.govProgram,
        growthStepId: "growth_map",
        growthCompletedStepIds: ["growth_structure", "growth_recruit_push"],
      },
    };
    expect(govProgramLiveCue(state, "world")).toBeNull();
    expect(govWorldMapHeaderTitle(state)).toBe("World Map - Program available");
    const next = govOnMapSiteInspected(state);
    expect(next.govProgram.mapSiteInspected).toBe(true);
    expect(next.govProgram.growthStepId).toBe("growth_job");
  });

  it("hides orientation charter on world during growth track replay", () => {
    let state = govAcceptGrowthProgram(createInitialState());
    state = {
      ...state,
      govProgram: {
        ...state.govProgram,
        lifetimeRecruits: 10,
        executiveStepId: "exec_charter_engage",
        growthStepId: "growth_structure",
        growthReplayAt: Date.now(),
      },
    };
    expect(govProgramLiveCue(state, "world")).toBeNull();
    expect(govProgramLiveCue(state, "job")).toBeNull();
  });

  it("locks the job and map screens onto the charter", () => {
    let state = govAcceptGrowthProgram(createInitialState());
    state = {
      ...state,
      govProgram: {
        ...state.govProgram,
        lifetimeRecruits: 10,
        executiveStepId: "exec_charter_engage",
        growthStepId: "growth_recruit_push",
      },
    };
    expect(govProgramLiveCue(state, "job")?.title).toBe("Orientation charter");
    expect(govProgramLiveCue(state, "world")).toBeNull();
    expect(govProgramLiveCue(state, "operations")).toBeNull();
  });
});

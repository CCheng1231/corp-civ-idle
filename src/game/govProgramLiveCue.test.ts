import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import { govAcceptGrowthProgram, govOnMapSiteInspected } from "./govProgram";
import { govProgramLiveCue } from "./govProgramLiveCue";

describe("gov program live cue", () => {
  it("stays quiet until the growth program is accepted", () => {
    const state = createInitialState();
    expect(govProgramLiveCue(state, "operations")).toBeNull();
  });

  it("points at Office Desk only on the structure tab", () => {
    const state = govAcceptGrowthProgram(createInitialState());
    const cue = govProgramLiveCue(state, "operations");
    expect(cue?.title).toBe("Learning Basic");
    expect(cue?.action?.kind).toBe("game");
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
    expect(govProgramLiveCue(state, "world")?.instruction).toMatch(/Tap a hex/);
    const next = govOnMapSiteInspected(state);
    expect(next.govProgram.mapSiteInspected).toBe(true);
    expect(next.govProgram.growthStepId).toBe("growth_job");
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
    expect(govProgramLiveCue(state, "world")?.action?.kind).toBe("game");
    expect(govProgramLiveCue(state, "operations")).toBeNull();
  });
});

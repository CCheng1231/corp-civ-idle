import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import {
  createInitialSecretaryProgress,
  secretaryFullyMastered,
  unlockSecretary,
} from "./secretaryProgress";
import {
  checkSecretaryRecruitmentMilestones,
  pickRandomRecruit,
} from "./secretaryRecruitment";
import { chiefOfficeProductionMult } from "./secretaryEffects";

describe("secretary recruitment", () => {
  it("random recruit only picks locked gacha ids", () => {
    const picked = pickRandomRecruit([
      "secretary_03",
      "secretary_04",
      "secretary_05",
    ]);
    expect(["secretary_03", "secretary_04", "secretary_05"]).toContain(picked);
  });

  it("queues net worth milestone once", () => {
    let state = createInitialState();
    state = {
      ...state,
      netWorth: 300_000,
    };
    const next = checkSecretaryRecruitmentMilestones(state);
    expect(next.secretaryRecruitment.pendingOffer?.milestoneId).toBe(
      "recruit_net_worth_250k",
    );
  });

  it("unlock adds progress entry", () => {
    let state = createInitialState();
    state = unlockSecretary(state, "secretary_03");
    expect(state.secretaryUnlocks.secretary_03).toBe(true);
    expect(state.secretaryProgress.secretary_03).toBeDefined();
  });
});

describe("secretary mastery", () => {
  it("requires max level and full skill trees", () => {
    const progress = createInitialSecretaryProgress();
    expect(secretaryFullyMastered(progress)).toBe(false);
  });
});

describe("secretary effects", () => {
  it("chief production mult includes skill ranks", () => {
    let state = createInitialState();
    state = {
      ...state,
      secretaryProgress: {
        ...state.secretaryProgress,
        secretary_01: {
          ...(state.secretaryProgress.secretary_01 ??
            createInitialSecretaryProgress()),
          chiefSkillRanks: {
            chief_cash_supply: 2,
            chief_build_time: 0,
            chief_research_time: 0,
          },
        },
      },
    };
    expect(chiefOfficeProductionMult(state)).toBeGreaterThan(1);
  });
});

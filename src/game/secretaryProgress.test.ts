import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import {
  createInitialSecretaryProgress,
  secretaryFullyMastered,
  unlockSecretary,
} from "./secretaryProgress";
import {
  canResumeSecretaryRecruitment,
  checkSecretaryRecruitmentMilestones,
  dismissSecretaryRecruitment,
  pickRandomRecruit,
  resumeSecretaryRecruitment,
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

  it("does not queue first branch for another players shared branch online", () => {
    let state = createInitialState();
    state = {
      ...state,
      onlineSession: {
        accountId: "guest-testplayer",
        playMode: "online",
        worldId: "dev",
      },
      branchSites: [
        {
          name: "Chris Branch",
          hexKey: "2,0",
          officeSpaceBase: 12,
          ownerPlayerId: "chris",
        },
      ],
    };
    const next = checkSecretaryRecruitmentMilestones(state);
    expect(next.secretaryRecruitment.pendingOffer).toBeNull();
  });

  it("defers milestone offer on Later and resumes from queue", () => {
    let state = createInitialState();
    state = {
      ...state,
      branchSites: [
        {
          name: "Branch 1",
          hexKey: "1,0",
          officeSpaceBase: 12,
          ownerPlayerId: "local",
        },
      ],
    };
    state = checkSecretaryRecruitmentMilestones(state);
    expect(state.secretaryRecruitment.pendingOffer?.milestoneId).toBe(
      "recruit_first_branch",
    );
    state = dismissSecretaryRecruitment(state);
    expect(state.secretaryRecruitment.pendingOffer).toBeNull();
    expect(canResumeSecretaryRecruitment(state)).toBe(true);
    state = resumeSecretaryRecruitment(state);
    expect(state.secretaryRecruitment.pendingOffer?.phase).toBe("offer");
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
    expect(secretaryFullyMastered("secretary_01", progress)).toBe(false);
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
            ...createInitialSecretaryProgress().chiefSkillRanks,
            chief_cash_supply: 2,
          },
        },
      },
    };
    expect(chiefOfficeProductionMult(state)).toBeGreaterThan(1);
  });
});

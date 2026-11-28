import { describe, expect, it } from "vitest";
import { createInitialState } from "./constants";
import { skillTreesFor } from "./secretarySkillData";
import {
  checkSecretarySkinOffers,
  chiefTreeFullyMastered,
  commitSecretarySkinUnlock,
  createInitialSecretarySkinsState,
  deferSecretarySkinOffer,
  devMaxSecretaryProgress,
  secretarySkinOnSiteWorkPct,
  teamLeadTreeFullyMastered,
} from "./secretarySkins";
import { createInitialSecretaryProgress } from "./secretaryProgress";
import { SECRETARY_MAX_LEVEL } from "./secretarySkillData";
import { jobWorkDurationMsForEngagement } from "./secretaryEffects";

describe("secretary skins", () => {
  it("detects per-tree mastery independently", () => {
    const progress = createInitialSecretaryProgress();
    const id = "secretary_01";
    const trees = skillTreesFor(id);
    expect(chiefTreeFullyMastered(id, progress)).toBe(false);
    progress.level = SECRETARY_MAX_LEVEL;
    for (const node of trees.chief.nodes) {
      progress.chiefSkillRanks[node.id] = node.maxRank;
    }
    expect(chiefTreeFullyMastered(id, progress)).toBe(true);
    expect(teamLeadTreeFullyMastered(id, progress)).toBe(false);
    for (const node of trees.teamLead.nodes) {
      progress.teamLeadSkillRanks[node.id] = node.maxRank;
    }
    expect(teamLeadTreeFullyMastered(id, progress)).toBe(true);
  });

  it("opens skin offer when a tree is maxed", () => {
    const state = createInitialState();
    const before = {
      ...state,
      secretaryProgress: {
        ...state.secretaryProgress,
        secretary_01: createInitialSecretaryProgress(),
      },
    };
    const progress = { ...createInitialSecretaryProgress(), level: SECRETARY_MAX_LEVEL };
    const trees = skillTreesFor("secretary_01");
    for (const node of trees.chief.nodes) {
      progress.chiefSkillRanks[node.id] = node.maxRank;
    }
    const after = {
      ...before,
      secretaryProgress: { ...before.secretaryProgress, secretary_01: progress },
    };
    const next = checkSecretarySkinOffers(after, before, "secretary_01");
    expect(next.secretarySkins.pendingOffer?.tree).toBe("chief");
  });

  it("unlocks nurse skin and applies hospital work bonus", () => {
    let state = createInitialState();
    state = {
      ...state,
      secretarySkins: {
        ...createInitialSecretarySkinsState(),
        pendingOffer: { secretaryId: "secretary_01", tree: "chief" },
      },
    };
    state = commitSecretarySkinUnlock(state, "nurse");
    expect(state.secretarySkins.unlocked.secretary_01).toContain("nurse");
    expect(state.secretarySkins.equipped.secretary_01).toBe("nurse");
    expect(
      secretarySkinOnSiteWorkPct(state, "secretary_01", "hospital"),
    ).toBe(-0.01);
    const hospitalPosting = state.jobPostings.find(
      (p) => p.locationType === "hospital",
    );
    expect(hospitalPosting).toBeDefined();
    const ms = jobWorkDurationMsForEngagement(
      state,
      10_000,
      {
        teamLeadSecretaryId: "secretary_01",
        definitionId: hospitalPosting!.definitionId,
      },
    );
    expect(ms).toBe(9_900_000);
  });

  it("defers and dev-maxes chief for testing", () => {
    let state = createInitialState();
    state = devMaxSecretaryProgress(state, "secretary_01");
    expect(state.secretaryProgress.secretary_01?.level).toBe(10);
    expect(state.secretarySkins.pendingOffer).not.toBeNull();
    state = deferSecretarySkinOffer(state);
    expect(state.secretarySkins.pendingOffer).toBeNull();
    expect(state.secretarySkins.deferredOffers.length).toBeGreaterThan(0);
  });
});
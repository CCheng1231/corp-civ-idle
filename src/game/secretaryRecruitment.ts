import { secretaryById } from "./secretaryData";
import {
  createInitialSecretaryRecruitment,
  lockedGachaPool,
  unlockSecretary,
  anySecretaryFullyMastered,
} from "./secretaryProgress";
import { RECRUITMENT_NET_WORTH_MILESTONE } from "./secretarySkillData";
import type {
  GameState,
  SecretaryId,
  SecretaryRecruitMilestoneId,
  SecretaryRecruitmentState,
} from "./types";

const MILESTONE_ORDER: SecretaryRecruitMilestoneId[] = [
  "recruit_first_branch",
  "recruit_net_worth_250k",
  "recruit_secretary_mastery",
];

export function recruitmentLoreIntro(
  state: GameState,
  milestoneId: SecretaryRecruitMilestoneId,
): string {
  const chief = secretaryById(state.chiefOfStaffId).name;
  const base =
    "Our footprint is outgrowing a single executive desk. I've spoken with two headhunters who can line up additional chief-of-staff candidates.";
  switch (milestoneId) {
    case "recruit_first_branch":
      return `${chief}: ${base} The first branch is live — we should staff up before the next ribbon-cutting.`;
    case "recruit_net_worth_250k":
      return `${chief}: ${base} The balance sheet just crossed $250k net worth. Investors expect a deeper bench.`;
    case "recruit_secretary_mastery":
      return `${chief}: ${base} You've pushed one of us to master every playbook. Time to hire a peer.`;
    default:
      return `${chief}: ${base}`;
  }
}

function playerOwnedBranchCount(state: GameState): number {
  const online = state.onlineSession?.playMode === "online";
  const ownerId = online ? state.onlineSession!.accountId : "local";
  return state.branchSites.filter((site) => {
    if (site.closingStartedAt) return false;
    if (online) return site.ownerPlayerId === ownerId;
    return (site.ownerPlayerId ?? ownerId) === ownerId;
  }).length;
}

function milestoneTriggered(
  state: GameState,
  id: SecretaryRecruitMilestoneId,
): boolean {
  switch (id) {
    case "recruit_first_branch":
      return playerOwnedBranchCount(state) >= 1;
    case "recruit_net_worth_250k":
      return state.netWorth >= RECRUITMENT_NET_WORTH_MILESTONE;
    case "recruit_secretary_mastery":
      return anySecretaryFullyMastered(state);
    default:
      return false;
  }
}

function enqueueMilestones(
  recruitment: GameState["secretaryRecruitment"],
  ids: SecretaryRecruitMilestoneId[],
): GameState["secretaryRecruitment"] {
  const completed = new Set(recruitment.completedMilestones);
  const queue = [...recruitment.offerQueue];
  for (const id of ids) {
    if (completed.has(id) || queue.includes(id)) continue;
    if (MILESTONE_ORDER.includes(id)) queue.push(id);
  }
  queue.sort(
    (a, b) => MILESTONE_ORDER.indexOf(a) - MILESTONE_ORDER.indexOf(b),
  );
  return { ...recruitment, offerQueue: queue };
}

function stripStaleSecretaryRecruitment(
  state: GameState,
): GameState {
  const recruitment = state.secretaryRecruitment ?? createInitialSecretaryRecruitment();
  let pendingOffer = recruitment.pendingOffer;
  if (pendingOffer) {
    const completed = new Set(recruitment.completedMilestones);
    if (
      completed.has(pendingOffer.milestoneId) ||
      !milestoneTriggered(state, pendingOffer.milestoneId)
    ) {
      pendingOffer = null;
    }
  }
  const offerQueue = recruitment.offerQueue.filter(
    (id) =>
      !recruitment.completedMilestones.includes(id) &&
      milestoneTriggered(state, id),
  );
  if (
    pendingOffer === recruitment.pendingOffer &&
    offerQueue.length === recruitment.offerQueue.length &&
    offerQueue.every((id, i) => id === recruitment.offerQueue[i])
  ) {
    return state;
  }
  return {
    ...state,
    secretaryRecruitment: { ...recruitment, pendingOffer, offerQueue },
  };
}

export function checkSecretaryRecruitmentMilestones(
  state: GameState,
  prev?: GameState,
): GameState {
  if (lockedGachaPool(state).length === 0) return state;

  state = stripStaleSecretaryRecruitment(state);

  let recruitment = state.secretaryRecruitment ?? createInitialSecretaryRecruitment();
  const completed = new Set(recruitment.completedMilestones);
  const newlyEligible: SecretaryRecruitMilestoneId[] = [];

  for (const id of MILESTONE_ORDER) {
    if (completed.has(id)) continue;
    if (!milestoneTriggered(state, id)) continue;
    const wasMet = prev ? milestoneTriggered(prev, id) : false;
    if (prev) {
      if (!wasMet) newlyEligible.push(id);
      continue;
    }
    const alreadyQueued =
      recruitment.offerQueue.includes(id) ||
      recruitment.pendingOffer?.milestoneId === id;
    if (!alreadyQueued) newlyEligible.push(id);
  }

  recruitment = enqueueMilestones(recruitment, newlyEligible);
  if (!recruitment.pendingOffer && recruitment.offerQueue.length > 0) {
    const [next, ...rest] = recruitment.offerQueue;
    recruitment = {
      ...recruitment,
      offerQueue: rest,
      pendingOffer: { milestoneId: next, phase: "offer" },
    };
  }

  if (recruitment === state.secretaryRecruitment) return state;
  return { ...state, secretaryRecruitment: recruitment };
}

export function pickRandomRecruit(pool: SecretaryId[]): SecretaryId | null {
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}

export function commitSecretaryRecruitment(state: GameState): GameState {
  const offer = state.secretaryRecruitment.pendingOffer;
  if (!offer || offer.phase !== "offer") return state;

  const pool = lockedGachaPool(state);
  const picked = pickRandomRecruit(pool);
  if (!picked) {
    const recruitment = {
      ...state.secretaryRecruitment,
      pendingOffer: null,
      completedMilestones: [
        ...state.secretaryRecruitment.completedMilestones,
        offer.milestoneId,
      ],
    };
    return { ...state, secretaryRecruitment: recruitment };
  }

  let next = unlockSecretary(state, picked);
  const recruitment = {
    ...state.secretaryRecruitment,
    pendingOffer: {
      milestoneId: offer.milestoneId,
      phase: "animating" as const,
      revealedId: picked,
    },
    completedMilestones: [
      ...state.secretaryRecruitment.completedMilestones,
      offer.milestoneId,
    ],
  };
  return { ...next, secretaryRecruitment: recruitment };
}

export function finishRecruitmentAnimation(state: GameState): GameState {
  const offer = state.secretaryRecruitment.pendingOffer;
  if (!offer || offer.phase !== "animating" || !offer.revealedId) return state;
  return {
    ...state,
    secretaryRecruitment: {
      ...state.secretaryRecruitment,
      pendingOffer: { ...offer, phase: "revealed" },
    },
  };
}

export function canResumeSecretaryRecruitment(state: GameState): boolean {
  const recruitment = state.secretaryRecruitment;
  if (recruitment.pendingOffer || lockedGachaPool(state).length === 0) {
    return false;
  }
  return recruitment.offerQueue.some((id) => milestoneTriggered(state, id));
}

/** Re-open a deferred milestone offer (after “Later” on the modal). */
export function resumeSecretaryRecruitment(state: GameState): GameState {
  if (!canResumeSecretaryRecruitment(state)) return state;
  const recruitment = state.secretaryRecruitment;
  const idx = recruitment.offerQueue.findIndex((id) =>
    milestoneTriggered(state, id),
  );
  if (idx < 0) return state;
  const milestoneId = recruitment.offerQueue[idx];
  const offerQueue = recruitment.offerQueue.filter((_, i) => i !== idx);
  return {
    ...state,
    secretaryRecruitment: {
      ...recruitment,
      offerQueue,
      pendingOffer: { milestoneId, phase: "offer" },
    },
  };
}

export function dismissSecretaryRecruitment(state: GameState): GameState {
  const offer = state.secretaryRecruitment.pendingOffer;
  if (!offer) return state;

  if (offer.phase === "offer") {
    let recruitment: SecretaryRecruitmentState = {
      ...state.secretaryRecruitment,
      pendingOffer: null,
    };
    if (
      milestoneTriggered(state, offer.milestoneId) &&
      !recruitment.completedMilestones.includes(offer.milestoneId)
    ) {
      const queue = recruitment.offerQueue.filter(
        (id) => id !== offer.milestoneId,
      );
      recruitment = {
        ...recruitment,
        offerQueue: [offer.milestoneId, ...queue],
      };
    }
    return { ...state, secretaryRecruitment: recruitment };
  }

  const recruitment: SecretaryRecruitmentState = {
    ...state.secretaryRecruitment,
    pendingOffer: null,
  };
  let next = { ...state, secretaryRecruitment: recruitment };
  if (recruitment.offerQueue.length > 0 && lockedGachaPool(next).length > 0) {
    const [head, ...rest] = recruitment.offerQueue;
    next = {
      ...next,
      secretaryRecruitment: {
        ...recruitment,
        offerQueue: rest,
        pendingOffer: { milestoneId: head, phase: "offer" as const },
      },
    };
  }
  return next;
}

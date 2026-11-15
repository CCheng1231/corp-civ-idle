import { jobDefinitionById } from "./jobDefinitions";
import { SECRETARY_IDS } from "./secretaryData";
import {
  CHIEF_SKILL_NODES,
  SECRETARY_MAX_LEVEL,
  TEAM_LEAD_SKILL_NODES,
  CHIEF_SKILL_DEFS,
  TEAM_LEAD_SKILL_DEFS,
  type ChiefSkillNodeId,
  type TeamLeadSkillNodeId,
} from "./secretarySkillData";
import type { SecretaryUnlockableSkinId } from "./secretarySkinData";
import { createInitialSecretaryProgress } from "./secretaryProgress";
import type {
  JobLocationType,
  GameState,
  SecretaryId,
  SecretaryProgress,
} from "./types";

export type SecretarySkinRewardTree = "chief" | "teamLead";

export interface SecretarySkinPendingOffer {
  secretaryId: SecretaryId;
  tree: SecretarySkinRewardTree;
}

export interface SecretarySkinsState {
  unlocked: Partial<Record<SecretaryId, SecretaryUnlockableSkinId[]>>;
  equipped: Partial<Record<SecretaryId, SecretaryUnlockableSkinId>>;
  rewardClaimed: Partial<
    Record<SecretaryId, Partial<Record<SecretarySkinRewardTree, boolean>>>
  >;
  pendingOffer: SecretarySkinPendingOffer | null;
  deferredOffers: SecretarySkinPendingOffer[];
}

export const NURSE_HOSPITAL_WORK_PCT = -0.01;

export function createInitialSecretarySkinsState(): SecretarySkinsState {
  return {
    unlocked: {},
    equipped: {},
    rewardClaimed: {},
    pendingOffer: null,
    deferredOffers: [],
  };
}

function normalizeUnlockedList(raw: unknown): SecretaryUnlockableSkinId[] {
  if (!Array.isArray(raw)) return [];
  const allowed: SecretaryUnlockableSkinId[] = [
    "nurse",
    "skin_02",
    "skin_03",
    "skin_04",
  ];
  return raw.filter(
    (id): id is SecretaryUnlockableSkinId =>
      typeof id === "string" && allowed.includes(id as SecretaryUnlockableSkinId),
  );
}

function normalizeRewardClaimed(
  raw: unknown,
): Partial<Record<SecretaryId, Partial<Record<SecretarySkinRewardTree, boolean>>>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<
    Record<SecretaryId, Partial<Record<SecretarySkinRewardTree, boolean>>>
  > = {};
  for (const id of SECRETARY_IDS) {
    const entry = (raw as Record<string, unknown>)[id];
    if (!entry || typeof entry !== "object") continue;
    const parsed = entry as Record<string, unknown>;
    out[id] = {
      chief: parsed.chief === true,
      teamLead: parsed.teamLead === true,
    };
  }
  return out;
}

function normalizePendingOffer(raw: unknown): SecretarySkinPendingOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Record<string, unknown>;
  const secretaryId = parsed.secretaryId;
  const tree = parsed.tree;
  if (
    typeof secretaryId === "string" &&
    SECRETARY_IDS.includes(secretaryId as SecretaryId) &&
    (tree === "chief" || tree === "teamLead")
  ) {
    return { secretaryId: secretaryId as SecretaryId, tree };
  }
  return null;
}

function normalizeDeferredOffers(raw: unknown): SecretarySkinPendingOffer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizePendingOffer(entry))
    .filter((entry): entry is SecretarySkinPendingOffer => entry != null);
}

export function normalizeSecretarySkins(raw: unknown): SecretarySkinsState {
  const base = createInitialSecretarySkinsState();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Record<string, unknown>;
  const unlocked: Partial<Record<SecretaryId, SecretaryUnlockableSkinId[]>> =
    {};
  if (parsed.unlocked && typeof parsed.unlocked === "object") {
    for (const id of SECRETARY_IDS) {
      const list = normalizeUnlockedList(
        (parsed.unlocked as Record<string, unknown>)[id],
      );
      if (list.length > 0) unlocked[id] = list;
    }
  }
  const equipped: Partial<Record<SecretaryId, SecretaryUnlockableSkinId>> = {};
  if (parsed.equipped && typeof parsed.equipped === "object") {
    for (const id of SECRETARY_IDS) {
      const skin = (parsed.equipped as Record<string, unknown>)[id];
      const list = unlocked[id] ?? [];
      if (
        typeof skin === "string" &&
        list.includes(skin as SecretaryUnlockableSkinId)
      ) {
        equipped[id] = skin as SecretaryUnlockableSkinId;
      }
    }
  }
  return {
    unlocked,
    equipped,
    rewardClaimed: normalizeRewardClaimed(parsed.rewardClaimed),
    pendingOffer: normalizePendingOffer(parsed.pendingOffer),
    deferredOffers: normalizeDeferredOffers(parsed.deferredOffers),
  };
}

export function chiefTreeFullyMastered(progress: SecretaryProgress): boolean {
  for (const node of CHIEF_SKILL_NODES) {
    const max = CHIEF_SKILL_DEFS[node].maxRank;
    if ((progress.chiefSkillRanks[node] ?? 0) < max) return false;
  }
  return true;
}

export function teamLeadTreeFullyMastered(progress: SecretaryProgress): boolean {
  for (const node of TEAM_LEAD_SKILL_NODES) {
    const max = TEAM_LEAD_SKILL_DEFS[node].maxRank;
    if ((progress.teamLeadSkillRanks[node] ?? 0) < max) return false;
  }
  return true;
}

function progressFor(
  state: Pick<GameState, "secretaryProgress">,
  id: SecretaryId,
): SecretaryProgress {
  return state.secretaryProgress[id] ?? createInitialSecretaryProgress();
}

function treeRewardClaimed(
  skins: SecretarySkinsState,
  secretaryId: SecretaryId,
  tree: SecretarySkinRewardTree,
): boolean {
  return skins.rewardClaimed[secretaryId]?.[tree] === true;
}

function enqueueSkinOffer(
  skins: SecretarySkinsState,
  offer: SecretarySkinPendingOffer,
): SecretarySkinsState {
  if (treeRewardClaimed(skins, offer.secretaryId, offer.tree)) return skins;
  const duplicatePending =
    skins.pendingOffer?.secretaryId === offer.secretaryId &&
    skins.pendingOffer?.tree === offer.tree;
  const duplicateDeferred = skins.deferredOffers.some(
    (entry) =>
      entry.secretaryId === offer.secretaryId && entry.tree === offer.tree,
  );
  if (duplicatePending || duplicateDeferred) return skins;
  if (!skins.pendingOffer) {
    return { ...skins, pendingOffer: offer };
  }
  return {
    ...skins,
    deferredOffers: [...skins.deferredOffers, offer],
  };
}

function newlyMasteredTrees(
  before: SecretaryProgress,
  after: SecretaryProgress,
): SecretarySkinRewardTree[] {
  const trees: SecretarySkinRewardTree[] = [];
  if (!chiefTreeFullyMastered(before) && chiefTreeFullyMastered(after)) {
    trees.push("chief");
  }
  if (!teamLeadTreeFullyMastered(before) && teamLeadTreeFullyMastered(after)) {
    trees.push("teamLead");
  }
  return trees;
}

export function checkSecretarySkinOffers(
  next: GameState,
  prev: GameState,
  secretaryId: SecretaryId,
): GameState {
  if (!next.secretaryUnlocks[secretaryId]) return next;
  const before = progressFor(prev, secretaryId);
  const after = progressFor(next, secretaryId);
  const trees = newlyMasteredTrees(before, after);
  if (trees.length === 0) return next;
  let skins = next.secretarySkins ?? createInitialSecretarySkinsState();
  for (const tree of trees) {
    if (treeRewardClaimed(skins, secretaryId, tree)) continue;
    skins = enqueueSkinOffer(skins, { secretaryId, tree });
  }
  if (skins === next.secretarySkins) return next;
  return { ...next, secretarySkins: skins };
}

export function canResumeSecretarySkinOffer(
  state: Pick<GameState, "secretarySkins">,
): boolean {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  return !skins.pendingOffer && skins.deferredOffers.length > 0;
}

export function resumeSecretarySkinOffer(state: GameState): GameState {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  if (skins.pendingOffer || skins.deferredOffers.length === 0) return state;
  const [head, ...rest] = skins.deferredOffers;
  return {
    ...state,
    secretarySkins: {
      ...skins,
      pendingOffer: head,
      deferredOffers: rest,
    },
  };
}

export function deferSecretarySkinOffer(state: GameState): GameState {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  const offer = skins.pendingOffer;
  if (!offer) return state;
  return {
    ...state,
    secretarySkins: {
      ...skins,
      pendingOffer: null,
      deferredOffers: [...skins.deferredOffers, offer],
    },
  };
}

export function commitSecretarySkinUnlock(
  state: GameState,
  skinId: SecretaryUnlockableSkinId,
): GameState {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  const offer = skins.pendingOffer;
  if (!offer) return state;
  if (!state.secretaryUnlocks[offer.secretaryId]) return state;
  const unlocked = [...(skins.unlocked[offer.secretaryId] ?? [])];
  if (!unlocked.includes(skinId)) unlocked.push(skinId);
  const rewardClaimed = {
    ...skins.rewardClaimed,
    [offer.secretaryId]: {
      ...(skins.rewardClaimed[offer.secretaryId] ?? {}),
      [offer.tree]: true,
    },
  };
  let deferredOffers = skins.deferredOffers;
  let pendingOffer: SecretarySkinPendingOffer | null = null;
  if (deferredOffers.length > 0) {
    const [head, ...rest] = deferredOffers;
    pendingOffer = head;
    deferredOffers = rest;
  }
  return {
    ...state,
    secretarySkins: {
      ...skins,
      unlocked: { ...skins.unlocked, [offer.secretaryId]: unlocked },
      equipped: { ...skins.equipped, [offer.secretaryId]: skinId },
      rewardClaimed,
      pendingOffer,
      deferredOffers,
    },
  };
}

export function equipSecretarySkin(
  state: GameState,
  secretaryId: SecretaryId,
  skinId: SecretaryUnlockableSkinId | null,
): GameState {
  if (!state.secretaryUnlocks[secretaryId]) return state;
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  const unlocked = skins.unlocked[secretaryId] ?? [];
  const equipped = { ...skins.equipped };
  if (skinId == null) {
    delete equipped[secretaryId];
  } else {
    if (!unlocked.includes(skinId)) return state;
    equipped[secretaryId] = skinId;
  }
  return { ...state, secretarySkins: { ...skins, equipped } };
}

export function secretaryHasUnlockedSkin(
  state: { secretarySkins?: SecretarySkinsState },
  secretaryId: SecretaryId,
  skinId: SecretaryUnlockableSkinId,
): boolean {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  return (skins.unlocked[secretaryId] ?? []).includes(skinId);
}

export function equippedSecretarySkinId(
  state: { secretarySkins?: SecretarySkinsState },
  secretaryId: SecretaryId,
): SecretaryUnlockableSkinId | null {
  const skins = state.secretarySkins ?? createInitialSecretarySkinsState();
  const skin = skins.equipped[secretaryId];
  if (!skin) return null;
  if (!(skins.unlocked[secretaryId] ?? []).includes(skin)) return null;
  return skin;
}

export function secretarySkinOnSiteWorkPct(
  state: { secretarySkins?: SecretarySkinsState },
  teamLeadId: SecretaryId,
  locationType: JobLocationType | undefined,
): number {
  if (locationType !== "hospital") return 0;
  const skin = equippedSecretarySkinId(state, teamLeadId);
  if (skin === "nurse") return NURSE_HOSPITAL_WORK_PCT;
  return 0;
}

export function secretarySkinOnSiteWorkPctForEngagement(
  state: {
    secretarySkins?: SecretarySkinsState;
    jobPostings?: import("./types").JobPosting[];
  },
  teamLeadId: SecretaryId | null | undefined,
  definitionId?: string,
): number {
  if (!teamLeadId || !definitionId) return 0;
  try {
    const def = jobDefinitionById(definitionId, state.jobPostings ?? []);
    return secretarySkinOnSiteWorkPct(state, teamLeadId, def.locationType);
  } catch {
    return 0;
  }
}

export function devMaxSecretaryProgress(
  state: GameState,
  secretaryId: SecretaryId,
): GameState {
  if (!state.secretaryUnlocks[secretaryId]) return state;
  const current =
    state.secretaryProgress[secretaryId] ?? createInitialSecretaryProgress();
  const chiefSkillRanks = { ...current.chiefSkillRanks };
  const teamLeadSkillRanks = { ...current.teamLeadSkillRanks };
  for (const node of CHIEF_SKILL_NODES) {
    chiefSkillRanks[node as ChiefSkillNodeId] =
      CHIEF_SKILL_DEFS[node as ChiefSkillNodeId].maxRank;
  }
  for (const node of TEAM_LEAD_SKILL_NODES) {
    teamLeadSkillRanks[node as TeamLeadSkillNodeId] =
      TEAM_LEAD_SKILL_DEFS[node as TeamLeadSkillNodeId].maxRank;
  }
  const progress: SecretaryProgress = {
    level: SECRETARY_MAX_LEVEL,
    exp: 0,
    unspentSkillPoints: 0,
    chiefSkillRanks,
    teamLeadSkillRanks,
  };
  const withProgress: GameState = {
    ...state,
    secretaryProgress: {
      ...state.secretaryProgress,
      [secretaryId]: progress,
    },
  };
  return checkSecretarySkinOffers(withProgress, state, secretaryId);
}
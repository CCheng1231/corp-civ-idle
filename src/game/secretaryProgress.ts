import { DEFAULT_CHIEF_OF_STAFF_ID, SECRETARY_IDS } from "./secretaryData";
import {
  CHIEF_SKILL_NODES,
  emptyChiefSkillRanks,
  emptyOnSiteSkillRanks,
  emptyTeamLeadSkillRanks,
  expRequiredForNextLevel,
  GACHA_SECRETARY_IDS,
  SECRETARY_MAX_LEVEL,
  SKILL_POINTS_PER_LEVEL,
  skillTreesFor,
  TEAM_LEAD_SKILL_NODES,
  ON_SITE_SKILL_NODES,
  type TeamLeadSkillNodeId,
} from "./secretarySkillData";
import {
  anySkillTreeMastered,
  canIncreaseSkillRank,
  type SecretarySkillTreeKey,
} from "./secretarySkillLogic";
import type {
  GameState,
  SecretaryId,
  SecretaryProgress,
  SecretaryRecruitmentState,
  SecretaryUnlocks,
} from "./types";

/** Ensures progress from a partial/old save has all skill rank maps. */
export function ensureSecretaryProgressShape(
  progress: SecretaryProgress,
): SecretaryProgress {
  if (
    progress.onSiteSkillRanks &&
    typeof progress.onSiteSkillRanks === "object"
  ) {
    return progress;
  }
  return normalizeSecretaryProgressEntry(progress);
}

export function createInitialSecretaryProgress(): SecretaryProgress {
  return {
    level: 1,
    exp: 0,
    unspentSkillPoints: 0,
    chiefSkillRanks: emptyChiefSkillRanks(),
    teamLeadSkillRanks: emptyTeamLeadSkillRanks(),
    onSiteSkillRanks: emptyOnSiteSkillRanks(),
  };
}

export function createInitialSecretaryUnlocks(): SecretaryUnlocks {
  const unlocks = Object.fromEntries(
    SECRETARY_IDS.map((id) => [id, false]),
  ) as SecretaryUnlocks;
  unlocks.secretary_01 = true;
  return unlocks;
}

export function createInitialSecretaryRecruitment(): SecretaryRecruitmentState {
  return {
    completedMilestones: [],
    pendingOffer: null,
    offerQueue: [],
  };
}

export function initializeSecretaryProgressMap(
  unlocks: SecretaryUnlocks,
  existing?: Partial<Record<SecretaryId, SecretaryProgress>>,
): Record<SecretaryId, SecretaryProgress> {
  const progress = { ...existing } as Record<SecretaryId, SecretaryProgress>;
  for (const id of SECRETARY_IDS) {
    if (!unlocks[id]) continue;
    if (!progress[id]) {
      progress[id] = createInitialSecretaryProgress();
    }
  }
  return progress;
}

export function secretaryIsUnlocked(
  state: Pick<GameState, "secretaryUnlocks">,
  id: SecretaryId,
): boolean {
  return state.secretaryUnlocks[id] === true;
}

export function normalizeSecretaryUnlocks(
  raw: unknown,
  xaihiUnlocked: boolean,
): SecretaryUnlocks {
  const base = createInitialSecretaryUnlocks();
  if (raw && typeof raw === "object") {
    for (const id of SECRETARY_IDS) {
      if ((raw as Record<string, unknown>)[id] === true) {
        base[id] = true;
      }
    }
  }
  base.secretary_01 = true;
  if (xaihiUnlocked) base.secretary_02 = true;
  return base;
}

function normalizeSkillRanks<T extends string>(
  raw: unknown,
  keys: readonly T[],
  empty: () => Record<T, number>,
): Record<T, number> {
  const ranks = empty();
  if (!raw || typeof raw !== "object") return ranks;
  const parsed = raw as Record<string, unknown>;
  for (const key of keys) {
    const val = parsed[key];
    if (typeof val === "number" && Number.isFinite(val)) {
      ranks[key] = Math.max(0, Math.floor(val));
    }
  }
  return ranks;
}

function migrateLegacyTeamLeadRanks(
  ranks: Record<TeamLeadSkillNodeId, number>,
  raw: Record<string, unknown> | undefined,
): Record<TeamLeadSkillNodeId, number> {
  if (!raw) return ranks;
  const legacyWork = raw.lead_work_time;
  if (
    typeof legacyWork === "number" &&
    (ranks.lead_work ?? 0) === 0
  ) {
    ranks.lead_work = Math.max(0, Math.floor(legacyWork));
  }
  const legacyIncome = raw.lead_job_income;
  if (
    typeof legacyIncome === "number" &&
    (ranks.lead_payout ?? 0) === 0
  ) {
    ranks.lead_payout = Math.max(0, Math.floor(legacyIncome));
  }
  return ranks;
}

export function normalizeSecretaryProgressEntry(
  raw: unknown,
): SecretaryProgress {
  const base = createInitialSecretaryProgress();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Record<string, unknown>;
  const level =
    typeof parsed.level === "number" && Number.isFinite(parsed.level)
      ? Math.min(SECRETARY_MAX_LEVEL, Math.max(1, Math.floor(parsed.level)))
      : base.level;
  const exp =
    typeof parsed.exp === "number" && Number.isFinite(parsed.exp)
      ? Math.max(0, Math.floor(parsed.exp))
      : base.exp;
  const unspentSkillPoints =
    typeof parsed.unspentSkillPoints === "number" &&
    Number.isFinite(parsed.unspentSkillPoints)
      ? Math.max(0, Math.floor(parsed.unspentSkillPoints))
      : base.unspentSkillPoints;
  const chiefSkillRanks = normalizeSkillRanks(
    parsed.chiefSkillRanks,
    CHIEF_SKILL_NODES,
    emptyChiefSkillRanks,
  );
  let teamLeadSkillRanks = normalizeSkillRanks(
    parsed.teamLeadSkillRanks,
    TEAM_LEAD_SKILL_NODES,
    emptyTeamLeadSkillRanks,
  );
  teamLeadSkillRanks = migrateLegacyTeamLeadRanks(
    teamLeadSkillRanks,
    parsed.teamLeadSkillRanks as Record<string, unknown> | undefined,
  );
  return {
    level,
    exp,
    unspentSkillPoints,
    chiefSkillRanks,
    teamLeadSkillRanks,
    onSiteSkillRanks: normalizeSkillRanks(
      parsed.onSiteSkillRanks,
      ON_SITE_SKILL_NODES,
      emptyOnSiteSkillRanks,
    ),
  };
}

export function normalizeSecretaryProgressMap(
  raw: unknown,
  unlocks: SecretaryUnlocks,
): Record<SecretaryId, SecretaryProgress> {
  const map = initializeSecretaryProgressMap(unlocks);
  if (!raw || typeof raw !== "object") return map;
  for (const id of SECRETARY_IDS) {
    if (!unlocks[id]) continue;
    const entry = (raw as Record<string, unknown>)[id];
    if (entry) {
      map[id] = normalizeSecretaryProgressEntry(entry);
    }
  }
  return map;
}

export function normalizeSecretaryRecruitment(
  raw: unknown,
): SecretaryRecruitmentState {
  const base = createInitialSecretaryRecruitment();
  if (!raw || typeof raw !== "object") return base;
  const parsed = raw as Record<string, unknown>;
  const completed =
    Array.isArray(parsed.completedMilestones) &&
    parsed.completedMilestones.every((m) => typeof m === "string")
      ? (parsed.completedMilestones as SecretaryRecruitmentState["completedMilestones"])
      : base.completedMilestones;
  const offerQueue =
    Array.isArray(parsed.offerQueue) &&
    parsed.offerQueue.every((m) => typeof m === "string")
      ? (parsed.offerQueue as SecretaryRecruitmentState["offerQueue"])
      : base.offerQueue;
  let pendingOffer = base.pendingOffer;
  const offerRaw = parsed.pendingOffer;
  if (offerRaw && typeof offerRaw === "object") {
    const o = offerRaw as Record<string, unknown>;
    if (
      typeof o.milestoneId === "string" &&
      (o.phase === "offer" ||
        o.phase === "animating" ||
        o.phase === "revealed") &&
      (o.revealedId === undefined ||
        (typeof o.revealedId === "string" &&
          SECRETARY_IDS.includes(o.revealedId as SecretaryId)))
    ) {
      pendingOffer = {
        milestoneId: o.milestoneId as import("./types").SecretaryRecruitMilestoneId,
        phase: o.phase as "offer" | "animating" | "revealed",
        revealedId: o.revealedId as SecretaryId | undefined,
      };
    }
  }
  return {
    completedMilestones: completed,
    offerQueue,
    pendingOffer,
  };
}

export function unlockSecretary(
  state: GameState,
  id: SecretaryId,
): GameState {
  if (state.secretaryUnlocks[id]) return state;
  const secretaryUnlocks = { ...state.secretaryUnlocks, [id]: true };
  const secretaryProgress = {
    ...state.secretaryProgress,
    [id]: state.secretaryProgress[id] ?? createInitialSecretaryProgress(),
  };
  return { ...state, secretaryUnlocks, secretaryProgress };
}

export function syncLegacyGovUnlocks(state: GameState): GameState {
  let next = state;
  if (state.govProgram?.xaihiUnlocked && !state.secretaryUnlocks.secretary_02) {
    next = unlockSecretary(next, "secretary_02");
  }
  return next;
}

export function lockedGachaPool(
  state: Pick<GameState, "secretaryUnlocks">,
): SecretaryId[] {
  return GACHA_SECRETARY_IDS.filter((id) => !state.secretaryUnlocks[id]);
}

export function secretaryFullyMastered(
  secretaryId: SecretaryId,
  progress: SecretaryProgress,
): boolean {
  return anySkillTreeMastered(
    secretaryId,
    progress.level,
    progress,
    SECRETARY_MAX_LEVEL,
  );
}

export function anySecretaryFullyMastered(
  state: Pick<GameState, "secretaryUnlocks" | "secretaryProgress">,
): boolean {
  for (const id of SECRETARY_IDS) {
    if (!state.secretaryUnlocks[id]) continue;
    const progress = state.secretaryProgress[id];
    if (progress && secretaryFullyMastered(id, progress)) return true;
  }
  return false;
}

export interface GrantExpResult {
  state: GameState;
  levelsGained: number;
  secretaryId: SecretaryId;
}

export function grantSecretaryExp(
  state: GameState,
  secretaryId: SecretaryId,
  amount: number,
): GrantExpResult {
  if (amount <= 0 || !state.secretaryUnlocks[secretaryId]) {
    return { state, levelsGained: 0, secretaryId };
  }
  const current = state.secretaryProgress[secretaryId] ?? createInitialSecretaryProgress();
  let level = current.level;
  let exp = current.exp + Math.floor(amount);
  let unspentSkillPoints = current.unspentSkillPoints;
  let levelsGained = 0;

  while (level < SECRETARY_MAX_LEVEL) {
    const need = expRequiredForNextLevel(level);
    if (need <= 0 || exp < need) break;
    exp -= need;
    level += 1;
    levelsGained += 1;
    unspentSkillPoints += SKILL_POINTS_PER_LEVEL;
  }

  const secretaryProgress = {
    ...state.secretaryProgress,
    [secretaryId]: {
      ...current,
      level,
      exp,
      unspentSkillPoints,
    },
  };
  return {
    state: { ...state, secretaryProgress },
    levelsGained,
    secretaryId,
  };
}

function treeKeyToDef(
  trees: ReturnType<typeof skillTreesFor>,
  tree: SecretarySkillTreeKey,
) {
  if (tree === "chief") return trees.chief;
  if (tree === "teamLead") return trees.teamLead;
  return trees.onSite;
}

export function spendSecretarySkillPoint(
  state: GameState,
  secretaryId: SecretaryId,
  tree: SecretarySkillTreeKey,
  nodeId: string,
): GameState {
  if (!state.secretaryUnlocks[secretaryId]) return state;
  const current = state.secretaryProgress[secretaryId] ?? createInitialSecretaryProgress();
  const trees = skillTreesFor(secretaryId);
  const treeDef = treeKeyToDef(trees, tree);
  const node = treeDef.nodes.find((n) => n.id === nodeId);
  if (!node) return state;

  const ranks: Record<string, number> =
    tree === "chief"
      ? current.chiefSkillRanks
      : tree === "teamLead"
        ? current.teamLeadSkillRanks
        : current.onSiteSkillRanks;
  if (
    !canIncreaseSkillRank(
      treeDef,
      ranks,
      node,
      current.unspentSkillPoints,
    )
  ) {
    return state;
  }
  const nextRank = (ranks[node.id] ?? 0) + 1;
  const nextProgress: SecretaryProgress = { ...current };
  nextProgress.unspentSkillPoints = current.unspentSkillPoints - 1;
  if (tree === "chief") {
    nextProgress.chiefSkillRanks = {
      ...current.chiefSkillRanks,
      [node.id]: nextRank,
    };
  } else if (tree === "teamLead") {
    nextProgress.teamLeadSkillRanks = {
      ...current.teamLeadSkillRanks,
      [node.id]: nextRank,
    };
  } else {
    nextProgress.onSiteSkillRanks = {
      ...current.onSiteSkillRanks,
      [node.id]: nextRank,
    };
  }
  return {
    ...state,
    secretaryProgress: {
      ...state.secretaryProgress,
      [secretaryId]: nextProgress,
    },
  };
}

export function normalizeChiefAgainstUnlocks(
  chiefId: SecretaryId,
  unlocks: SecretaryUnlocks,
): SecretaryId {
  if (unlocks[chiefId]) return chiefId;
  if (unlocks[DEFAULT_CHIEF_OF_STAFF_ID]) return DEFAULT_CHIEF_OF_STAFF_ID;
  const first = SECRETARY_IDS.find((id) => unlocks[id]);
  return first ?? DEFAULT_CHIEF_OF_STAFF_ID;
}

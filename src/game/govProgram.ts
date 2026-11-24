import {
  applyOfficeRefund,
  canAffordAtOffice,
  canBuildStructure,
  getStructureDefinition,
  isStructureCompletedAtSite,
  isStructureQueueFull,
  isStructureQueuedAt,
  isStructureUnlocked,
  sortStructuresForBuildTab,
  STRUCTURE_CATEGORY_ORDER,
  rosterAt,
  structurePanelStructures,
} from "./constants";
import { researchCost, structureCost } from "./engineQueues";
import { RECRUITMENT_UNITS } from "./recruitmentData";
import {
  GOV_CHARTER_JOB,
  GOV_DAILY_QUESTS,
  GOV_EXECUTIVE_STEPS,
  GOV_GROWTH_STEPS,
  GOV_MONTHLY_QUESTS,
  GOV_RECRUIT_UNLOCK_COUNT,
  GOV_WEEKLY_QUESTS,
  type GovGrowthStepDefinition,
  type GovProgramReward,
} from "./govProgramData";
import { isHomeHubMainView } from "./hubNavigation";
import { resolveOfficeLocation } from "./officeSelection";
import { appendActivityLogs } from "./logbook";
import { pendingJobReports } from "./secretaryBriefing";
import {
  RESEARCH,
  isResearchQueueFull,
  isResearchQueued,
  isResearchUnlocked,
} from "./constants";
import { unlockSecretary } from "./secretaryProgress";
import { formatAssignmentSummary } from "./unitEffects";
import {
  DEFAULT_JOB_BOARD_FILTERS,
  filterAndSortJobPostings,
  openJobPostings,
  sortJobPostingsByDistanceFromMainOffice,
} from "./jobBoard";
import { jobDefinitionForPosting } from "./jobs";
import { jobSiteCoordForPosting } from "./mapWorld";
import { mapHexInfo, mapHexTitle } from "../components/mapHexInfo";
import type {
  GameState,
  GovProgramState,
  OfficeLocationId,
  StructureDefinition,
  StructureId,
  UnitAssignment,
} from "./types";

export const GOV_CHARTER_DEFINITION_ID = GOV_CHARTER_JOB.definitionId;

const MS_DAY = 86_400_000;

function migrateExecutiveStepId(id: string | null): string | null {
  if (id === "exec_lafe_beat") return "exec_surtr_beat";
  return id;
}

function migrateExecutiveCompletedStepIds(ids: string[]): string[] {
  return ids.map((id) => (id === "exec_lafe_beat" ? "exec_surtr_beat" : id));
}

function migrateGovProgramModal(raw: unknown): GovProgramState["pendingModal"] {
  if (raw === "gessesa_intro" || raw === "xaihi_intro") return "xaihi_intro";
  if (raw === "lafe_beat" || raw === "surtr_beat") return "surtr_beat";
  if (raw === "decline_growth") return "decline_growth";
  if (raw === "structure_queue_coach") return "structure_queue_coach";
  if (raw === "structure_queue_intro") return "structure_queue_intro";
  if (raw === "recruit_set_qty_intro") return "recruit_set_qty_intro";
  if (raw === "recruit_queue_intro") return "recruit_queue_intro";
  if (raw === "recruit_first_queue_coach") return "recruit_first_queue_coach";
  if (raw === "recruit_step_coach") return "recruit_step_coach";
  if (raw === "research_queue_intro") return "research_queue_intro";
  if (raw === "growth_step_coach") return "growth_step_coach";
  if (raw === "growth_job_travel_coach") return "growth_job_travel_coach";
  if (raw === "map_filter_intro") return "map_filter_intro";
  if (raw === "growth_report_intro") return "growth_report_intro";
  if (raw === "growth_research_intro") return "growth_research_intro";
  if (raw === "growth_bm_hint_intro") return "growth_bm_hint_intro";
  if (raw === "growth_bm_hired_intro") return "growth_bm_hired_intro";
  return null;
}

export function createInitialGovProgram(): GovProgramState {
  return {
    growthDeclined: false,
    growthAccepted: false,
    growthStepId: null,
    growthCompletedStepIds: [],
    charterSkipped: false,
    charterCompleted: false,
    executiveStepId: null,
    executiveCompletedStepIds: [],
    lifetimeRecruits: 0,
    xaihiUnlocked: false,
    xaihiIntroSeen: false,
    pendingModal: null,
    chiefLessonPending: false,
    mapSiteInspected: false,
    growthReplayAt: null,
    growthReplayRecruitBaseline: null,
    growthStepStartedAt: null,
    growthReportDismissedBaseline: null,
    growthStructureCoach: null,
    structureQueueCoachJobId: null,
    structureQueueCoachRewardCash: null,
    structureQueueCoachRewardSupply: null,
    structureQueueCoachRewardConnection: null,
    growthRecruitCoach: null,
    growthMapCoach: null,
    growthMapCoachPostingId: null,
    growthMapCoachSiteLabel: null,
    growthJobCoach: null,
    growthJobCoachPostingId: null,
    growthReportCoach: null,
    growthResearchCoach: null,
    growthResearchCoachResearchId: null,
    growthBmCoach: null,
    growthRecruitFirstQueueCoachDone: false,
    calendar: {
      activeDailyQuestId: GOV_DAILY_QUESTS[0]?.questId ?? null,
      activeWeeklyQuestId: GOV_WEEKLY_QUESTS[0]?.questId ?? null,
      activeMonthlyQuestId: GOV_MONTHLY_QUESTS[0]?.questId ?? null,
      lastDailyClaimAt: null,
      lastWeeklyClaimAt: null,
      lastMonthlyClaimAt: null,
      dailyProgress: 0,
      weeklyProgress: 0,
      monthlyProgress: 0,
    },
  };
}

export function normalizeGovProgram(
  raw: unknown,
  rosterFallbackRecruits: number,
): GovProgramState {
  const base = createInitialGovProgram();
  if (!raw || typeof raw !== "object") {
    return {
      ...base,
      lifetimeRecruits: rosterFallbackRecruits,
    };
  }
  const parsed = raw as Record<string, unknown>;
  const calendarRaw = parsed.calendar as Record<string, unknown> | undefined;
  return {
    ...base,
    growthDeclined: parsed.growthDeclined === true,
    growthAccepted: parsed.growthAccepted === true,
    growthStepId: migrateGrowthStepId(
      typeof parsed.growthStepId === "string" ? parsed.growthStepId : null,
    ),
    growthCompletedStepIds: Array.isArray(parsed.growthCompletedStepIds)
      ? parsed.growthCompletedStepIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    charterSkipped: parsed.charterSkipped === true,
    charterCompleted: parsed.charterCompleted === true,
    executiveStepId: migrateExecutiveStepId(
      typeof parsed.executiveStepId === "string"
        ? parsed.executiveStepId
        : null,
    ),
    executiveCompletedStepIds: migrateExecutiveCompletedStepIds(
      Array.isArray(parsed.executiveCompletedStepIds)
        ? parsed.executiveCompletedStepIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
    ),
    lifetimeRecruits:
      typeof parsed.lifetimeRecruits === "number" &&
      Number.isFinite(parsed.lifetimeRecruits)
        ? Math.max(0, Math.floor(parsed.lifetimeRecruits))
        : rosterFallbackRecruits,
    xaihiUnlocked:
      parsed.xaihiUnlocked === true || parsed.gessesaUnlocked === true,
    xaihiIntroSeen:
      parsed.xaihiIntroSeen === true || parsed.gessesaIntroSeen === true,
    pendingModal: migrateGovProgramModal(parsed.pendingModal),
    chiefLessonPending: parsed.chiefLessonPending === true,
    mapSiteInspected: parsed.mapSiteInspected === true,
    growthReplayAt:
      typeof parsed.growthReplayAt === "number" ? parsed.growthReplayAt : null,
    growthReplayRecruitBaseline:
      typeof parsed.growthReplayRecruitBaseline === "number"
        ? parsed.growthReplayRecruitBaseline
        : null,
    growthStepStartedAt:
      typeof parsed.growthStepStartedAt === "number"
        ? parsed.growthStepStartedAt
        : null,
    growthReportDismissedBaseline:
      typeof parsed.growthReportDismissedBaseline === "number"
        ? parsed.growthReportDismissedBaseline
        : null,
    growthStructureCoach:
      parsed.growthStructureCoach === "go_home" ||
      parsed.growthStructureCoach === "pick_structure_tab" ||
      parsed.growthStructureCoach === "pick_upgrade"
        ? parsed.growthStructureCoach
        : null,
    structureQueueCoachJobId:
      typeof parsed.structureQueueCoachJobId === "string"
        ? parsed.structureQueueCoachJobId
        : null,
    structureQueueCoachRewardCash:
      typeof parsed.structureQueueCoachRewardCash === "number"
        ? parsed.structureQueueCoachRewardCash
        : null,
    structureQueueCoachRewardSupply:
      typeof parsed.structureQueueCoachRewardSupply === "number"
        ? parsed.structureQueueCoachRewardSupply
        : null,
    structureQueueCoachRewardConnection:
      typeof parsed.structureQueueCoachRewardConnection === "number"
        ? parsed.structureQueueCoachRewardConnection
        : null,
    growthRecruitCoach:
      parsed.growthRecruitCoach === "set_qty" ||
      parsed.growthRecruitCoach === "pick_queue" ||
      parsed.growthRecruitCoach === "pick_unit"
        ? parsed.growthRecruitCoach === "pick_unit"
          ? "pick_queue"
          : (parsed.growthRecruitCoach as "set_qty" | "pick_queue")
        : null,
    growthRecruitFirstQueueCoachDone:
      parsed.growthRecruitFirstQueueCoachDone === true,
    growthMapCoach:
      parsed.growthMapCoach === "filter_intro" ||
      parsed.growthMapCoach === "filter_tier" ||
      parsed.growthMapCoach === "pick_job" ||
      parsed.growthMapCoach === "drawer_title" ||
      parsed.growthMapCoach === "drawer_region" ||
      parsed.growthMapCoach === "drawer_distance" ||
      parsed.growthMapCoach === "drawer_contracts" ||
      parsed.growthMapCoach === "inspect_drawer"
        ? parsed.growthMapCoach === "inspect_drawer"
          ? "drawer_title"
          : parsed.growthMapCoach
        : null,
    growthMapCoachPostingId:
      typeof parsed.growthMapCoachPostingId === "string"
        ? parsed.growthMapCoachPostingId
        : null,
    growthMapCoachSiteLabel:
      typeof parsed.growthMapCoachSiteLabel === "string"
        ? parsed.growthMapCoachSiteLabel
        : null,
    growthJobCoach:
      parsed.growthJobCoach === "pick_job" ||
      parsed.growthJobCoach === "map_send" ||
      parsed.growthJobCoach === "map_engage_open" ||
      parsed.growthJobCoach === "map_engage_intro" ||
      parsed.growthJobCoach === "map_engage_crew_qty" ||
      parsed.growthJobCoach === "map_engage" ||
      parsed.growthJobCoach === "map_travel" ||
      parsed.growthJobCoach === "office_engage"
        ? parsed.growthJobCoach === "office_engage"
          ? "map_engage"
          : parsed.growthJobCoach
        : null,
    growthJobCoachPostingId:
      typeof parsed.growthJobCoachPostingId === "string"
        ? parsed.growthJobCoachPostingId
        : null,
    growthReportCoach:
      parsed.growthReportCoach === "open_secretary" ||
      parsed.growthReportCoach === "open_job" ||
      parsed.growthReportCoach === "reports_tab" ||
      parsed.growthReportCoach === "dismiss_report"
        ? parsed.growthReportCoach
        : null,
    growthResearchCoach:
      parsed.growthResearchCoach === "open_research" ||
      parsed.growthResearchCoach === "pick_project"
        ? parsed.growthResearchCoach
        : null,
    growthResearchCoachResearchId:
      typeof parsed.growthResearchCoachResearchId === "string"
        ? parsed.growthResearchCoachResearchId
        : null,
    growthBmCoach:
      parsed.growthBmCoach === "open_recruit" ||
      parsed.growthBmCoach === "pick_unit" ||
      parsed.growthBmCoach === "pick_queue"
        ? parsed.growthBmCoach
        : null,
    calendar: {
      ...base.calendar,
      activeDailyQuestId:
        typeof calendarRaw?.activeDailyQuestId === "string"
          ? calendarRaw.activeDailyQuestId
          : base.calendar.activeDailyQuestId,
      activeWeeklyQuestId:
        typeof calendarRaw?.activeWeeklyQuestId === "string"
          ? calendarRaw.activeWeeklyQuestId
          : base.calendar.activeWeeklyQuestId,
      activeMonthlyQuestId:
        typeof calendarRaw?.activeMonthlyQuestId === "string"
          ? calendarRaw.activeMonthlyQuestId
          : base.calendar.activeMonthlyQuestId,
      lastDailyClaimAt:
        typeof calendarRaw?.lastDailyClaimAt === "number"
          ? calendarRaw.lastDailyClaimAt
          : null,
      lastWeeklyClaimAt:
        typeof calendarRaw?.lastWeeklyClaimAt === "number"
          ? calendarRaw.lastWeeklyClaimAt
          : null,
      lastMonthlyClaimAt:
        typeof calendarRaw?.lastMonthlyClaimAt === "number"
          ? calendarRaw.lastMonthlyClaimAt
          : null,
      dailyProgress: Number(calendarRaw?.dailyProgress ?? 0) || 0,
      weeklyProgress: Number(calendarRaw?.weeklyProgress ?? 0) || 0,
      monthlyProgress: Number(calendarRaw?.monthlyProgress ?? 0) || 0,
    },
  };
}

export function lifetimeRecruitsFromRoster(state: GameState): number {
  let total = 0;
  for (const roster of Object.values(state.contractorsByLocation)) {
    for (const count of Object.values(roster)) {
      total += count ?? 0;
    }
  }
  return total;
}

function gp(state: GameState): GovProgramState {
  return state.govProgram ?? createInitialGovProgram();
}

function withGov(state: GameState, govProgram: GovProgramState): GameState {
  let next = { ...state, govProgram };
  if (govProgram.xaihiUnlocked) {
    next = unlockSecretary(next, "secretary_02");
  }
  return next;
}

function applyRewardAtHq(
  state: GameState,
  reward: GovProgramReward,
): GameState {
  if (!reward.cash && !reward.supply && !reward.connection) return state;
  return applyOfficeRefund(state, "hq", {
    cash: reward.cash ?? 0,
    supply: reward.supply ?? 0,
    connection: reward.connection ?? 0,
  });
}

function migrateGrowthStepId(stepId: string | null): string | null {
  if (stepId === "growth_map") return "growth_job";
  return stepId;
}

function growthStepDef(stepId: string) {
  return GOV_GROWTH_STEPS.find((s) => s.stepId === stepId);
}

function executiveStepDef(stepId: string) {
  return GOV_EXECUTIVE_STEPS.find((s) => s.stepId === stepId);
}

function nextGrowthStepId(completed: string[]): string | null {
  for (const step of GOV_GROWTH_STEPS) {
    if (!completed.includes(step.stepId)) return step.stepId;
  }
  return null;
}

function nextExecutiveStepId(completed: string[]): string | null {
  for (const step of GOV_EXECUTIVE_STEPS) {
    if (!completed.includes(step.stepId)) return step.stepId;
  }
  return null;
}

export function govEngageLockActive(state: GameState): boolean {
  const g = gp(state);
  if (!g.growthAccepted || g.growthDeclined) return false;
  if (g.charterSkipped || g.charterCompleted) return false;
  if (g.lifetimeRecruits < GOV_RECRUIT_UNLOCK_COUNT) return false;
  if (g.executiveCompletedStepIds.includes("exec_complete")) return false;
  if (!g.executiveStepId) return false;
  return true;
}

export function govGrowthTrackReplayActive(state: GameState): boolean {
  const g = gp(state);
  return (
    g.growthReplayAt != null &&
    g.growthAccepted &&
    !g.growthDeclined &&
    g.growthStepId != null
  );
}

export function govGrowthTrackPaused(state: GameState): boolean {
  if (govGrowthTrackReplayActive(state)) return false;
  return govEngageLockActive(state);
}

export function govExecutiveTrackActive(state: GameState): boolean {
  const g = gp(state);
  if (govGrowthTrackReplayActive(state)) return false;
  return (
    g.growthAccepted &&
    !g.growthDeclined &&
    !g.charterSkipped &&
    g.lifetimeRecruits >= GOV_RECRUIT_UNLOCK_COUNT
  );
}

function completeExecutiveStep(
  state: GameState,
  stepId: string,
  reward?: { cash: number; supply: number },
): GameState {
  let g = { ...gp(state) };
  if (g.executiveCompletedStepIds.includes(stepId)) return state;
  g.executiveCompletedStepIds = [...g.executiveCompletedStepIds, stepId];
  let next = state;
  if (reward && (reward.cash || reward.supply)) {
    next = applyRewardAtHq(next, reward);
  }
  if (stepId === "exec_intro") {
    g.xaihiIntroSeen = true;
    g.xaihiUnlocked = true;
  }
  if (stepId === "exec_charter_return") {
    g.charterCompleted = true;
  }
  if (stepId === "exec_chief_switch") {
    g.chiefLessonPending = false;
    g.executiveCompletedStepIds = [...g.executiveCompletedStepIds, "exec_complete"];
    g.executiveStepId = null;
  } else {
    g.executiveStepId = nextExecutiveStepId(g.executiveCompletedStepIds);
  }
  next = withGov(next, g);
  return syncExecutiveSideEffects(next);
}

function syncExecutiveSideEffects(state: GameState): GameState {
  let g = { ...gp(state) };
  const step = g.executiveStepId;
  if (step === "exec_intro" && !g.xaihiIntroSeen) {
    g.pendingModal = "xaihi_intro";
  } else if (step === "exec_surtr_beat") {
    g.pendingModal = "surtr_beat";
  } else if (step === "exec_chief_switch") {
    g.chiefLessonPending = true;
    g.pendingModal = null;
  } else if (g.pendingModal === "xaihi_intro" && g.xaihiIntroSeen) {
    g.pendingModal = null;
  }
  return withGov(state, g);
}

function completeGrowthStep(state: GameState, stepId: string): GameState {
  const g = { ...gp(state) };
  if (g.growthCompletedStepIds.includes(stepId)) return state;
  const def = growthStepDef(stepId);
  g.growthCompletedStepIds = [...g.growthCompletedStepIds, stepId];
  let next = state;
  if (def?.reward) {
    next = applyRewardAtHq(next, def.reward);
  }
  const nextStepId = nextGrowthStepId(g.growthCompletedStepIds);
  g.growthStepId = nextStepId;
  g.growthStepStartedAt = Date.now();
  g.growthReportDismissedBaseline = next.dismissedJobReportIds?.length ?? 0;
  let result = withGov(next, g);
  if (nextStepId === "growth_bm_hint") {
    result = withGov(result, {
      ...gp(result),
      pendingModal: "growth_bm_hint_intro",
    });
  }
  if (nextStepId === "growth_bm_hired") {
    result = withGov(result, {
      ...gp(result),
      pendingModal: "growth_bm_hired_intro",
    });
  }
  return result;
}

function maybeStartExecutiveAtTen(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.lifetimeRecruits < GOV_RECRUIT_UNLOCK_COUNT) return state;
  if (g.xaihiUnlocked && g.growthDeclined) return state;
  if (g.growthDeclined) {
    if (!g.xaihiUnlocked) {
      g.xaihiUnlocked = true;
      g.pendingModal = g.xaihiIntroSeen ? null : "xaihi_intro";
    }
    return withGov(state, g);
  }
  if (!g.growthAccepted || g.charterSkipped) {
    if (!g.xaihiUnlocked) {
      g.xaihiUnlocked = true;
      g.pendingModal = g.xaihiIntroSeen ? null : "xaihi_intro";
    }
    return withGov(state, g);
  }
  if (g.executiveStepId || g.executiveCompletedStepIds.length > 0) {
    return syncExecutiveSideEffects(state);
  }
  g.executiveStepId = "exec_unlock";
  return withGov(state, g);
}

export function govOnRecruitsCompleted(
  state: GameState,
  hireCount: number,
): GameState {
  if (hireCount <= 0) return state;
  const g = { ...gp(state) };
  g.lifetimeRecruits += hireCount;
  let next = withGov(state, g);
  next = maybeStartExecutiveAtTen(next);
  const after = gp(next);
  if (
    after.growthStepId === "growth_recruit_push" &&
    !after.growthCompletedStepIds.includes("growth_recruit_push") &&
    growthObjectiveMet(next, "growth_recruit_push") &&
    after.pendingModal !== "recruit_step_coach"
  ) {
    const stepReward = growthStepDef("growth_recruit_push")?.reward;
    return {
      ...withGov(next, {
        ...after,
        pendingModal: "recruit_step_coach",
        structureQueueCoachRewardCash: stepReward?.cash ?? null,
        structureQueueCoachRewardSupply: stepReward?.supply ?? null,
        structureQueueCoachRewardConnection: stepReward?.connection ?? null,
      }),
      view: "recruitment",
    };
  }
  return evaluateGrowthObjectives(next);
}

export function govAcceptGrowthProgram(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.growthAccepted || g.growthDeclined) return state;
  g.growthAccepted = true;
  g.growthStepId = nextGrowthStepId(g.growthCompletedStepIds);
  g.growthStepStartedAt = Date.now();
  return withGov(state, g);
}

export function govDeclineGrowthProgram(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.growthDeclined) return state;
  g.growthDeclined = true;
  g.growthAccepted = false;
  g.growthStepId = null;
  g.pendingModal = null;
  let next = withGov(state, g);
  next = maybeStartExecutiveAtTen(next);
  return next;
}

export function govSkipCharter(state: GameState): GameState {
  const g = { ...gp(state) };
  if (!g.growthAccepted || g.growthDeclined || g.charterSkipped) return state;
  g.charterSkipped = true;
  g.charterCompleted = false;
  g.executiveStepId = null;
  g.executiveCompletedStepIds = [];
  g.chiefLessonPending = false;
  g.pendingModal = g.xaihiIntroSeen ? null : "xaihi_intro";
  if (!g.xaihiUnlocked) g.xaihiUnlocked = true;
  let next = withGov(state, g);
  next = evaluateGrowthObjectives(next);
  return next;
}

export function govDismissIntroModal(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.pendingModal === "xaihi_intro") {
    g.xaihiIntroSeen = true;
    g.xaihiUnlocked = true;
    g.pendingModal = null;
    let next = withGov(state, g);
    if (g.executiveStepId === "exec_intro") {
      next = completeExecutiveStep(next, "exec_intro");
    }
    return next;
  }
  if (g.pendingModal === "surtr_beat") {
    g.pendingModal = null;
    let next = withGov(state, g);
    if (g.executiveStepId === "exec_surtr_beat") {
      next = completeExecutiveStep(next, "exec_surtr_beat");
    }
    return next;
  }
  if (g.pendingModal === "structure_queue_intro") {
    g.pendingModal = "structure_queue_coach";
    return withGov(state, g);
  }
  if (g.pendingModal === "structure_queue_coach") {
    g.pendingModal = null;
    g.structureQueueCoachJobId = null;
    g.structureQueueCoachRewardCash = null;
    g.structureQueueCoachRewardSupply = null;
    g.structureQueueCoachRewardConnection = null;
    let next = withGov(state, g);
    if (
      !gp(next).growthCompletedStepIds.includes("growth_structure") &&
      gp(next).growthStepId === "growth_structure"
    ) {
      next = completeGrowthStep(next, "growth_structure");
    }
    return {
      ...next,
      view: "secretary",
      secretaryPanel: "govProgram",
    };
  }
  if (g.pendingModal === "recruit_set_qty_intro") {
    g.pendingModal = null;
    return withGov(state, g);
  }
  if (g.pendingModal === "map_filter_intro") {
    g.pendingModal = null;
    if (
      g.growthStepId === "growth_job" &&
      !g.mapSiteInspected &&
      (g.growthMapCoach === "filter_intro" || g.growthMapCoach == null)
    ) {
      g.growthMapCoach = "filter_tier";
    }
    return withGov(state, g);
  }
  if (g.pendingModal === "recruit_queue_intro") {
    g.pendingModal = "recruit_first_queue_coach";
    return withGov(state, g);
  }
  if (g.pendingModal === "recruit_first_queue_coach") {
    g.pendingModal = null;
    g.structureQueueCoachJobId = null;
    g.growthRecruitFirstQueueCoachDone = true;
    return withGov(state, g);
  }
  if (g.pendingModal === "recruit_step_coach") {
    g.pendingModal = null;
    g.structureQueueCoachRewardCash = null;
    g.structureQueueCoachRewardSupply = null;
    g.structureQueueCoachRewardConnection = null;
    let next = withGov(state, g);
    if (
      !gp(next).growthCompletedStepIds.includes("growth_recruit_push") &&
      gp(next).growthStepId === "growth_recruit_push"
    ) {
      next = completeGrowthStep(next, "growth_recruit_push");
    }
    return {
      ...next,
      view: "secretary",
      secretaryPanel: "govProgram",
    };
  }
  if (g.pendingModal === "research_queue_intro") {
    g.pendingModal = null;
    g.structureQueueCoachJobId = null;
    return evaluateGrowthObjectives(withGov(state, g));
  }
  if (g.pendingModal === "growth_report_intro") {
    g.pendingModal = null;
    let next = withGov(state, {
      ...g,
      growthReportCoach: "open_secretary",
    });
  return govAfterGrowthPathCoachViewChange(state, next);
  }
  if (g.pendingModal === "growth_research_intro") {
    const target = govResearchCoachTargetId(state);
    g.pendingModal = null;
    let next = withGov(state, {
      ...g,
      growthResearchCoach: "open_research",
      growthResearchCoachResearchId: target,
    });
    return govAfterGrowthPathCoachViewChange(state, next);
  }
  if (g.pendingModal === "growth_bm_hint_intro") {
    g.pendingModal = null;
    let next = withGov(state, g);
    if (gp(next).growthStepId === "growth_bm_hint") {
      next = completeGrowthStep(next, "growth_bm_hint");
      next = evaluateGrowthObjectives(next);
    }
    return next;
  }
  if (g.pendingModal === "growth_bm_hired_intro") {
    g.pendingModal = null;
    let next = withGov(state, {
      ...g,
      growthBmCoach: "open_recruit",
    });
    return govAfterGrowthPathCoachViewChange(state, next);
  }
  if (g.pendingModal === "growth_job_travel_coach") {
    g.pendingModal = null;
    let next = withGov(state, g);
    const after = gp(next);
    if (
      after.growthStepId === "growth_job" &&
      growthObjectiveMet(next, "growth_job")
    ) {
      const def = growthStepDef("growth_job");
      if (def && growthStepCelebrationEligible("growth_job", def)) {
        next = offerGrowthStepCelebration(next, "growth_job");
      } else {
        next = completeGrowthStep(next, "growth_job");
        next = evaluateGrowthObjectives(next);
      }
    }
    return { ...next, view: "world" };
  }
  if (g.pendingModal === "growth_step_coach") {
    const stepId = g.growthStepId;
    const completedStep =
      stepId ?? state.govProgram?.growthCompletedStepIds.at(-1) ?? null;
    g.pendingModal = null;
    g.structureQueueCoachJobId = null;
    g.structureQueueCoachRewardCash = null;
    g.structureQueueCoachRewardSupply = null;
    g.structureQueueCoachRewardConnection = null;
    let next = withGov(state, g);
    if (
      stepId &&
      !gp(next).growthCompletedStepIds.includes(stepId) &&
      gp(next).growthStepId === stepId &&
      growthObjectiveMet(next, stepId)
    ) {
      next = completeGrowthStep(next, stepId);
    }
    next = evaluateGrowthObjectives(next);
    const stayOnWorld =
      completedStep === "growth_job" || state.view === "world";
    return {
      ...next,
      view: stayOnWorld ? "world" : "secretary",
      secretaryPanel: stayOnWorld ? next.secretaryPanel : "govProgram",
    };
  }
  return state;
}

export type GovCoachSpotlightCue = {
  anchorId: string;
  message: string;
  /** No dim scrim — player can use the rest of the UI. */
  relaxed?: boolean;
  /** After showing, exit structure coach so the player is not stuck. */
  releaseCoach?: boolean;
  /** Dimmed coach — player can dismiss and use the rest of the UI. */
  dismissible?: boolean;
  dismissLabel?: string;
};

export function govReleaseStructureCoach(state: GameState): GameState {
  const g = gp(state);
  if (!g.growthStructureCoach) return state;
  return withGov(state, { ...g, growthStructureCoach: null });
}

export function govStartStructureCoach(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== "growth_structure"
  ) {
    return state;
  }
  return withGov(state, {
    ...g,
    growthStructureCoach: "go_home",
    pendingModal: null,
  });
}

export function govAfterStructureCoachViewChange(
  _prev: GameState,
  next: GameState,
): GameState {
  const g = gp(next);
  if (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== "growth_structure" ||
    !g.growthStructureCoach
  ) {
    return next;
  }
  if (g.growthStructureCoach === "go_home") {
    const onHome =
      next.view === "overview" || isHomeHubMainView(next.view);
    if (!onHome) return next;
    const nextPhase =
      next.view === "operations" ? "pick_upgrade" : "pick_structure_tab";
    return withGov(next, { ...g, growthStructureCoach: nextPhase });
  }
  if (g.growthStructureCoach === "pick_structure_tab" && next.view === "operations") {
    return withGov(next, { ...g, growthStructureCoach: "pick_upgrade" });
  }
  return next;
}

export function govStructureNavCoachActive(state: GameState): boolean {
  const g = gp(state);
  return (
    g.growthStepId === "growth_structure" &&
    g.growthAccepted &&
    !g.growthDeclined &&
    (g.growthStructureCoach === "go_home" ||
      g.growthStructureCoach === "pick_structure_tab")
  );
}

export function govStructureNavCoachCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (g.growthStructureCoach === "go_home") {
    return {
      anchorId: "gov-coach-anchor-home",
      message: "Tap Home in the shortcut bar.",
    };
  }
  if (g.growthStructureCoach === "pick_structure_tab") {
    if (state.view === "overview" && state.homePanel === "landing") {
      return {
        anchorId: "gov-coach-anchor-home-structure",
        message: "Open Structure to manage HQ builds.",
      };
    }
    return {
      anchorId: "gov-coach-anchor-home-section",
      message: "In Section, choose Structure.",
    };
  }
  return null;
}

export function govStructureUpgradeCoachCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  if (!govStructureCoachPickActive(state)) return null;
  const officeId = resolveOfficeLocation(state);
  const targetId = govStructureCoachTargetId(state, officeId);
  if (!targetId) return null;
  return {
    anchorId: `structure-card-${targetId}`,
    message: "Tap Upgrade on this build when you can afford it.",
  };
}

/** When pick_upgrade has no affordable card — queue full, broke, or nothing to build. */
export function govStructureUpgradeCoachBlockedCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  if (!govStructureCoachPickActive(state)) return null;
  if (govStructureUpgradeCoachCue(state)) return null;
  const officeId = resolveOfficeLocation(state);
  if (isStructureQueueFull(state, officeId)) {
    return {
      anchorId: "gov-coach-anchor-structure-queue-head",
      relaxed: true,
      message:
        "Queue is full. Wait for a build or cancel one — then tap Go to Structure on Gov't Prog.",
    };
  }
  let hasBuildable = false;
  let canAffordAny = false;
  for (const category of STRUCTURE_CATEGORY_ORDER) {
    const items = sortStructuresForBuildTab(
      category,
      structurePanelStructures().filter((s) => s.category === category),
    );
    for (const structure of items) {
      if (!isStructureUnlocked(state, structure.id)) continue;
      if (isStructureCompletedAtSite(state, officeId, structure)) continue;
      if (
        isStructureQueuedAt(state, officeId, structure.id) &&
        !isStructureCompletedAtSite(state, officeId, structure)
      ) {
        continue;
      }
      if (!canBuildStructure(state, officeId, structure.id)) continue;
      hasBuildable = true;
      if (state.settings.ignoreCosts) {
        canAffordAny = true;
        break;
      }
      const cost = structureCost(state, officeId, structure.id);
      if (canAffordAtOffice(state, officeId, cost)) {
        canAffordAny = true;
        break;
      }
    }
    if (canAffordAny) break;
  }
  if (!hasBuildable) {
    return {
      anchorId: "gov-coach-anchor-home-section",
      relaxed: true,
      message: "No HQ upgrade available here yet — unlock a structure first.",
    };
  }
  return {
    anchorId: "gov-coach-anchor-resource-bar",
    relaxed: true,
    releaseCoach: true,
    message:
      "Need more cash or supply. Wait for income, then Gov't Prog → Go to Structure to continue.",
  };
}

/** Step 1 — broke while picking a structure; dim + dismiss to unpark the coach. */
export function govStructureUpgradeCoachAffordBlockedCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  if (!govStructureCoachPickActive(state)) return null;
  const officeId = resolveOfficeLocation(state);
  const targetId = govStructureCoachTargetId(state, officeId);
  if (targetId && !state.settings.ignoreCosts) {
    const cost = structureCost(state, officeId, targetId);
    if (!canAffordAtOffice(state, officeId, cost)) {
      return {
        anchorId: `structure-card-${targetId}`,
        message:
          "Not enough cash or supply for this upgrade. Earn income, then return from Gov't Prog.",
        dismissible: true,
        dismissLabel: "Come back later",
      };
    }
    return null;
  }
  const blocked = govStructureUpgradeCoachBlockedCue(state);
  if (blocked?.anchorId !== "gov-coach-anchor-resource-bar") return null;
  return {
    anchorId: blocked.anchorId,
    message:
      "Not enough cash or supply to queue a structure upgrade. Earn income, then Gov't Prog → Go to Structure.",
    dismissible: true,
    dismissLabel: "Come back later",
  };
}

export function govStartRecruitCoach(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== "growth_recruit_push"
  ) {
    return state;
  }
  return withGov(state, {
    ...g,
    growthRecruitCoach: "set_qty",
    pendingModal: "recruit_set_qty_intro",
  });
}

export function govAdvanceRecruitCoach(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthRecruitCoach !== "set_qty" ||
    g.growthStepId !== "growth_recruit_push"
  ) {
    return state;
  }
  return withGov(state, { ...g, growthRecruitCoach: "pick_queue" });
}

export function govRecruitCoachActive(state: GameState): boolean {
  const g = gp(state);
  return (
    (g.growthRecruitCoach === "set_qty" ||
      g.growthRecruitCoach === "pick_queue") &&
    g.growthStepId === "growth_recruit_push" &&
    !g.growthDeclined &&
    g.growthAccepted
  );
}

export function govRecruitCoachSetQtyActive(state: GameState): boolean {
  return govRecruitCoachActive(state) && gp(state).growthRecruitCoach === "set_qty";
}

export function govRecruitCoachQueueActive(state: GameState): boolean {
  return (
    govRecruitCoachActive(state) && gp(state).growthRecruitCoach === "pick_queue"
  );
}

export function govMapCoachActive(state: GameState): boolean {
  const g = gp(state);
  return (
    (g.growthMapCoach === "filter_intro" ||
      g.growthMapCoach === "filter_tier" ||
      g.growthMapCoach === "pick_job" ||
      g.growthMapCoach === "drawer_title" ||
      g.growthMapCoach === "drawer_region" ||
      g.growthMapCoach === "drawer_distance" ||
      g.growthMapCoach === "drawer_contracts") &&
    g.growthStepId === "growth_job" &&
    !g.growthDeclined &&
    g.growthAccepted &&
    !g.mapSiteInspected
  );
}

export function govStartMapCoach(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== "growth_job" ||
    g.mapSiteInspected
  ) {
    return state;
  }
  if (g.growthMapCoach || g.pendingModal === "map_filter_intro") return state;
  return withGov(state, {
    ...g,
    growthMapCoach: "filter_intro",
    pendingModal: "map_filter_intro",
  });
}

export function govOnEnterWorldView(state: GameState): GameState {
  return govStartMapCoach(state);
}

function govFirstOpenTier1Posting(state: GameState) {
  const tier1 = filterAndSortJobPostings(
    openJobPostings(state),
    { ...DEFAULT_JOB_BOARD_FILTERS, tier: 1 },
    "expires_soon",
  );
  const sorted = sortJobPostingsByDistanceFromMainOffice(state, tier1);
  return sorted[0] ?? null;
}

export function govAdvanceMapCoachTier(
  state: GameState,
  postingId?: string | null,
): GameState {
  const g = gp(state);
  if (!govMapCoachActive(state) || g.growthMapCoach !== "filter_tier") {
    return state;
  }
  let targetId = postingId ?? null;
  if (targetId) {
    const exists = openJobPostings(state).some((p) => p.id === targetId);
    if (!exists) targetId = null;
  }
  if (!targetId) {
    const posting = govFirstOpenTier1Posting(state);
    targetId = posting?.id ?? null;
  }
  return withGov(state, {
    ...g,
    growthMapCoach: "pick_job",
    growthMapCoachPostingId: targetId,
  });
}

export function govOnMapJobFocused(
  state: GameState,
  postingId: string,
): GameState {
  const g = gp(state);
  if (govJobCoachActive(state) && g.growthJobCoach === "pick_job") {
    if (g.growthJobCoachPostingId && postingId !== g.growthJobCoachPostingId) {
      return state;
    }
    let defTier = 1;
    try {
      const posting = openJobPostings(state).find((p) => p.id === postingId);
      if (!posting) return state;
      defTier = jobDefinitionForPosting(posting).tier;
    } catch {
      return state;
    }
    if (defTier !== 1) return state;
    return withGov(state, {
      ...g,
      growthJobCoach: "map_send",
      growthJobCoachPostingId: postingId,
    });
  }
  if (!govMapCoachActive(state) || g.growthMapCoach !== "pick_job") {
    return state;
  }
  if (g.growthMapCoachPostingId && postingId !== g.growthMapCoachPostingId) {
    return state;
  }
  let defTier = 1;
  try {
    const posting = openJobPostings(state).find((p) => p.id === postingId);
    if (!posting) return state;
    defTier = jobDefinitionForPosting(posting).tier;
  } catch {
    return state;
  }
  if (defTier !== 1) return state;
  let siteLabel: string | null = null;
  try {
    const posting = openJobPostings(state).find((p) => p.id === postingId);
    if (posting) {
      const def = jobDefinitionForPosting(posting);
      const coord = jobSiteCoordForPosting(posting, def, state.settings);
      siteLabel = mapHexTitle(mapHexInfo(coord, state), state);
    }
  } catch {
    siteLabel = null;
  }
  return withGov(state, {
    ...g,
    growthMapCoach: "drawer_title",
    growthMapCoachSiteLabel: siteLabel,
    pendingModal: null,
  });
}

const MAP_DRAWER_COACH_ORDER = [
  "drawer_title",
  "drawer_region",
  "drawer_distance",
  "drawer_contracts",
] as const;

export function govMapDrawerCoachActive(state: GameState): boolean {
  const phase = gp(state).growthMapCoach;
  return (
    govMapCoachActive(state) &&
    phase != null &&
    (MAP_DRAWER_COACH_ORDER as readonly string[]).includes(phase)
  );
}

export function govAdvanceMapDrawerCoach(state: GameState): GameState {
  const g = gp(state);
  const phase = g.growthMapCoach;
  if (!govMapDrawerCoachActive(state) || !phase) return state;
  const idx = MAP_DRAWER_COACH_ORDER.indexOf(
    phase as (typeof MAP_DRAWER_COACH_ORDER)[number],
  );
  if (idx < 0) return state;
  if (idx >= MAP_DRAWER_COACH_ORDER.length - 1) {
    const jobPostingId =
      g.growthMapCoachPostingId ?? g.growthJobCoachPostingId;
    return withGov(state, {
      ...g,
      growthMapCoach: null,
      growthMapCoachPostingId: null,
      growthMapCoachSiteLabel: null,
      growthJobCoachPostingId: jobPostingId,
      growthJobCoach: jobPostingId ? "map_send" : null,
      mapSiteInspected: true,
    });
  }
  return withGov(state, {
    ...g,
    growthMapCoach: MAP_DRAWER_COACH_ORDER[idx + 1],
  });
}

function mapDrawerCoachCue(
  state: GameState,
  phase: string,
): GovCoachSpotlightCue | null {
  switch (phase) {
    case "drawer_title": {
      const label = gp(state).growthMapCoachSiteLabel?.trim();
      return {
        anchorId: "gov-coach-anchor-map-hex-drawer-title",
        message: label
          ? `This line is the hex you selected — ${label}.`
          : "This line is the hex you selected — the place name on the map.",
        dismissible: true,
        dismissLabel: "Next",
      };
    }
    case "drawer_region":
      return {
        anchorId: "gov-coach-anchor-map-hex-region",
        message:
          "Region — where this hex sits. Some regions boost pay when perks line up.",
        dismissible: true,
        dismissLabel: "Next",
      };
    case "drawer_distance":
      return {
        anchorId: "gov-coach-anchor-map-hex-distance",
        message: "Hx — hex hops from your office. More Hx, longer travel time.",
        dismissible: true,
        dismissLabel: "Next",
      };
    case "drawer_contracts":
      return {
        anchorId: "gov-coach-anchor-map-hex-contracts",
        message:
          "Contracts — payout/hr, tier, deadline, completion band. Tap Send on this row when you're ready.",
        dismissible: true,
        dismissLabel: "Continue",
      };
    default:
      return null;
  }
}

export function govMapCoachSpotlightCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (!govMapCoachActive(state) || g.pendingModal === "map_filter_intro") {
    return null;
  }
  if (g.growthMapCoach === "filter_tier") {
    return {
      anchorId: "gov-coach-anchor-map-tier",
      message: "Set Tier to T1.",
    };
  }
  if (g.growthMapCoach === "pick_job") {
    if (g.growthMapCoachPostingId) {
      return {
        anchorId: `gov-coach-anchor-map-job-${g.growthMapCoachPostingId}`,
        message: "Pick this T1 contract to pan the map and open the site.",
      };
    }
    return {
      anchorId: "gov-coach-anchor-map-job-filter",
      message:
        "Pick any T1 row in the list. If none show, reset filters or check Secretary → Job.",
    };
  }
  if (govMapDrawerCoachActive(state) && g.growthMapCoach) {
    return mapDrawerCoachCue(state, g.growthMapCoach);
  }
  return null;
}

export function govJobCoachActive(state: GameState): boolean {
  const g = gp(state);
  return (
    (g.growthJobCoach === "pick_job" ||
      g.growthJobCoach === "map_send" ||
      g.growthJobCoach === "map_engage_open" ||
      g.growthJobCoach === "map_engage_intro" ||
      g.growthJobCoach === "map_engage_crew_qty" ||
      g.growthJobCoach === "map_engage" ||
      g.growthJobCoach === "map_travel") &&
    g.growthStepId === "growth_job" &&
    !g.growthDeclined &&
    g.growthAccepted
  );
}

export function govJobMapCoachActive(state: GameState): boolean {
  const g = gp(state);
  return (
    govJobCoachActive(state) &&
    (g.growthJobCoach === "pick_job" || g.growthJobCoach === "map_send")
  );
}

export function govStartJobCoach(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== "growth_job" ||
    g.growthJobCoach
  ) {
    return state;
  }
  if (!g.mapSiteInspected) {
    return govStartMapCoach(state);
  }
  let targetId = g.growthJobCoachPostingId;
  if (targetId && !openJobPostings(state).some((p) => p.id === targetId)) {
    targetId = null;
  }
  if (!targetId) {
    targetId = govFirstOpenTier1Posting(state)?.id ?? null;
  }
  return withGov(state, {
    ...g,
    growthJobCoach: targetId ? "map_send" : "pick_job",
    growthJobCoachPostingId: targetId,
  });
}

export function govShouldMapSendOpenEngageModal(
  state: GameState,
  postingId: string,
): boolean {
  const g = gp(state);
  return (
    g.growthStepId === "growth_job" &&
    g.growthAccepted &&
    !g.growthDeclined &&
    g.growthJobCoach === "map_send" &&
    (!g.growthJobCoachPostingId || g.growthJobCoachPostingId === postingId)
  );
}

export function govMapJobEngageModalActive(state: GameState): boolean {
  const g = gp(state);
  return (
    govJobCoachActive(state) &&
    (g.growthJobCoach === "map_engage_open" ||
      g.growthJobCoach === "map_engage_intro" ||
      g.growthJobCoach === "map_engage_crew_qty" ||
      g.growthJobCoach === "map_engage") &&
    !!g.growthJobCoachPostingId
  );
}

function govGrowthJobEngagementActive(
  state: GameState,
  postingId?: string | null,
): boolean {
  return state.jobEngagements.some((e) => {
    if (
      e.phase !== "outbound" &&
      e.phase !== "returning" &&
      e.phase !== "working"
    ) {
      return false;
    }
    if (postingId && e.postingId !== postingId) return false;
    return true;
  });
}

function govGrowthJobStepEngagedIncomplete(state: GameState): boolean {
  const g = gp(state);
  return (
    g.growthStepId === "growth_job" &&
    g.growthAccepted &&
    !g.growthDeclined &&
    !g.growthCompletedStepIds.includes("growth_job") &&
    growthObjectiveMet(state, "growth_job")
  );
}

function govResumeGrowthJobAfterEngage(state: GameState): GameState {
  const g = gp(state);
  const enRoute = govGrowthJobEngagementActive(state);
  const cleared = withGov(state, {
    ...g,
    growthMapCoach: null,
    growthMapCoachPostingId: null,
    growthMapCoachSiteLabel: null,
    growthJobCoachPostingId: null,
    mapSiteInspected: true,
    growthJobCoach: null,
    pendingModal: enRoute ? "growth_job_travel_coach" : null,
  });
  if (enRoute) {
    return { ...cleared, view: "world" };
  }
  const def = growthStepDef("growth_job");
  if (def && growthStepCelebrationEligible("growth_job", def)) {
    return offerGrowthStepCelebration(cleared, "growth_job");
  }
  let next = completeGrowthStep(cleared, "growth_job");
  return {
    ...evaluateGrowthObjectives(next),
    view: "secretary",
    secretaryPanel: "govProgram",
  };
}

export function govOnJobSendFromMap(
  state: GameState,
  postingId: string,
): GameState {
  const g = gp(state);
  if (!govShouldMapSendOpenEngageModal(state, postingId)) {
    return state;
  }
  if (
    govGrowthJobStepEngagedIncomplete(state) &&
    govGrowthJobEngagementActive(state, postingId)
  ) {
    return govResumeGrowthJobAfterEngage(state);
  }
  return withGov(state, {
    ...g,
    growthJobCoach: "map_engage_open",
    growthJobCoachPostingId: postingId,
  });
}

export function govAdvanceJobEngageCoach(state: GameState): GameState {
  const g = gp(state);
  if (g.growthJobCoach === "map_engage_open") {
    return withGov(state, { ...g, growthJobCoach: "map_engage_intro" });
  }
  if (g.growthJobCoach === "map_engage_intro") {
    return withGov(state, { ...g, growthJobCoach: "map_engage_crew_qty" });
  }
  if (g.growthJobCoach === "map_engage_crew_qty") {
    return withGov(state, { ...g, growthJobCoach: "map_engage" });
  }
  return state;
}

export function govAdvanceMapTravelCoach(state: GameState): GameState {
  const g = gp(state);
  if (g.growthJobCoach !== "map_travel") return state;
  let next = withGov(state, { ...g, growthJobCoach: null });
  if (
    growthObjectiveMet(next, "growth_job") &&
    !gp(next).growthCompletedStepIds.includes("growth_job")
  ) {
    const def = growthStepDef("growth_job");
    if (def && growthStepCelebrationEligible("growth_job", def)) {
      next = offerGrowthStepCelebration(next, "growth_job");
    } else {
      next = completeGrowthStep(next, "growth_job");
      next = evaluateGrowthObjectives(next);
    }
  }
  return next;
}

export function govCancelMapJobEngage(state: GameState): GameState {
  const g = gp(state);
  if (
    g.growthJobCoach !== "map_engage" &&
    g.growthJobCoach !== "map_engage_crew_qty" &&
    g.growthJobCoach !== "map_engage_intro" &&
    g.growthJobCoach !== "map_engage_open"
  ) {
    return state;
  }
  return withGov(state, {
    ...g,
    growthJobCoach: "map_send",
  });
}

export function govAfterJobCoachViewChange(
  _prev: GameState,
  next: GameState,
): GameState {
  const g = gp(next);
  if (g.growthStepId !== "growth_job" || g.growthJobCoach !== "map_send") {
    return next;
  }
  if (next.view === "office" && next.jobFocusPostingId) {
    return withGov(next, {
      ...g,
      growthJobCoach: "map_engage_intro",
    });
  }
  return next;
}

export function govJobCoachSpotlightCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (!govJobMapCoachActive(state)) return null;
  if (g.growthJobCoach === "pick_job") {
    if (g.growthJobCoachPostingId) {
      return {
        anchorId: `gov-coach-anchor-map-job-${g.growthJobCoachPostingId}`,
        message:
          "Open the site you surveyed — pick this contract in Jobs.",
      };
    }
    return {
      anchorId: "gov-coach-anchor-map-job-filter",
      message: "Pick a T1 contract row to open its map site.",
    };
  }
  if (g.growthJobCoach === "map_send" && g.growthJobCoachPostingId) {
    return {
      anchorId: `gov-coach-anchor-map-job-send-${g.growthJobCoachPostingId}`,
      message: "Tap Send — assign crew in the window, then Engage.",
    };
  }
  return null;
}

function freeFreshGraduatesAtMapOffice(state: GameState): number {
  const officeId = resolveOfficeLocation(state);
  const roster = rosterAt(state, officeId);
  let free = roster.fresh_graduate ?? 0;
  for (const engagement of state.jobEngagements) {
    if (engagement.officeId !== officeId) continue;
    free -= engagement.crewAssigned.fresh_graduate ?? 0;
  }
  return Math.max(0, free);
}

export function govJobOfficeCoachSpotlightCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (!govJobCoachActive(state)) return null;
  const freeFresh = freeFreshGraduatesAtMapOffice(state);
  if (g.growthJobCoach === "map_engage_open") {
    return {
      anchorId: "gov-coach-anchor-map-job-engage-dialog",
      message:
        "Map dispatch — review the contract, set crew, then Engage.",
      dismissible: true,
      dismissLabel: "Next",
    };
  }
  if (g.growthJobCoach === "map_engage_intro") {
    return {
      anchorId: "gov-coach-anchor-map-job-engage-facts",
      message:
        "Tier is the minimum crew grade. Size is job weight. Shift is on-site hours — travel time is separate.",
      dismissible: true,
      dismissLabel: "Next",
    };
  }
  if (g.growthJobCoach === "map_engage_crew_qty") {
    const sendN = Math.min(10, freeFresh);
    const message =
      freeFresh >= 10
        ? "Assign 10 Fresh Graduate — hires from your workforce grant."
        : sendN > 0
          ? `Assign ${sendN} Fresh Graduate (all free here). Step clears on Engage — recruit more first if you want a full 10.`
          : "No Fresh Graduate free at this office — wait for crews to return or recruit more, then Engage.";
    return {
      anchorId: "gov-coach-anchor-map-job-engage-fresh-qty",
      message,
      dismissible: true,
      dismissLabel: "Next",
    };
  }
  if (g.growthJobCoach !== "map_engage") {
    return null;
  }
  const engageN = Math.min(10, Math.max(1, freeFresh));
  return {
    anchorId: "gov-coach-anchor-job-engage",
    message:
      freeFresh > 0
        ? `Tap Engage with Fresh Graduate assigned (up to ${engageN}; doesn't have to be 10).`
        : "Tap Engage once you have at least one Fresh Graduate assigned.",
    dismissible: true,
    dismissLabel: "Next",
  };
}

export function govMapTravelCoachSpotlightCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (g.growthJobCoach !== "map_travel") return null;
  return {
    anchorId: "gov-coach-anchor-map-job-travel",
    message:
      "Team is traveling — follow the blue line and runner on the map. Supply covered the trip when you engaged.",
    dismissible: true,
    dismissLabel: "Got it",
  };
}

export function govGrowthWorldCoachSpotlightCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const travel = govMapTravelCoachSpotlightCue(state);
  if (travel) return travel;
  const job = govJobCoachSpotlightCue(state);
  if (job) return job;
  return govMapCoachSpotlightCue(state);
}

export function govGrowthStepProgress(
  state: GameState,
): { current: number; total: number } | null {
  const step = govCurrentGrowthStep(state);
  if (!step) return null;
  const idx = GOV_GROWTH_STEPS.findIndex((row) => row.stepId === step.stepId);
  if (idx < 0) return null;
  return { current: idx + 1, total: GOV_GROWTH_STEPS.length };
}

export function govStructureCoachPickActive(state: GameState): boolean {
  const g = gp(state);
  return (
    g.growthStructureCoach === "pick_upgrade" &&
    g.growthStepId === "growth_structure" &&
    !g.growthDeclined &&
    g.growthAccepted
  );
}

function structureCoachCanQueue(
  state: GameState,
  officeId: OfficeLocationId,
  structure: StructureDefinition,
  queueFull: boolean,
): boolean {
  const maxed = isStructureCompletedAtSite(state, officeId, structure);
  const inProgress =
    isStructureQueuedAt(state, officeId, structure.id) && !maxed;
  if (!isStructureUnlocked(state, structure.id) || maxed || inProgress) {
    return false;
  }
  if (queueFull || !canBuildStructure(state, officeId, structure.id)) {
    return false;
  }
  if (state.settings.ignoreCosts) return true;
  const cost = structureCost(state, officeId, structure.id);
  return canAffordAtOffice(state, officeId, cost);
}

export function govStructureCoachTargetId(
  state: GameState,
  officeId: OfficeLocationId,
): StructureId | null {
  if (!govStructureCoachPickActive(state)) return null;
  const queueFull = isStructureQueueFull(state, officeId);
  for (const category of STRUCTURE_CATEGORY_ORDER) {
    const items = sortStructuresForBuildTab(
      category,
      structurePanelStructures().filter((structure) => structure.category === category),
    );
    for (const structure of items) {
      if (structureCoachCanQueue(state, officeId, structure, queueFull)) {
        return structure.id;
      }
    }
  }
  return null;
}

export function govStructureCoachTargetCategory(
  state: GameState,
  officeId: OfficeLocationId,
): string | null {
  const id = govStructureCoachTargetId(state, officeId);
  if (!id) return null;
  try {
    return getStructureDefinition(id).category;
  } catch {
    return null;
  }
}

export function govOnOpenRoster(state: GameState): GameState {
  const g = gp(state);
  if (g.executiveStepId !== "exec_roster") return state;
  return completeExecutiveStep(state, "exec_roster", { cash: 100, supply: 50 });
}

export function govOnChiefSelected(state: GameState): GameState {
  const g = gp(state);
  if (!g.chiefLessonPending && g.executiveStepId !== "exec_chief_switch") {
    return state;
  }
  return completeExecutiveStep(state, "exec_chief_switch", {
    cash: 150,
    supply: 0,
  });
}

export function govOnMapSiteInspected(state: GameState): GameState {
  const g = gp(state);
  if (g.mapSiteInspected) return state;
  if (g.growthStepId !== "growth_job" || govGrowthTrackPaused(state)) {
    return state;
  }
  return state;
}

function activitySince(
  state: GameState,
  at: number,
  categories: Array<GameState["activityLog"][number]["category"]>,
): boolean {
  return state.activityLog.some(
    (entry) => entry.at >= at && categories.includes(entry.category),
  );
}

function growthObjectiveMet(state: GameState, stepId: string): boolean {
  const def = growthStepDef(stepId);
  if (!def) return false;
  const g = gp(state);
  const replaying = g.growthReplayAt != null;
  const since = g.growthStepStartedAt ?? g.growthReplayAt ?? 0;
  switch (def.objectiveType) {
    case "structure_queue": {
      const guided =
        g.growthAccepted &&
        !g.growthDeclined &&
        (g.growthReplayAt != null || g.growthStepStartedAt != null);
      if (guided) {
        return activitySince(state, since, ["structure_upgrade"]);
      }
      return state.structureQueues.hq.some((j) => j.startedAt != null) ||
        Object.values(state.structureLevelsByLocation.hq).some((lv) => lv > 0);
    }
    case "recruit_units":
      if (replaying) {
        const base = g.growthReplayRecruitBaseline ?? 0;
        return g.lifetimeRecruits - base >= Number(def.param);
      }
      return g.lifetimeRecruits >= Number(def.param);
    case "engage_job": {
      const guided =
        g.growthAccepted &&
        !g.growthDeclined &&
        (g.growthReplayAt != null || g.growthStepStartedAt != null);
      if (guided) {
        if (!g.mapSiteInspected) return false;
        return activitySince(state, since, ["job_engage", "job_complete"]);
      }
      return (
        g.growthCompletedStepIds.includes("growth_job") ||
        state.jobEngagements.length > 0 ||
        state.activityLog.some((e) => e.category === "job_complete")
      );
    }
    case "job_report":
      if (replaying) {
        return (
          (state.dismissedJobReportIds?.length ?? 0) >
          (g.growthReportDismissedBaseline ?? 0)
        );
      }
      return (state.dismissedJobReportIds?.length ?? 0) > 0;
    case "research_queue":
      if (replaying) {
        return activitySince(state, since, ["research", "research_complete"]);
      }
      return state.researchQueues.hq.length > 0 ||
        Object.values(state.researchLevels).some((lv) => lv > 0);
    case "hint_only":
      return true;
    case "hire_unit_id": {
      if (replaying) {
        const name = RECRUITMENT_UNITS.find((unit) => unit.id === def.param)?.name;
        if (!name) return false;
        return state.activityLog.some(
          (entry) =>
            entry.at >= since &&
            entry.category === "recruit" &&
            entry.summary.includes(name),
        );
      }
      const unitId = def.param;
      for (const roster of Object.values(state.contractorsByLocation)) {
        if ((roster[unitId as keyof typeof roster] ?? 0) > 0) return true;
      }
      return false;
    }
    default:
      return false;
  }
}

const GROWTH_COACH_PENDING_MODALS = new Set<
  NonNullable<GameState["govProgram"]["pendingModal"]>
>([
  "structure_queue_intro",
  "structure_queue_coach",
  "recruit_set_qty_intro",
  "recruit_queue_intro",
  "recruit_first_queue_coach",
  "recruit_step_coach",
  "map_filter_intro",
  "growth_step_coach",
  "growth_job_travel_coach",
  "research_queue_intro",
  "growth_report_intro",
  "growth_research_intro",
  "growth_bm_hint_intro",
  "growth_bm_hired_intro",
]);

/** Mid-step coach UI was persisted — unsafe after tab close / refresh. */
export function govGrowthCoachInProgress(
  g: GameState["govProgram"],
): boolean {
  if (!g.growthAccepted || g.growthDeclined || !g.growthStepId) {
    return false;
  }
  if (
    g.growthStructureCoach ||
    g.growthRecruitCoach ||
    g.growthMapCoach ||
    g.growthJobCoach ||
    g.growthReportCoach ||
    g.growthResearchCoach ||
    g.growthBmCoach
  ) {
    return true;
  }
  if (g.structureQueueCoachJobId) return true;
  if (g.pendingModal && GROWTH_COACH_PENDING_MODALS.has(g.pendingModal)) {
    return true;
  }
  return false;
}

function govReenterGrowthStepAfterInterrupt(
  state: GameState,
  g: GameState["govProgram"],
  stepId: string,
): void {
  switch (stepId) {
    case "growth_structure":
      g.growthStructureCoach = "go_home";
      break;
    case "growth_recruit_push":
      g.growthRecruitCoach = "set_qty";
      break;
    case "growth_job":
      g.mapSiteInspected = false;
      g.growthMapCoachPostingId = null;
      g.growthMapCoachSiteLabel = null;
      g.growthJobCoachPostingId =
        govFirstOpenTier1Posting(state)?.id ?? null;
      break;
    case "growth_report":
      g.growthReportCoach = "open_secretary";
      break;
    case "growth_research":
      g.growthResearchCoach = "open_research";
      g.growthResearchCoachResearchId =
        govResearchCoachTargetId(state) ?? null;
      break;
    case "growth_bm_hired":
      g.growthBmCoach = "open_recruit";
      break;
    default:
      break;
  }
}

/**
 * On load: interrupted growth coach sessions cannot resume (spotlights/modals).
 * Clear coach chrome, rewind step-local flags, park on Secretary → Govt Prog.
 */
export function govFailsafeInterruptedGrowthCoach(state: GameState): GameState {
  const g0 = gp(state);
  if (!govGrowthCoachInProgress(g0)) return state;
  const stepId = g0.growthStepId;
  if (!stepId) return state;

  if (stepId === "growth_job" && govGrowthJobStepEngagedIncomplete(state)) {
    const resumed = govResumeGrowthJobAfterEngage(state);
    return {
      ...resumed,
      recruitFocusUnitId: null,
      jobFocusPostingId: null,
    };
  }

  const g = { ...g0 };
  clearGovCoachTransient(g);
  govReenterGrowthStepAfterInterrupt(state, g, stepId);
  const next = withGov(state, g);
  return {
    ...next,
    view: "secretary",
    secretaryPanel: "govProgram",
    recruitFocusUnitId: null,
    jobFocusPostingId: null,
  };
}

function clearGovCoachTransient(g: GameState["govProgram"]) {
  g.growthStructureCoach = null;
  g.growthRecruitCoach = null;
  g.growthMapCoach = null;
  g.growthMapCoachPostingId = null;
  g.growthMapCoachSiteLabel = null;
  g.growthJobCoach = null;
  g.growthJobCoachPostingId = null;
  g.growthReportCoach = null;
  g.growthResearchCoach = null;
  g.growthResearchCoachResearchId = null;
  g.growthBmCoach = null;
  g.growthRecruitFirstQueueCoachDone = false;
  g.pendingModal = null;
  g.structureQueueCoachJobId = null;
  g.structureQueueCoachRewardCash = null;
  g.structureQueueCoachRewardSupply = null;
  g.structureQueueCoachRewardConnection = null;
}

/** Replay the growth track from step 1. Executive path, roster, and economy stay. */
export function govResetGrowthTrack(state: GameState): GameState {
  return govResetGrowthTrackAtStep(
    state,
    GOV_GROWTH_STEPS[0]?.stepId ?? "growth_structure",
  );
}

/** Replay growth from a specific step (prior steps marked complete for UI). */
export function govResetGrowthTrackAtStep(
  state: GameState,
  stepId: string,
): GameState {
  const stepIndex = GOV_GROWTH_STEPS.findIndex((s) => s.stepId === stepId);
  if (stepIndex < 0) return state;
  const g = { ...gp(state) };
  const now = Date.now();
  g.growthDeclined = false;
  g.growthAccepted = true;
  g.growthCompletedStepIds = GOV_GROWTH_STEPS.slice(0, stepIndex).map(
    (s) => s.stepId,
  );
  g.growthStepId = stepId;
  g.mapSiteInspected = false;
  g.growthReplayAt = now;
  g.growthStepStartedAt = now;
  g.growthReplayRecruitBaseline = g.lifetimeRecruits;
  g.growthReportDismissedBaseline = state.dismissedJobReportIds?.length ?? 0;
  g.executiveStepId = null;
  g.executiveCompletedStepIds = [];
  g.chiefLessonPending = false;
  clearGovCoachTransient(g);
  if (stepId === "growth_recruit_push") {
    g.growthRecruitCoach = "set_qty";
    g.pendingModal = "recruit_set_qty_intro";
  }
  if (stepId === "growth_job") {
    g.growthMapCoach = "filter_intro";
    g.pendingModal = "map_filter_intro";
    g.mapSiteInspected = false;
    const posting = govFirstOpenTier1Posting(state);
    g.growthJobCoachPostingId = posting?.id ?? null;
  }
  if (stepId === "growth_report") {
    g.growthReportCoach = null;
    g.pendingModal = "growth_report_intro";
  }
  if (stepId === "growth_research") {
    g.growthResearchCoach = null;
    g.growthResearchCoachResearchId = null;
    g.pendingModal = "growth_research_intro";
  }
  if (stepId === "growth_bm_hint") {
    g.pendingModal = "growth_bm_hint_intro";
  }
  if (stepId === "growth_bm_hired") {
    g.growthBmCoach = null;
    g.pendingModal = "growth_bm_hired_intro";
  }
  return withGov(state, g);
}

function growthStepUsesCustomCelebration(stepId: string): boolean {
  return stepId === "growth_structure" || stepId === "growth_recruit_push";
}

function growthStepCelebrationEligible(
  stepId: string,
  def: GovGrowthStepDefinition,
): boolean {
  if (growthStepUsesCustomCelebration(stepId)) return false;
  if (def.objectiveType === "hint_only") return false;
  const reward = def.reward;
  return (
    reward.cash > 0 ||
    reward.supply > 0 ||
    (reward.connection ?? 0) > 0
  );
}

function offerGrowthStepCelebration(
  state: GameState,
  stepId: string,
): GameState {
  const def = growthStepDef(stepId);
  if (!def) return state;
  const reward = def.reward;
  return withGov(state, {
    ...gp(state),
    pendingModal: "growth_step_coach",
    structureQueueCoachRewardCash: reward.cash > 0 ? reward.cash : null,
    structureQueueCoachRewardSupply: reward.supply > 0 ? reward.supply : null,
    structureQueueCoachRewardConnection:
      (reward.connection ?? 0) > 0 ? reward.connection ?? null : null,
  });
}

export function evaluateGrowthObjectives(state: GameState): GameState {
  const g = gp(state);
  if (g.growthDeclined || !g.growthAccepted || !g.growthStepId) return state;
  if (govGrowthTrackPaused(state)) return state;
  if (g.pendingModal === "growth_step_coach") return state;
  if (g.pendingModal === "growth_job_travel_coach") return state;
  let next = state;
  let stepId: string | null = g.growthStepId;
  let guard = 0;
  while (stepId && guard < GOV_GROWTH_STEPS.length) {
    guard += 1;
    const def = growthStepDef(stepId);
    if (!def) break;
    if (def.objectiveType === "hint_only") {
      if (gp(next).pendingModal === "growth_bm_hint_intro") break;
      if (def.autoAdvance) {
        next = completeGrowthStep(next, stepId);
        stepId = gp(next).growthStepId;
        continue;
      }
      break;
    }
    if (!growthObjectiveMet(next, stepId)) break;
    if (growthStepCelebrationEligible(stepId, def)) {
      return offerGrowthStepCelebration(next, stepId);
    }
    next = completeGrowthStep(next, stepId);
    stepId = gp(next).growthStepId;
    if (!def.autoAdvance) break;
  }
  return next;
}

export function govAfterStructureQueueChange(
  state: GameState,
  locationId: OfficeLocationId,
  queued?: { jobId: string; structureId: StructureId },
): GameState {
  let next = state;
  const g = gp(state);
  if (
    g.growthStructureCoach === "pick_upgrade" &&
    g.growthStepId === "growth_structure" &&
    locationId === "hq" &&
    queued
  ) {
    const stepReward = growthStepDef("growth_structure")?.reward;
    next = withGov(next, {
      ...gp(next),
      growthStructureCoach: null,
      pendingModal: "structure_queue_intro",
      structureQueueCoachJobId: queued.jobId,
      structureQueueCoachRewardCash: stepReward?.cash ?? null,
      structureQueueCoachRewardSupply: stepReward?.supply ?? null,
      structureQueueCoachRewardConnection: stepReward?.connection ?? null,
    });
    return next;
  }
  return evaluateGrowthObjectives(next);
}

export function govAfterRecruitmentQueueChange(
  state: GameState,
  officeId: OfficeLocationId,
  queued: { jobId: string },
): GameState {
  const g = gp(state);
  if (
    g.growthStepId === "growth_bm_hired" &&
    g.growthBmCoach === "pick_unit" &&
    officeId === "hq"
  ) {
    return evaluateGrowthObjectives(
      withGov(state, { ...g, growthBmCoach: null }),
    );
  }
  if (
    g.growthStepId !== "growth_recruit_push" ||
    officeId !== "hq" ||
    g.growthRecruitFirstQueueCoachDone
  ) {
    return state;
  }
  if (g.growthRecruitCoach === "pick_queue") {
    return withGov(state, {
      ...g,
      growthRecruitCoach: null,
      pendingModal: "recruit_queue_intro",
      structureQueueCoachJobId: queued.jobId,
    });
  }
  return state;
}

export function govAfterSimulatedTime(
  before: GameState,
  after: GameState,
): GameState {
  const beforeIds = new Set(before.activityLog.map((e) => e.id));
  const newComplete = after.activityLog.some(
    (entry) =>
      !beforeIds.has(entry.id) && entry.category === "structure_complete",
  );
  if (!newComplete) return after;
  return evaluateGrowthObjectives(after);
}

function govGrowthJobMapEngageCoachActive(g: GameState["govProgram"]): boolean {
  if (!g) return false;
  const phase = g.growthJobCoach;
  return (
    phase === "map_engage_open" ||
    phase === "map_engage_intro" ||
    phase === "map_engage_crew_qty" ||
    phase === "map_engage" ||
    phase === "map_send"
  );
}

export function govAfterEngageJob(state: GameState): GameState {
  const g0 = gp(state);
  const growthJobStep =
    g0.growthStepId === "growth_job" &&
    g0.growthAccepted &&
    !g0.growthDeclined;
  if (
    growthJobStep &&
    g0.mapSiteInspected &&
    govGrowthJobMapEngageCoachActive(g0) &&
    !g0.growthCompletedStepIds.includes("growth_job")
  ) {
    return withGov(state, {
      ...g0,
      growthJobCoach: null,
      growthJobCoachPostingId: null,
      pendingModal: "growth_job_travel_coach",
    });
  }
  let next = state;
  if (g0.growthJobCoach) {
    next = withGov(state, {
      ...g0,
      growthJobCoach: null,
      growthJobCoachPostingId: null,
    });
  }
  next = evaluateGrowthObjectives(next);
  const after = gp(next);
  if (after.executiveStepId === "exec_charter_engage") {
    /* charter uses GOV_ENGAGE_CHARTER */
  }
  return next;
}

export function govAfterDismissJobReport(state: GameState): GameState {
  const g = gp(state);
  let next = state;
  if (
    g.growthStepId === "growth_report" &&
    g.growthReportCoach === "dismiss_report"
  ) {
    next = withGov(state, { ...g, growthReportCoach: null });
  }
  return evaluateGrowthObjectives(next);
}

export function govAfterResearchQueue(
  state: GameState,
  officeId?: OfficeLocationId,
  queued?: { jobId: string },
): GameState {
  const g = gp(state);
  if (
    g.growthStepId === "growth_research" &&
    g.growthAccepted &&
    !g.growthDeclined &&
    officeId === "hq" &&
    queued
  ) {
  const cleared = {
      ...g,
      growthResearchCoach: null,
      growthResearchCoachResearchId: null,
    };
    if (g.pendingModal == null) {
      return withGov(state, {
        ...cleared,
        pendingModal: "research_queue_intro",
        structureQueueCoachJobId: queued.jobId,
      });
    }
    return withGov(state, cleared);
  }
  return evaluateGrowthObjectives(state);
}

export function availableUnitsAtOffice(
  state: GameState,
  officeId: OfficeLocationId,
): number {
  let total = 0;
  const roster = state.contractorsByLocation[officeId];
  for (const count of Object.values(roster)) {
    total += count ?? 0;
  }
  for (const engagement of state.jobEngagements) {
    if (engagement.officeId !== officeId) continue;
    for (const count of Object.values(engagement.crewAssigned)) {
      total -= count ?? 0;
    }
  }
  return Math.max(0, total);
}

export function buildCharterCrewAssignment(
  state: GameState,
  officeId: OfficeLocationId,
): UnitAssignment | null {
  const roster = state.contractorsByLocation[officeId];
  const assignment: UnitAssignment = {};
  let assigned = 0;
  const need = GOV_CHARTER_JOB.minCrew;
  for (const [unitId, count] of Object.entries(roster)) {
    if (assigned >= need) break;
    const available = count ?? 0;
    if (available <= 0) continue;
    const take = Math.min(available, need - assigned);
    assignment[unitId as keyof UnitAssignment] = take;
    assigned += take;
  }
  if (assigned < need) return null;
  return assignment;
}

export function govEngageCharter(
  state: GameState,
  officeId: OfficeLocationId,
): GameState {
  const g = gp(state);
  if (g.executiveStepId !== "exec_charter_engage") return state;
  if (!govEngageLockActive(state)) return state;
  const crew = buildCharterCrewAssignment(state, officeId);
  if (!crew) return state;

  let next = applyRewardAtHq(state, {
    cash: GOV_CHARTER_JOB.payoutCashFlat,
    supply: GOV_CHARTER_JOB.payoutSupplyFlat,
  });

  next = completeExecutiveStep(next, "exec_charter_engage");
  next = completeExecutiveStep(next, "exec_charter_return", {
    cash: 400,
    supply: 150,
  });
  next = syncExecutiveSideEffects(next);
  next = evaluateGrowthObjectives(next);
  return appendActivityLogs(next, [
    {
      category: "job_complete",
      summary: "Regional orientation charter complete (one-time program)",
      officeId,
      impacts: [
        "One-time instant deployment — crew returned to roster",
        formatAssignmentSummary(crew),
      ],
    },
  ], Date.now());
}

export function govClaimDailyQuest(state: GameState, now: number): GameState {
  const g = { ...gp(state) };
  const quest = GOV_DAILY_QUESTS.find(
    (q) => q.questId === g.calendar.activeDailyQuestId,
  );
  if (!quest) return state;
  if (g.calendar.lastDailyClaimAt && now - g.calendar.lastDailyClaimAt < MS_DAY) {
    return state;
  }
  if (g.calendar.dailyProgress < Number(quest.param)) return state;
  g.calendar.lastDailyClaimAt = now;
  g.calendar.dailyProgress = 0;
  let next = applyRewardAtHq(state, quest.reward);
  return withGov(next, g);
}

export function govOnJobReturn(state: GameState): GameState {
  const g = { ...gp(state) };
  g.calendar.dailyProgress += 1;
  g.calendar.weeklyProgress += 1;
  return withGov(state, g);
}

export function govShowDeclineGrowthConfirm(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.growthAccepted || g.growthDeclined) return state;
  return withGov(state, { ...g, pendingModal: "decline_growth" });
}

export function govGrowthProgramOfferVisible(state: GameState): boolean {
  const g = gp(state);
  return !g.growthAccepted && !g.growthDeclined;
}

export function govCurrentGrowthStep(state: GameState) {
  const g = gp(state);
  if (!g.growthStepId) return null;
  return growthStepDef(g.growthStepId) ?? null;
}

export function govCurrentExecutiveStep(state: GameState) {
  const g = gp(state);
  if (!g.executiveStepId) return null;
  return executiveStepDef(g.executiveStepId) ?? null;
}

export function govCharterCanEngage(state: GameState, officeId: OfficeLocationId): boolean {
  if (gp(state).executiveStepId !== "exec_charter_engage") return false;
  return buildCharterCrewAssignment(state, officeId) !== null;
}

function govGrowthStepCoachBlocked(g: GovProgramState, stepId: string): boolean {
  return (
    g.growthDeclined ||
    !g.growthAccepted ||
    g.growthStepId !== stepId
  );
}

export function govResearchCoachTargetId(state: GameState): string | null {
  const office = resolveOfficeLocation(state);
  if (isResearchQueueFull(state, office)) return null;
  for (const research of RESEARCH) {
    const level = state.researchLevels[research.id] ?? 0;
    if (level >= research.maxLevel) continue;
    if (!isResearchUnlocked(state, research)) continue;
    if (isResearchQueued(state, research.id)) continue;
    const cost = researchCost(state, research.id);
    if (canAffordAtOffice(state, office, cost)) return research.id;
  }
  for (const research of RESEARCH) {
    const level = state.researchLevels[research.id] ?? 0;
    if (level >= research.maxLevel) continue;
    if (!isResearchUnlocked(state, research)) continue;
    if (isResearchQueued(state, research.id)) continue;
    return research.id;
  }
  return RESEARCH[0]?.id ?? null;
}

export function govResearchCoachPickActive(
  state: GameState,
  researchId: string,
): boolean {
  const g = gp(state);
  return (
    g.growthResearchCoach === "pick_project" &&
    g.growthResearchCoachResearchId === researchId
  );
}

export function govBmRecruitCoachPickActive(state: GameState): boolean {
  const g = gp(state);
  return g.growthStepId === "growth_bm_hired" && g.growthBmCoach === "pick_unit";
}

export function govStartReportCoach(state: GameState): GameState {
  const g = gp(state);
  if (govGrowthStepCoachBlocked(g, "growth_report")) return state;
  return withGov(state, {
    ...g,
    growthReportCoach: null,
    pendingModal: "growth_report_intro",
  });
}

export function govStartResearchCoach(state: GameState): GameState {
  const g = gp(state);
  if (govGrowthStepCoachBlocked(g, "growth_research")) return state;
  return withGov(state, {
    ...g,
    growthResearchCoach: null,
    growthResearchCoachResearchId: null,
    pendingModal: "growth_research_intro",
  });
}

export function govStartBmHiredCoach(state: GameState): GameState {
  const g = gp(state);
  if (govGrowthStepCoachBlocked(g, "growth_bm_hired")) return state;
  return withGov(state, {
    ...g,
    growthBmCoach: null,
    pendingModal: "growth_bm_hired_intro",
  });
}

export function govAdvanceGrowthPathCoach(state: GameState): GameState {
  const g = gp(state);
  if (g.growthReportCoach === "reports_tab") {
    return withGov(state, { ...g, growthReportCoach: "dismiss_report" });
  }
  if (
    g.growthReportCoach === "dismiss_report" &&
    pendingJobReports(state).length === 0
  ) {
    return withGov(state, { ...g, growthReportCoach: "reports_tab" });
  }
  return state;
}

export function govAfterGrowthPathCoachViewChange(
  _prev: GameState,
  next: GameState,
): GameState {
  const g = gp(next);
  if (g.growthReportCoach === "open_secretary") {
    if (next.view === "secretary" || next.view === "office") {
      return withGov(next, { ...g, growthReportCoach: "open_job" });
    }
  }
  if (g.growthReportCoach === "open_job" && next.view === "office") {
    return withGov(next, { ...g, growthReportCoach: "reports_tab" });
  }
  if (g.growthResearchCoach === "open_research" && next.view === "research") {
    const target =
      g.growthResearchCoachResearchId ?? govResearchCoachTargetId(next);
    return withGov(next, {
      ...g,
      growthResearchCoach: "pick_project",
      growthResearchCoachResearchId: target,
    });
  }
  if (g.growthBmCoach === "open_recruit" && next.view === "recruitment") {
    return withGov(next, { ...g, growthBmCoach: "pick_unit" });
  }
  return next;
}

export function govGrowthPathCoachCue(
  state: GameState,
): GovCoachSpotlightCue | null {
  const g = gp(state);
  if (g.growthReportCoach === "open_secretary") {
    return {
      anchorId: "gov-coach-anchor-secretary",
      message: "Open Secretary — field reports and the job desk live here.",
    };
  }
  if (g.growthReportCoach === "open_job") {
    return {
      anchorId: "gov-coach-anchor-secretary-job",
      message: "Open Job — after-action reports and the job board.",
    };
  }
  if (g.growthReportCoach === "reports_tab") {
    return {
      anchorId: "gov-coach-anchor-job-reports-tab",
      message:
        "Job reports tab — summaries from completed contracts. Open one or dismiss when done reading.",
      dismissible: true,
      dismissLabel: "Next",
    };
  }
  if (g.growthReportCoach === "dismiss_report") {
    const reports = pendingJobReports(state);
    if (reports.length === 0) {
      return {
        anchorId: "gov-coach-anchor-job-reports-tab",
        relaxed: true,
        message:
          "No report yet — your step 3 team may still be traveling or on site. When a report appears, tap × to clear it.",
        dismissible: true,
        dismissLabel: "OK",
      };
    }
    return {
      anchorId: "gov-coach-anchor-job-report-dismiss",
      message: "Tap × on a report to file it away — that completes this step.",
    };
  }
  if (g.growthResearchCoach === "open_research") {
    if (state.view === "research") {
      const id =
        g.growthResearchCoachResearchId ?? govResearchCoachTargetId(state);
      if (id) {
        return {
          anchorId: `gov-coach-anchor-research-queue-${id}`,
          message: "Tap Queue on this project (or any affordable one).",
        };
      }
    }
    return {
      anchorId: "gov-coach-anchor-home-research",
      message:
        "Home → Research, or use your shortcut bar. Queue one project you can afford at HQ.",
    };
  }
  if (g.growthResearchCoach === "pick_project") {
    const id = g.growthResearchCoachResearchId;
    if (!id) {
      return {
        anchorId: "gov-program-research-queue-anchor",
        relaxed: true,
        message: "Pick any unlocked research and tap Queue when you can afford it.",
        dismissible: true,
        dismissLabel: "OK",
      };
    }
    return {
      anchorId: `gov-coach-anchor-research-queue-${id}`,
      message: "Tap Queue on this project (or any affordable one).",
    };
  }
  if (g.growthBmCoach === "open_recruit") {
    return {
      anchorId: "gov-coach-anchor-home-recruitment",
      message: "Open Recruit and hire a Branch Manager when gates are met.",
    };
  }
  if (g.growthBmCoach === "pick_unit") {
    return {
      anchorId: "recruit-unit-branch_manager",
      message:
        "Branch Manager — needs Branch Management researched. Set quantity, then Queue recruit.",
    };
  }
  return null;
}

export function govOnOpenGovProgram(state: GameState): GameState {
  const g = gp(state);
  if (g.executiveStepId !== "exec_unlock") {
    return evaluateGrowthObjectives(state);
  }
  let next = completeExecutiveStep(state, "exec_unlock");
  next = syncExecutiveSideEffects(next);
  return evaluateGrowthObjectives(next);
}

export function govProgramDailyClaimReady(state: GameState, now = Date.now()): boolean {
  const g = gp(state);
  const dailyQuest = GOV_DAILY_QUESTS.find(
    (q) => q.questId === g.calendar.activeDailyQuestId,
  );
  if (!dailyQuest) return false;
  if (g.calendar.dailyProgress < Number(dailyQuest.param)) return false;
  if (
    g.calendar.lastDailyClaimAt &&
    now - g.calendar.lastDailyClaimAt < 86_400_000
  ) {
    return false;
  }
  return true;
}

/** Gov't Prog tab deserves attention (badge on Secretary landing). */
export function govProgramGovTabQuestPending(state: GameState, now = Date.now()): boolean {
  if (!state.govProgram) return false;
  if (govGrowthProgramOfferVisible(state)) return true;
  if (govProgramDailyClaimReady(state, now)) return true;
  const g = gp(state);
  if (g.growthAccepted && !g.growthDeclined && g.growthStepId) {
    return true;
  }
  if (govExecutiveTrackActive(state) && g.executiveStepId) {
    return true;
  }
  return false;
}

/** One-line program reminder under the Secretary greeting (Secretary landing). */
export function govWorldMapHeaderTitle(state: GameState): string {
  if (govProgramGovTabQuestPending(state)) {
    return "World Map - Program available";
  }
  return "World map";
}

export function govSecretaryLandingProgramReminder(state: GameState): string | null {
  if (!state.govProgram) return null;
  if (govGrowthProgramOfferVisible(state)) {
    return "Regional office left a Growth Program packet on your desk — open Gov't Prog when you have a moment.";
  }
  if (govProgramDailyClaimReady(state)) {
    return "Daily stipend is ready on Gov't Prog — claim it before you dive back in.";
  }
  const g = gp(state);
  const growth = govCurrentGrowthStep(state);
  if (growth && g.growthAccepted && !g.growthDeclined) {
    const progress = govGrowthStepProgress(state);
    const label = progress
      ? `Growth ${progress.current}/${progress.total} · ${growth.title}`
      : growth.title;
    if (govGrowthTrackPaused(state)) {
      return `${label} is on hold until the executive charter clears — Gov't Prog has the briefing.`;
    }
    return `${label}: ${growth.body} Check Gov't Prog for the next move.`;
  }
  const exec = govCurrentExecutiveStep(state);
  if (exec && govExecutiveTrackActive(state)) {
    return `${exec.title}: ${exec.body} Open Gov't Prog to continue.`;
  }
  return null;
}

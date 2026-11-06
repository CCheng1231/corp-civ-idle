import { applyOfficeRefund } from "./constants";
import {
  GOV_CHARTER_JOB,
  GOV_DAILY_QUESTS,
  GOV_EXECUTIVE_STEPS,
  GOV_GROWTH_STEPS,
  GOV_MONTHLY_QUESTS,
  GOV_RECRUIT_UNLOCK_COUNT,
  GOV_WEEKLY_QUESTS,
  type GovProgramReward,
} from "./govProgramData";
import { appendActivityLogs } from "./logbook";
import { formatAssignmentSummary } from "./unitEffects";
import type { GameState, GovProgramState, OfficeLocationId, UnitAssignment } from "./types";

export const GOV_CHARTER_DEFINITION_ID = GOV_CHARTER_JOB.definitionId;

const MS_DAY = 86_400_000;

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
    gessesaUnlocked: false,
    gessesaIntroSeen: false,
    pendingModal: null,
    chiefLessonPending: false,
    mapSiteInspected: false,
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
    growthStepId:
      typeof parsed.growthStepId === "string" ? parsed.growthStepId : null,
    growthCompletedStepIds: Array.isArray(parsed.growthCompletedStepIds)
      ? parsed.growthCompletedStepIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    charterSkipped: parsed.charterSkipped === true,
    charterCompleted: parsed.charterCompleted === true,
    executiveStepId:
      typeof parsed.executiveStepId === "string"
        ? parsed.executiveStepId
        : null,
    executiveCompletedStepIds: Array.isArray(parsed.executiveCompletedStepIds)
      ? parsed.executiveCompletedStepIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [],
    lifetimeRecruits:
      typeof parsed.lifetimeRecruits === "number" &&
      Number.isFinite(parsed.lifetimeRecruits)
        ? Math.max(0, Math.floor(parsed.lifetimeRecruits))
        : rosterFallbackRecruits,
    gessesaUnlocked: parsed.gessesaUnlocked === true,
    gessesaIntroSeen: parsed.gessesaIntroSeen === true,
    pendingModal:
      parsed.pendingModal === "gessesa_intro" ||
      parsed.pendingModal === "lafe_beat" ||
      parsed.pendingModal === "decline_growth"
        ? parsed.pendingModal
        : null,
    chiefLessonPending: parsed.chiefLessonPending === true,
    mapSiteInspected: parsed.mapSiteInspected === true,
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
  return { ...state, govProgram };
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

export function govGrowthTrackPaused(state: GameState): boolean {
  return govEngageLockActive(state);
}

export function govExecutiveTrackActive(state: GameState): boolean {
  const g = gp(state);
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
    g.gessesaIntroSeen = true;
    g.gessesaUnlocked = true;
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
  if (step === "exec_intro" && !g.gessesaIntroSeen) {
    g.pendingModal = "gessesa_intro";
  } else if (step === "exec_lafe_beat") {
    g.pendingModal = "lafe_beat";
  } else if (step === "exec_chief_switch") {
    g.chiefLessonPending = true;
    g.pendingModal = null;
  } else if (g.pendingModal === "gessesa_intro" && g.gessesaIntroSeen) {
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
  g.growthStepId = nextGrowthStepId(g.growthCompletedStepIds);
  return withGov(next, g);
}

function maybeStartExecutiveAtTen(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.lifetimeRecruits < GOV_RECRUIT_UNLOCK_COUNT) return state;
  if (g.gessesaUnlocked && g.growthDeclined) return state;
  if (g.growthDeclined) {
    if (!g.gessesaUnlocked) {
      g.gessesaUnlocked = true;
      g.pendingModal = g.gessesaIntroSeen ? null : "gessesa_intro";
    }
    return withGov(state, g);
  }
  if (!g.growthAccepted || g.charterSkipped) {
    if (!g.gessesaUnlocked) {
      g.gessesaUnlocked = true;
      g.pendingModal = g.gessesaIntroSeen ? null : "gessesa_intro";
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
  next = evaluateGrowthObjectives(next);
  return next;
}

export function govAcceptGrowthProgram(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.growthAccepted || g.growthDeclined) return state;
  g.growthAccepted = true;
  g.growthStepId = nextGrowthStepId(g.growthCompletedStepIds);
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
  g.pendingModal = g.gessesaIntroSeen ? null : "gessesa_intro";
  if (!g.gessesaUnlocked) g.gessesaUnlocked = true;
  let next = withGov(state, g);
  next = evaluateGrowthObjectives(next);
  return next;
}

export function govDismissIntroModal(state: GameState): GameState {
  const g = { ...gp(state) };
  if (g.pendingModal === "gessesa_intro") {
    g.gessesaIntroSeen = true;
    g.gessesaUnlocked = true;
    g.pendingModal = null;
    let next = withGov(state, g);
    if (g.executiveStepId === "exec_intro") {
      next = completeExecutiveStep(next, "exec_intro");
    }
    return next;
  }
  if (g.pendingModal === "lafe_beat") {
    g.pendingModal = null;
    let next = withGov(state, g);
    if (g.executiveStepId === "exec_lafe_beat") {
      next = completeExecutiveStep(next, "exec_lafe_beat");
    }
    return next;
  }
  return state;
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
  const g = { ...gp(state) };
  if (g.mapSiteInspected) return state;
  g.mapSiteInspected = true;
  return evaluateGrowthObjectives(withGov(state, g));
}

function growthObjectiveMet(state: GameState, stepId: string): boolean {
  const def = growthStepDef(stepId);
  if (!def) return false;
  const g = gp(state);
  switch (def.objectiveType) {
    case "structure_queue":
      return state.structureQueues.hq.some((j) => j.startedAt != null) ||
        Object.values(state.structureLevelsByLocation.hq).some((lv) => lv > 0);
    case "recruit_units":
      return g.lifetimeRecruits >= Number(def.param);
    case "open_map":
      return g.mapSiteInspected;
    case "engage_job":
      return g.growthCompletedStepIds.includes("growth_job") ||
        state.jobEngagements.length > 0 ||
        state.activityLog.some((e) => e.category === "job_complete");
    case "job_report":
      return (state.dismissedJobReportIds?.length ?? 0) > 0;
    case "research_queue":
      return state.researchQueues.hq.length > 0 ||
        Object.values(state.researchLevels).some((lv) => lv > 0);
    case "hint_only":
      return true;
    case "hire_unit_id": {
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

export function evaluateGrowthObjectives(state: GameState): GameState {
  const g = gp(state);
  if (g.growthDeclined || !g.growthAccepted || !g.growthStepId) return state;
  if (govGrowthTrackPaused(state)) return state;
  let next = state;
  let stepId: string | null = g.growthStepId;
  let guard = 0;
  while (stepId && guard < GOV_GROWTH_STEPS.length) {
    guard += 1;
    const def = growthStepDef(stepId);
    if (!def) break;
    if (def.objectiveType === "hint_only") {
      if (def.autoAdvance) {
        next = completeGrowthStep(next, stepId);
        stepId = gp(next).growthStepId;
        continue;
      }
      break;
    }
    if (!growthObjectiveMet(next, stepId)) break;
    next = completeGrowthStep(next, stepId);
    stepId = gp(next).growthStepId;
    if (!def.autoAdvance) break;
  }
  return next;
}

export function govAfterStructureQueueChange(state: GameState): GameState {
  return evaluateGrowthObjectives(state);
}

export function govAfterEngageJob(state: GameState): GameState {
  let next = evaluateGrowthObjectives(state);
  const g = gp(next);
  if (g.executiveStepId === "exec_charter_engage") {
    /* charter uses GOV_ENGAGE_CHARTER */
  }
  return next;
}

export function govAfterDismissJobReport(state: GameState): GameState {
  return evaluateGrowthObjectives(state);
}

export function govAfterResearchQueue(state: GameState): GameState {
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

export function govOnOpenGovProgram(state: GameState): GameState {
  const g = gp(state);
  if (g.executiveStepId !== "exec_unlock") {
    return evaluateGrowthObjectives(state);
  }
  let next = completeExecutiveStep(state, "exec_unlock");
  next = syncExecutiveSideEffects(next);
  return evaluateGrowthObjectives(next);
}

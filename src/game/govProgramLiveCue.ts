import { GOV_CHARTER_JOB } from "./govProgramData";
import {
  govCharterCanEngage,
  govCurrentExecutiveStep,
  govCurrentGrowthStep,
  govEngageLockActive,
  govGrowthTrackPaused,
} from "./govProgram";
import { resolveOfficeLocation } from "./officeSelection";
import type { GameAction, GameState } from "./types";

export type GovProgramCueScreen =
  | "operations"
  | "recruitment"
  | "world"
  | "job"
  | "research"
  | "roster";

export type GovLiveCueAction =
  | { kind: "game"; label: string; action: GameAction }
  | {
      kind: "local";
      label: string;
      id: "job-board" | "job-reports" | "open-chief-candidate";
    };

export interface GovLiveCue {
  title: string;
  instruction: string;
  action?: GovLiveCueAction;
}

/** On-screen step for the tab the player is looking at. Null when this screen is not the current step. */
export function govProgramLiveCue(
  state: GameState,
  screen: GovProgramCueScreen,
): GovLiveCue | null {
  if (
    (screen === "job" || screen === "world") &&
    govEngageLockActive(state)
  ) {
    return {
      title: "Orientation charter",
      instruction:
        "Other contracts stay locked until you run the charter on Gov't Prog.",
      action: {
        kind: "game",
        label: "Gov't Prog",
        action: { type: "SET_SECRETARY_PANEL", panel: "govProgram" },
      },
    };
  }

  const exec = govCurrentExecutiveStep(state);
  if (exec?.stepId === "exec_chief_switch" && screen === "roster") {
    return {
      title: exec.title,
      instruction: "Open a secretary, then Assign as Chief of Staff.",
      action: {
        kind: "local",
        label: "Open a profile",
        id: "open-chief-candidate",
      },
    };
  }

  if (exec?.stepId === "exec_charter_engage" && screen === "recruitment") {
    const officeId = resolveOfficeLocation(state);
    if (!govCharterCanEngage(state, officeId)) {
      return {
        title: "Charter crew",
        instruction: `Need ${GOV_CHARTER_JOB.minCrew} free contractors at this office before the charter.`,
        action: {
          kind: "game",
          label: "Show Fresh Graduate",
          action: {
            type: "SET_VIEW",
            view: "recruitment",
            recruitFocusUnitId: "fresh_graduate",
          },
        },
      };
    }
  }

  if (govGrowthTrackPaused(state)) return null;

  const growth = govCurrentGrowthStep(state);
  if (!growth) return null;

  switch (growth.stepId) {
    case "growth_structure":
      if (screen !== "operations") return null;
      return {
        title: growth.title,
        instruction:
          "Tap Upgrade on a structure you can afford — follow the arrow if you see one.",
      };
    case "growth_recruit_push":
      if (screen !== "recruitment") return null;
      if (
        state.govProgram?.pendingModal === "recruit_set_qty_intro" ||
        state.govProgram?.growthRecruitCoach === "set_qty" ||
        state.govProgram?.growthRecruitCoach === "pick_queue"
      ) {
        return null;
      }
      return {
        title: growth.title,
        instruction: "Hire 10 contractors — start with Fresh Graduate.",
      };
    case "growth_map":
      if (screen !== "world") return null;
      return {
        title: growth.title,
        instruction: "Tap a hex to open it. That inspect finishes this step.",
      };
    case "growth_job":
      if (screen === "job") {
        return {
          title: growth.title,
          instruction: "Open a posting and tap Engage.",
          action: { kind: "local", label: "Job board", id: "job-board" },
        };
      }
      if (screen === "world") {
        return {
          title: growth.title,
          instruction: "Send a team from a contract hex, or use the Job board.",
          action: {
            kind: "game",
            label: "Job board",
            action: { type: "SET_VIEW", view: "office" },
          },
        };
      }
      return null;
    case "growth_report":
      if (screen !== "job") return null;
      return {
        title: growth.title,
        instruction: "Open a job report, then dismiss it.",
        action: { kind: "local", label: "Job reports", id: "job-reports" },
      };
    case "growth_research":
      if (screen !== "research") return null;
      return {
        title: growth.title,
        instruction: "Queue any research project.",
        action: {
          kind: "game",
          label: "Show a project",
          action: {
            type: "SET_VIEW",
            view: "research",
            researchFocusResearchId: "eff_manuals_cash",
          },
        },
      };
    case "growth_bm_hired":
      if (screen !== "recruitment") return null;
      return {
        title: growth.title,
        instruction: "Recruit a Branch Manager.",
        action: {
          kind: "game",
          label: "Show Branch Manager",
          action: {
            type: "SET_VIEW",
            view: "recruitment",
            recruitFocusUnitId: "branch_manager",
          },
        },
      };
    default:
      return null;
  }
}

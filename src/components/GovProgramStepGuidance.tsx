import type { Dispatch, ReactNode } from "react";
import type { GovExecutiveStepDefinition, GovGrowthStepDefinition } from "../game/govProgramData";
import { govCharterCanEngage, govEngageLockActive } from "../game/govProgram";
import { resolveOfficeLocation } from "../game/officeSelection";
import type { GameAction, GameState, UnitId } from "../game/types";

interface GovProgramStepGuidanceProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  kind: "growth" | "executive";
  step: GovGrowthStepDefinition | GovExecutiveStepDefinition;
}

function GovProgramGuidanceActions({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="gov-program-step-actions" role="group" aria-label="Guided next step">
      {children}
    </div>
  );
}

export function GovProgramStepGuidance({
  state,
  dispatch,
  kind,
  step,
}: GovProgramStepGuidanceProps) {
  const officeId = resolveOfficeLocation(state);
  const charterGate =
    kind === "executive" &&
    step.stepId === "exec_charter_engage" &&
    govEngageLockActive(state) &&
    !govCharterCanEngage(state, officeId);

  if (kind === "growth") {
    const g = step as GovGrowthStepDefinition;
    switch (g.stepId) {
      case "growth_structure":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() => {
                dispatch({ type: "GOV_START_STRUCTURE_COACH" });
                dispatch({
                  type: "SET_VIEW",
                  view: "operations",
                  structureFocusStructureId: null,
                });
              }}
            >
              Go to Structure
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_recruit_push":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() => {
                dispatch({ type: "GOV_START_RECRUIT_COACH" });
                dispatch({
                  type: "SET_VIEW",
                  view: "recruitment",
                  recruitFocusUnitId: null,
                });
              }}
            >
              Go to Recruit
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_map":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() => dispatch({ type: "SET_VIEW", view: "world" })}
            >
              Open World map
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_job":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() => dispatch({ type: "SET_VIEW", view: "office" })}
            >
              Go to Job board
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_report":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() =>
                dispatch({ type: "SET_SECRETARY_PANEL", panel: "job" })
              }
            >
              Secretary → Job
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_research":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() => dispatch({ type: "SET_VIEW", view: "research" })}
            >
              Go to Research
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_bm_hint":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() =>
                dispatch({
                  type: "SET_VIEW",
                  view: "research",
                  researchFocusResearchId: "branch_management",
                })
              }
            >
              Branch Management (Research)
            </button>
          </GovProgramGuidanceActions>
        );
      case "growth_bm_hired":
        return (
          <GovProgramGuidanceActions>
            <button
              type="button"
              className="btn tab gov-program-step-go"
              onClick={() =>
                dispatch({
                  type: "SET_VIEW",
                  view: "recruitment",
                  recruitFocusUnitId: "branch_manager" as UnitId,
                })
              }
            >
              Recruit Branch Manager
            </button>
          </GovProgramGuidanceActions>
        );
      default:
        return null;
    }
  }

  const e = step as GovExecutiveStepDefinition;
  switch (e.stepId) {
    case "exec_roster":
      return (
        <GovProgramGuidanceActions>
          <button
            type="button"
            className="btn tab gov-program-step-go"
            onClick={() =>
              dispatch({ type: "SET_SECRETARY_PANEL", panel: "roster" })
            }
          >
            Open Roster
          </button>
        </GovProgramGuidanceActions>
      );
    case "exec_charter_engage":
      if (!charterGate) return null;
      return (
        <GovProgramGuidanceActions>
          <button
            type="button"
            className="btn tab gov-program-step-go"
            onClick={() => dispatch({ type: "SET_VIEW", view: "recruitment" })}
          >
            Hire more contractors
          </button>
        </GovProgramGuidanceActions>
      );
    case "exec_chief_switch":
      return (
        <GovProgramGuidanceActions>
          <button
            type="button"
            className="btn tab gov-program-step-go"
            onClick={() =>
              dispatch({ type: "SET_SECRETARY_PANEL", panel: "roster" })
            }
          >
            Open Roster
          </button>
        </GovProgramGuidanceActions>
      );
    default:
      return null;
  }
}

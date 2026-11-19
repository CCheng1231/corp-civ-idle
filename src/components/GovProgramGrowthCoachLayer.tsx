import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import { GovProgramStructureCoachCard } from "./GovProgramStructureCoachCard";

interface GovProgramGrowthCoachLayerProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

const GROWTH_COACH_MODALS = new Set([
  "growth_step_coach",
  "recruit_step_coach",
]);

/** Step-complete reward card (overlay) — steps 2–8 and generic celebrations. */
export function GovProgramGrowthCoachLayer({
  state,
  dispatch,
}: GovProgramGrowthCoachLayerProps) {
  const modal = state.govProgram?.pendingModal;
  if (!modal || !GROWTH_COACH_MODALS.has(modal)) return null;

  return (
    <GovProgramStructureCoachCard
      state={state}
      dispatch={dispatch}
      presentation="overlay"
    />
  );
}
import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import { govGrowthWorldCoachSpotlightCue } from "../game/govProgram";
import { GovProgramCoachSpotlight } from "./GovProgramCoachSpotlight";

interface GovProgramMapNavCoachProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function GovProgramMapNavCoach({
  state,
  dispatch,
}: GovProgramMapNavCoachProps) {
  const cue = govGrowthWorldCoachSpotlightCue(state);
  if (!cue) return null;

  return (
    <GovProgramCoachSpotlight
      anchorId={cue.anchorId}
      message={cue.message}
      dimBackground
      active
      dismissible={cue.dismissible}
      dismissLabel={cue.dismissLabel}
      onDismiss={
        cue.dismissible
          ? () => dispatch({ type: "GOV_ADVANCE_MAP_DRAWER_COACH" })
          : undefined
      }
    />
  );
}
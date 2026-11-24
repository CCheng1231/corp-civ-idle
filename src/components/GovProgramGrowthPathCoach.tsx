import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import { govGrowthPathCoachCue } from "../game/govProgram";
import { GovProgramCoachSpotlight } from "./GovProgramCoachSpotlight";

interface GovProgramGrowthPathCoachProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Steps 4–7 — Secretary / Research / Recruit spotlight chain. */
export function GovProgramGrowthPathCoach({
  state,
  dispatch,
}: GovProgramGrowthPathCoachProps) {
  const cue = govGrowthPathCoachCue(state);
  if (!cue) return null;

  return (
    <GovProgramCoachSpotlight
      anchorId={cue.anchorId}
      message={cue.message}
      dimBackground={!cue.relaxed}
      active
      dismissible={cue.dismissible}
      dismissLabel={cue.dismissLabel}
      onDismiss={
        cue.dismissible
          ? () => dispatch({ type: "GOV_ADVANCE_GROWTH_PATH_COACH" })
          : undefined
      }
    />
  );
}
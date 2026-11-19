import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";
import { govJobOfficeCoachSpotlightCue } from "../game/govProgram";
import { GovProgramCoachSpotlight } from "./GovProgramCoachSpotlight";

interface GovProgramJobEngageCoachProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function GovProgramJobEngageCoach({
  state,
  dispatch: _dispatch,
}: GovProgramJobEngageCoachProps) {
  const cue = govJobOfficeCoachSpotlightCue(state);
  if (!cue) return null;

  return (
    <GovProgramCoachSpotlight
      anchorId={cue.anchorId}
      message={cue.message}
      dimBackground
      active
    />
  );
}
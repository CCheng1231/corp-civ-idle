import type { Dispatch } from "react";
import { maxJobEngagements } from "../game/jobs";
import type { GameAction, GameState } from "../game/types";
import { JobBoard } from "./JobBoard";
import { LocationViewHeader } from "./LocationViewHeader";
import { SecretaryBriefing } from "./SecretaryBriefing";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const jobCap = maxJobEngagements(state);

  return (
    <div className="main-view-panel location-view-panel office-view">
      <LocationViewHeader
        title="Secretary"
        description={
          <>
            Daily briefing and regional job board. Crews deploy from the
            selected office, max {jobCap} engagements at once.
          </>
        }
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
        <SecretaryBriefing state={state} dispatch={dispatch} />
        <JobBoard state={state} dispatch={dispatch} />
      </div>
    </div>
  );
}

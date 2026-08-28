import type { Dispatch } from "react";
import { maxJobEngagements } from "../game/jobs";
import type { GameAction, GameState } from "../game/types";
import { LocationViewHeader } from "./LocationViewHeader";
import { SecretaryBriefing } from "./SecretaryBriefing";
import {
  portraitLockBodyClass,
  portraitLockPageClass,
  useTabPortraitSize,
} from "./TabPortraitLayout";

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Secretary — briefing, job reports, and job board. */
export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const jobCap = maxJobEngagements(state);
  const { portraitSize, setPortraitSize, portraitLarge } = useTabPortraitSize(
    SECRETARY_PORTRAIT_SIZE_KEY,
    true,
  );

  const secretaryHeader = (
    <LocationViewHeader
      title="Secretary"
      description={
        <>
          Daily briefing and regional job board. Crews deploy from the
          selected office — max {jobCap} task forces at once.
        </>
      }
      state={state}
      dispatch={dispatch}
    />
  );

  return (
    <div
      className={`main-view-panel location-view-panel office-view ${portraitLockPageClass(portraitLarge)}`}
    >
      {portraitLarge ? secretaryHeader : null}
      <div
        className={`location-view-body ${portraitLockBodyClass(portraitLarge)}`}
      >
        <SecretaryBriefing
          state={state}
          dispatch={dispatch}
          portraitSize={portraitSize}
          onPortraitSizeChange={setPortraitSize}
          portraitHeader={secretaryHeader}
        />
      </div>
    </div>
  );
}

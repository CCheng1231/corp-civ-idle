import type { Dispatch } from "react";
import type { GameAction } from "../game/types";

interface GovProgramStructureQueueIntroProps {
  dispatch: Dispatch<GameAction>;
}

/** Dialogue after first structure queue — arrow points up at “Structure in progress”. */
export function GovProgramStructureQueueIntro({
  dispatch,
}: GovProgramStructureQueueIntroProps) {
  return (
    <div
      className="gov-program-structure-queue-intro"
      role="dialog"
      aria-labelledby="gov-structure-queue-intro-title"
    >
      <div className="gov-program-queue-intro-arrow" aria-hidden="true" />
      <div className="gov-program-queue-intro-bubble">
        <p id="gov-structure-queue-intro-title" className="gov-program-queue-intro-text">
          Now you have queued a structure! It costs resources and real time to
          finish. Let&apos;s see what else you can do while it builds.
        </p>
        <button
          type="button"
          className="btn primary gov-program-queue-intro-btn"
          onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

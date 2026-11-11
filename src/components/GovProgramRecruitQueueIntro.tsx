import type { Dispatch } from "react";
import type { GameAction } from "../game/types";

interface GovProgramRecruitQueueIntroProps {
  dispatch: Dispatch<GameAction>;
}

export function GovProgramRecruitQueueIntro({
  dispatch,
}: GovProgramRecruitQueueIntroProps) {
  return (
    <div
      className="gov-program-structure-queue-intro gov-program-recruit-queue-intro"
      role="dialog"
      aria-labelledby="gov-recruit-queue-intro-title"
    >
      <div className="gov-program-queue-intro-arrow" aria-hidden="true" />
      <div className="gov-program-queue-intro-bubble">
        <p
          id="gov-recruit-queue-intro-title"
          className="gov-program-queue-intro-text"
        >
          Now you have queued a hire! It costs resources and takes time to fill
          the order. Keep working toward ten contractors on roster.
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

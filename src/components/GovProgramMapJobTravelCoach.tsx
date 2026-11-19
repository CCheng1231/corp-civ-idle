import type { Dispatch } from "react";
import type { GameAction } from "../game/types";

interface GovProgramMapJobTravelCoachProps {
  dispatch: Dispatch<GameAction>;
}

/** Step 4 — outbound leg explainer after map Engage (before stipend card). */
export function GovProgramMapJobTravelCoach({
  dispatch,
}: GovProgramMapJobTravelCoachProps) {
  return (
    <div className="map-world-job-travel-coach-backdrop" role="presentation">
      <div
        className="map-world-job-travel-coach-card"
        role="dialog"
        aria-labelledby="map-world-job-travel-coach-title"
      >
        <h2 id="map-world-job-travel-coach-title">Team dispatched</h2>
        <p className="map-world-job-travel-coach-copy">
          Crew is en route — follow the blue line on the map. Supply covered the
          round trip when you engaged. Job reports appear in Secretary when they
          return.
        </p>
        <div className="map-world-job-travel-coach-actions">
          <button
            type="button"
            className="btn primary gov-program-tutorial-btn"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
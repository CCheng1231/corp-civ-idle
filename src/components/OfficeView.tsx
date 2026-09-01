import type { Dispatch } from "react";
import { formatNumber } from "../game/constants";
import {
  engagementStatusLabel,
  jobDefinitionById,
} from "../game/jobs";
import {
  pendingJobReports,
  secretaryJobSummary,
  secretaryQuote,
} from "../game/secretaryBriefing";
import { totalAssigned } from "../game/unitEffects";
import type { GameAction, GameState } from "../game/types";
import secretaryPortrait from "../assets/secretary.jpg";
import { SecretaryBriefing } from "./SecretaryBriefing";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Secretary — briefing, job reports, and job board. */
export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const { active, cap } = secretaryJobSummary(state);
  const reportCount = pendingJobReports(state).length;
  const now = Date.now();

  const secretaryBesidePortrait = (
    <>
      <TabSiteHeader title="Secretary" state={state} dispatch={dispatch} />
      <section
        className="secretary-task-forces-beside"
        aria-label={`Task forces ${active} of ${cap}`}
      >
        <p className="secretary-task-forces-beside-row">
          <span className="secretary-task-forces-label">Task forces</span>
          <strong className="secretary-task-forces-value">
            {active}/{cap}
          </strong>
        </p>
        {state.jobEngagements.length > 0 ? (
          <ul className="secretary-task-forces-beside-list">
            {state.jobEngagements.map((engagement) => {
              const def = jobDefinitionById(engagement.definitionId);
              return (
                <li
                  key={engagement.id}
                  className="secretary-task-forces-beside-item"
                >
                  <div className="secretary-task-forces-beside-item-main">
                    <strong>{def.title}</strong>
                    <span className="muted">
                      {" "}
                      · {totalAssigned(engagement.crewAssigned)} units
                      {engagement.phase === "working"
                        ? ` · $${formatNumber(engagement.earnedSoFar)}`
                        : ""}{" "}
                      · {engagementStatusLabel(state, engagement, now)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-compact secretary-task-forces-cancel"
                    onClick={() =>
                      dispatch({
                        type: "CANCEL_JOB_ENGAGEMENT",
                        engagementId: engagement.id,
                      })
                    }
                  >
                    Cancel
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </>
  );

  const secretaryBelowPortrait = (
    <>
      <div className="secretary-stats-banner" aria-label="Pending reports">
        <span className="secretary-stats-banner-label">Reports</span>
        <span
          className={
            reportCount > 0
              ? "secretary-stats-banner-highlight"
              : "secretary-stats-banner-value"
          }
        >
          {reportCount}
        </span>
      </div>
      <SecretaryBriefing state={state} dispatch={dispatch} />
    </>
  );

  return (
    <div className="main-view-panel location-view-panel secretary-view">
      <div className="location-view-body">
        <TabPortraitLayout
          src={secretaryPortrait}
          storageKey={SECRETARY_PORTRAIT_SIZE_KEY}
          quote={secretaryQuote(state)}
          portraitLayout="stretch"
          parallaxScroll={false}
          portraitLocked={false}
          allowPortraitResize={false}
          className="tab-portrait-fit"
        >
          {secretaryBesidePortrait}
        </TabPortraitLayout>
        <div className="tab-below-portrait">{secretaryBelowPortrait}</div>
      </div>
    </div>
  );
}

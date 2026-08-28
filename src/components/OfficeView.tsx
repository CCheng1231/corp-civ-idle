import type { Dispatch } from "react";
import {
  pendingJobReports,
  secretaryJobSummary,
  secretaryQuote,
} from "../game/secretaryBriefing";
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

/** Nav: Sec — briefing, job reports, and job board. */
export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const { active, cap } = secretaryJobSummary(state);
  const reportCount = pendingJobReports(state).length;

  const secretaryBesidePortrait = (
    <>
      <TabSiteHeader title="Sec" state={state} dispatch={dispatch} />
      <div className="secretary-stats-beside" aria-label="Secretary summary">
        <p className="secretary-stats-beside-row">
          <span className="secretary-stats-beside-label">Task forces</span>
          <strong className="secretary-stats-beside-value">
            {active}/{cap}
          </strong>
        </p>
        <p className="secretary-stats-beside-row">
          <span className="secretary-stats-beside-label">Reports</span>
          <strong
            className={
              reportCount > 0
                ? "secretary-stats-beside-highlight"
                : "secretary-stats-beside-value"
            }
          >
            {reportCount}
          </strong>
        </p>
      </div>
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
        <div className="tab-below-portrait">
          <SecretaryBriefing state={state} dispatch={dispatch} />
        </div>
      </div>
    </div>
  );
}

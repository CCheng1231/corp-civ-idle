import { useEffect, useState, type Dispatch } from "react";
import { formatNumber } from "../game/constants";
import {
  engagementStatusLabel,
  jobDefinitionById,
} from "../game/jobs";
import {
  secretaryJobSummary,
  secretaryQuote,
} from "../game/secretaryBriefing";
import { totalAssigned } from "../game/unitEffects";
import type { GameAction, GameState } from "../game/types";
import secretaryPortrait from "../assets/secretary.jpg";
import secretaryReportArt from "../assets/Secretary_Report.jpg";
import {
  SecretaryBriefing,
  initialSecretaryWorkTab,
  type SecretaryWorkTab,
} from "./SecretaryBriefing";
import { SceneBanner } from "./SceneBanner";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { TabSiteHeader } from "./TabSiteHeader";
import { TaskForceStatusIcon } from "./TaskForceStatusIcon";

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";

interface OfficeViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Secretary — briefing, job reports, and job board. */
export function OfficeView({ state, dispatch }: OfficeViewProps) {
  const { active, cap } = secretaryJobSummary(state);
  const now = Date.now();
  const [workTab, setWorkTab] = useState<SecretaryWorkTab>(initialSecretaryWorkTab);

  useEffect(() => {
    if (state.jobFocusPostingId) {
      setWorkTab("board");
    }
  }, [state.jobFocusPostingId]);

  const secretaryBesidePortrait = (
    <>
      <TabSiteHeader title="Secretary" state={state} dispatch={dispatch} />
      <section
        className="secretary-task-forces-beside tab-queue-section tab-compact-queue"
        aria-label={`Task forces ${active} of ${cap}`}
      >
        <div className="tab-queue-heading">
          <h3>Task forces</h3>
          <span className="tab-queue-count muted">
            {active}/{cap}
          </span>
        </div>
        {state.jobEngagements.length > 0 ? (
          <div className="build-queue-slot" data-max-slots={cap}>
            <ul className="build-queue">
              {state.jobEngagements.map((engagement) => {
                const def = jobDefinitionById(engagement.definitionId);
                const units = totalAssigned(engagement.crewAssigned);
                const earned =
                  engagement.phase === "working"
                    ? ` · $${formatNumber(engagement.earnedSoFar)}`
                    : "";
                const status = engagementStatusLabel(state, engagement, now);
                const tip = `${def.title} · ${units} unit${units === 1 ? "" : "s"}${earned} · ${status}`;
                return (
                  <li
                    key={engagement.id}
                    className="build-queue-row-with-cancel secretary-task-force-row"
                    data-tip={tip}
                    aria-label={tip}
                  >
                    <TaskForceStatusIcon phase={engagement.phase} />
                    <div className="secretary-task-force-row-body">
                      <span className="queue-name">{def.title}</span>
                      <span className="queue-status">{status}</span>
                    </div>
                    {engagement.phase === "outbound" ||
                    engagement.phase === "working" ? (
                      <button
                        type="button"
                        className="map-hex-job-send queue-cancel-btn"
                        onClick={() =>
                          dispatch({
                            type: "CANCEL_JOB_ENGAGEMENT",
                            engagementId: engagement.id,
                          })
                        }
                      >
                        Cancel
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );

  const secretaryBelowPortrait = (
    <>
      <SceneBanner
        src={secretaryReportArt}
        storageKey="corp-civ-idle-secretary-report-art-pan"
      />
      <SecretaryBriefing
        state={state}
        dispatch={dispatch}
        workTab={workTab}
        onWorkTabChange={setWorkTab}
      />
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

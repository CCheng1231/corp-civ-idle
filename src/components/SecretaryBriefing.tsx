import { useState, useEffect, type Dispatch, type ReactNode } from "react";
import { formatNumber } from "../game/constants";
import {
  engagementStatusLabel,
  jobDefinitionById,
} from "../game/jobs";
import {
  jobReportBrief,
  jobReportHeadline,
  pendingJobReports,
  secretaryQuote,
  secretaryTips,
  secretaryJobSummary,
} from "../game/secretaryBriefing";
import { totalAssigned } from "../game/unitEffects";
import type { GameAction, GameState } from "../game/types";
import secretaryPortrait from "../assets/secretary.jpg";
import { JobBoard } from "./JobBoard";
import {
  DUAL_PORTRAIT_TAB_PROPS,
  TabPortraitLayout,
  dualPortraitTabClass,
  useTabPortraitSize,
  type PortraitSize,
} from "./TabPortraitLayout";

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";
const SECRETARY_WORK_TAB_KEY = "corp-civ-idle-secretary-work-tab";

type SecretaryWorkTab = "reports" | "board";

function initialWorkTab(): SecretaryWorkTab {
  try {
    const stored = localStorage.getItem(SECRETARY_WORK_TAB_KEY);
    if (stored === "reports" || stored === "board") return stored;
  } catch {
    /* ignore */
  }
  return "reports";
}

interface SecretaryBriefingProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  portraitSize?: PortraitSize;
  onPortraitSizeChange?: (size: PortraitSize) => void;
  portraitHeader?: ReactNode;
}

export function SecretaryBriefing({
  state,
  dispatch,
  portraitSize: portraitSizeProp,
  onPortraitSizeChange,
  portraitHeader,
}: SecretaryBriefingProps) {
  const quote = secretaryQuote(state);
  const tips = secretaryTips(state);
  const { active, cap } = secretaryJobSummary(state);
  const jobReports = pendingJobReports(state);
  const now = Date.now();
  const [workTab, setWorkTab] = useState<SecretaryWorkTab>(initialWorkTab);
  const { portraitSize, setPortraitSize, portraitLarge } = useTabPortraitSize(
    SECRETARY_PORTRAIT_SIZE_KEY,
    true,
  );

  useEffect(() => {
    try {
      localStorage.setItem(SECRETARY_WORK_TAB_KEY, workTab);
    } catch {
      /* ignore */
    }
  }, [workTab]);
  const effectivePortraitSize = portraitSizeProp ?? portraitSize;
  const effectiveSetPortraitSize = onPortraitSizeChange ?? setPortraitSize;
  const effectivePortraitLarge = effectivePortraitSize === "large";

  function openJobLogbook(entryId?: string) {
    dispatch({
      type: "SET_VIEW",
      view: "logbook",
      logbookFilter: "jobs",
      logbookHighlightEntryId: entryId ?? null,
    });
  }

  const secretaryWorkPanel = (
    <div className="secretary-work-panel">
      <div
        className="secretary-work-tabs logbook-filters"
        role="tablist"
        aria-label="Secretary work panels"
      >
        <button
          type="button"
          role="tab"
          id="secretary-tab-reports"
          aria-selected={workTab === "reports"}
          aria-controls="secretary-panel-reports"
          className={workTab === "reports" ? "tab active" : "tab"}
          onClick={() => setWorkTab("reports")}
        >
          Job reports
        </button>
        <button
          type="button"
          role="tab"
          id="secretary-tab-board"
          aria-selected={workTab === "board"}
          aria-controls="secretary-panel-board"
          className={workTab === "board" ? "tab active" : "tab"}
          onClick={() => setWorkTab("board")}
        >
          Job board
        </button>
      </div>

      <div className="secretary-work-tabpanels">
        <div
          id="secretary-panel-reports"
          role="tabpanel"
          aria-labelledby="secretary-tab-reports"
          aria-hidden={workTab !== "reports"}
          className={`secretary-work-reports-tab${
            workTab !== "reports" ? " secretary-work-tab-inert" : ""
          }`}
          {...(workTab !== "reports" ? { inert: true as const } : {})}
        >
          <section
            className="secretary-panel secretary-job-reports-panel"
            aria-label="Job reports"
          >
            <header className="secretary-panel-head">
              <h3>Job reports</h3>
              <div className="secretary-job-reports-actions">
                <button
                  type="button"
                  className="btn linkish secretary-job-reports-log-link"
                  onClick={() => openJobLogbook()}
                >
                  Open job log
                </button>
                <button
                  type="button"
                  className="btn linkish secretary-job-reports-clear-link"
                  disabled={jobReports.length === 0}
                  onClick={() => dispatch({ type: "CLEAR_ALL_JOB_REPORTS" })}
                >
                  Clear all
                </button>
              </div>
            </header>
            {jobReports.length > 0 ? (
              <ul className="secretary-job-reports-list">
                {jobReports.map((entry) => (
                  <li
                    key={entry.id}
                    className={`secretary-job-report secretary-job-report-${entry.category}`}
                  >
                    <div className="secretary-job-report-body">
                      <p className="secretary-job-report-line1">
                        {jobReportHeadline(entry)}
                      </p>
                      <p className="secretary-job-report-line2 muted">
                        {jobReportBrief(entry, state.activityLog)}{" "}
                        <button
                          type="button"
                          className="btn linkish secretary-job-report-detail-link"
                          onClick={() => openJobLogbook(entry.id)}
                        >
                          Full details in logbook
                        </button>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="tab secretary-job-report-dismiss"
                      aria-label="Dismiss report"
                      onClick={() =>
                        dispatch({
                          type: "DISMISS_JOB_REPORT",
                          logEntryId: entry.id,
                        })
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted secretary-job-reports-empty">
                No new reports — completed and withdrawn jobs will show here.
              </p>
            )}
          </section>

          <section className="secretary-panel secretary-jobs-panel">
            <header className="secretary-panel-head">
              <h3>Task forces</h3>
              <span className="secretary-jobs-cap">
                {active}/{cap}
              </span>
            </header>
            <div className="secretary-panel-body">
              {active === 0 ? (
                <p className="muted secretary-panel-lead">
                  No task forces deployed — pick a posting on the job board tab.
                </p>
              ) : (
                <p className="muted secretary-panel-lead">
                  {active} task force{active === 1 ? "" : "s"} in the field.
                </p>
              )}
              <div
                className="secretary-panel-extra"
                aria-label="Active task forces"
              >
                {state.jobEngagements.length > 0 ? (
                  <ul className="secretary-active-jobs">
                    {state.jobEngagements.map((engagement) => {
                      const def = jobDefinitionById(engagement.definitionId);
                      return (
                        <li
                          key={engagement.id}
                          className="secretary-active-job-row"
                        >
                          <div>
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
                            className="btn btn-compact"
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
              </div>
            </div>
          </section>

          <section className="secretary-panel secretary-tips-panel">
            <header className="secretary-panel-head">
              <h3>Focus for now</h3>
            </header>
            <ul className="secretary-tips-list">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </div>

        <div
          id="secretary-panel-board"
          role="tabpanel"
          aria-labelledby="secretary-tab-board"
          aria-hidden={workTab !== "board"}
          className={`secretary-work-board-tab${
            workTab !== "board" ? " secretary-work-tab-inert" : ""
          }`}
          {...(workTab !== "board" ? { inert: true as const } : {})}
        >
          <JobBoard state={state} dispatch={dispatch} embedded />
        </div>
      </div>
    </div>
  );

  return (
    <TabPortraitLayout
      src={secretaryPortrait}
      storageKey={SECRETARY_PORTRAIT_SIZE_KEY}
      portraitSize={effectivePortraitSize}
      onPortraitSizeChange={effectiveSetPortraitSize}
      quote={quote}
      tallPortrait
      {...DUAL_PORTRAIT_TAB_PROPS}
      className={`secretary-tab-scene ${dualPortraitTabClass(effectivePortraitLarge)}`}
    >
      {effectivePortraitLarge ? secretaryWorkPanel : (
        <div className="portrait-lock-split-right">
          {portraitHeader ? (
            <div className="portrait-lock-frozen-header">{portraitHeader}</div>
          ) : null}
          <div className="portrait-lock-scroll-body">{secretaryWorkPanel}</div>
        </div>
      )}
    </TabPortraitLayout>
  );
}

import { useEffect, type Dispatch } from "react";
import {
  jobReportBrief,
  jobReportHeadline,
  pendingJobReports,
  secretaryTips,
} from "../game/secretaryBriefing";
import type { GameAction, GameState } from "../game/types";
import { JobBoard } from "./JobBoard";

const SECRETARY_WORK_TAB_KEY = "corp-civ-idle-secretary-work-tab";

export type SecretaryWorkTab = "reports" | "board";

export function initialSecretaryWorkTab(): SecretaryWorkTab {
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
  workTab: SecretaryWorkTab;
  onWorkTabChange: (tab: SecretaryWorkTab) => void;
}

export function SecretaryBriefing({
  state,
  dispatch,
  workTab,
  onWorkTabChange,
}: SecretaryBriefingProps) {
  const tips = secretaryTips(state);
  const jobReports = pendingJobReports(state);

  useEffect(() => {
    try {
      localStorage.setItem(SECRETARY_WORK_TAB_KEY, workTab);
    } catch {
      /* ignore */
    }
  }, [workTab]);

  function openJobLogbook(entryId?: string) {
    dispatch({
      type: "SET_VIEW",
      view: "logbook",
      logbookFilter: "jobs",
      logbookHighlightEntryId: entryId ?? null,
    });
  }

  return (
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
          onClick={() => onWorkTabChange("reports")}
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
          onClick={() => onWorkTabChange("board")}
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
}

import { useEffect, type Dispatch } from "react";
import {
  jobReportBrief,
  jobReportHeadline,
  pendingJobReports,
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
  const jobReports = pendingJobReports(state);

  useEffect(() => {
    try {
      localStorage.setItem(SECRETARY_WORK_TAB_KEY, workTab);
    } catch {
      /* ignore */
    }
  }, [workTab]);

  function openJobLogbook() {
    dispatch({
      type: "SET_SECRETARY_PANEL",
      panel: "log",
      logbookFilter: "jobs",
      logbookHighlightEntryId: null,
    });
  }

  return (
    <section
      className={`secretary-job-work secretary-job-work--${workTab}`}
      aria-label="Secretary job desk"
    >
      <header className="secretary-job-work-toolbar">
        <div
          className="secretary-job-work-tabs logbook-filters"
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
        {workTab === "reports" ? (
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
        ) : (
          <div
            id="secretary-job-board-toolbar-slot"
            className="secretary-job-work-toolbar-slot"
          />
        )}
      </header>

      {workTab === "reports" ? (
        <div
          id="secretary-panel-reports"
          role="tabpanel"
          aria-labelledby="secretary-tab-reports"
          className="secretary-job-reports"
        >
          {jobReports.length > 0 ? (
            <ul className="secretary-job-reports-list">
              {jobReports.map((entry) => (
                <li
                  key={entry.id}
                  className={`secretary-job-report secretary-job-report-${entry.category}`}
                >
                  <div className="secretary-job-report-body">
                    <span className="secretary-job-report-line1">
                      {jobReportHeadline(entry)}
                    </span>
                    <span className="secretary-job-report-line2 muted">
                      {jobReportBrief(entry, state.activityLog)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="secretary-job-report-dismiss"
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
        </div>
      ) : (
        <div
          id="secretary-panel-board"
          role="tabpanel"
          aria-labelledby="secretary-tab-board"
          className="secretary-job-board"
        >
          <JobBoard
            state={state}
            dispatch={dispatch}
            embedded
            embeddedActive
          />
        </div>
      )}
    </section>
  );
}

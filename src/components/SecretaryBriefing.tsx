import { useEffect, useState, type Dispatch } from "react";
import {
  jobReportBrief,
  jobReportExpandedLines,
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
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SECRETARY_WORK_TAB_KEY, workTab);
    } catch {
      /* ignore */
    }
  }, [workTab]);

  useEffect(() => {
    if (
      expandedReportId &&
      !jobReports.some((e) => e.id === expandedReportId)
    ) {
      setExpandedReportId(null);
    }
  }, [jobReports, expandedReportId]);

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
      <header
        className={`secretary-job-work-toolbar${
          workTab === "board" ? " secretary-job-work-toolbar--board" : ""
        }`}
      >
        <div className="secretary-job-work-toolbar-row">
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
        </div>
        {workTab === "board" ? (
          <div
            id="secretary-job-board-active-filters-slot"
            className="secretary-job-work-toolbar-filters"
          />
        ) : null}
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
              {jobReports.map((entry) => {
                const expanded = expandedReportId === entry.id;
                const detailLines = jobReportExpandedLines(
                  entry,
                  state.activityLog,
                );
                return (
                  <li
                    key={entry.id}
                    className={[
                      "secretary-job-report",
                      `secretary-job-report-${entry.category}`,
                      expanded ? "secretary-job-report--expanded" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="secretary-job-report-row">
                      <button
                        type="button"
                        className="secretary-job-report-toggle"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedReportId((id) =>
                            id === entry.id ? null : entry.id,
                          )
                        }
                      >
                        <div className="secretary-job-report-body">
                          <span className="secretary-job-report-line1">
                            {jobReportHeadline(entry)}
                          </span>
                          <span className="secretary-job-report-line2 muted">
                            {jobReportBrief(entry, state.activityLog)}
                          </span>
                        </div>
                      </button>
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
                    </div>
                    {expanded && detailLines.length > 0 ? (
                      <div
                        className="secretary-job-report-expanded"
                        role="region"
                        aria-label="Report details"
                      >
                        {detailLines.map((line, i) => (
                          <p key={i} className="secretary-job-report-detail-line">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </li>
                );
              })}
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

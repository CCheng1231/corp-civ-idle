import { useEffect, useState, type Dispatch } from "react";
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

const SECRETARY_PORTRAIT_SIZE_KEY = "corp-civ-idle-secretary-portrait-size";

type SecretaryPortraitSize = "compact" | "large";

function initialPortraitSize(): SecretaryPortraitSize {
  try {
    const stored = localStorage.getItem(SECRETARY_PORTRAIT_SIZE_KEY);
    if (stored === "compact" || stored === "large") return stored;
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 961px)").matches) {
    return "large";
  }
  return "compact";
}

interface SecretaryBriefingProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function SecretaryBriefing({ state, dispatch }: SecretaryBriefingProps) {
  const quote = secretaryQuote(state);
  const tips = secretaryTips(state);
  const { active, cap } = secretaryJobSummary(state);
  const jobReports = pendingJobReports(state);
  const now = Date.now();
  const [portraitSize, setPortraitSize] = useState<SecretaryPortraitSize>(
    initialPortraitSize,
  );
  const portraitLarge = portraitSize === "large";

  useEffect(() => {
    try {
      localStorage.setItem(SECRETARY_PORTRAIT_SIZE_KEY, portraitSize);
    } catch {
      /* ignore */
    }
  }, [portraitSize]);

  function openJobLogbook() {
    dispatch({ type: "SET_VIEW", view: "logbook", logbookFilter: "jobs" });
  }

  return (
    <div
      className={`office-scene${portraitLarge ? " secretary-portrait-large" : ""}`}
    >
      <div
        className={`secretary-intro${portraitLarge ? " secretary-intro-large" : ""}`}
      >
        <div className="secretary-portrait-wrap">
          <div className="secretary-portrait-frame">
            <img
              src={secretaryPortrait}
              alt=""
              className="secretary-portrait"
              aria-hidden
            />
          </div>
          <button
            type="button"
            className="tab secretary-portrait-resize"
            aria-pressed={portraitLarge}
            onClick={() =>
              setPortraitSize((size) => (size === "large" ? "compact" : "large"))
            }
          >
            {portraitLarge ? "Smaller portrait" : "Larger portrait"}
          </button>
        </div>
        <blockquote className="secretary-quote">
          <p>&ldquo;{quote}&rdquo;</p>
        </blockquote>
      </div>

      <div className="secretary-briefing">
        <section className="secretary-panel secretary-jobs-panel">
          <header className="secretary-panel-head">
            <h3>Job engagements</h3>
            <span className="secretary-jobs-cap">
              {active}/{cap}
            </span>
          </header>
          <div className="secretary-panel-body">
            {active === 0 ? (
              <p className="muted secretary-panel-lead">
                No crews on contract — pick a posting below.
              </p>
            ) : (
              <p className="muted secretary-panel-lead">
                {active} active engagement{active === 1 ? "" : "s"} in the field.
              </p>
            )}
            <div className="secretary-panel-extra" aria-label="Active engagements">
              {state.jobEngagements.length > 0 ? (
                <ul className="secretary-active-jobs">
                  {state.jobEngagements.map((engagement) => {
                    const def = jobDefinitionById(engagement.definitionId);
                    return (
                      <li key={engagement.id} className="secretary-active-job-row">
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

        {jobReports.length > 0 ? (
          <section
            className="secretary-panel secretary-job-reports-panel"
            aria-label="Job reports"
          >
            <header className="secretary-panel-head">
              <h3>Job reports</h3>
              <button
                type="button"
                className="btn linkish secretary-job-reports-log-link"
                onClick={openJobLogbook}
              >
                Open job log
              </button>
            </header>
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
                      {jobReportBrief(entry)}{" "}
                      <button
                        type="button"
                        className="btn linkish secretary-job-report-detail-link"
                        onClick={openJobLogbook}
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
          </section>
        ) : null}

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
    </div>
  );
}

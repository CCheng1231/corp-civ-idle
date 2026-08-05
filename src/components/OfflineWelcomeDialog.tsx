import { type Dispatch } from "react";
import { OFFLINE_CATCHUP_CAP_SEC } from "../game/constants";
import {
  formatOfflineAway,
  formatOfflineGained,
} from "../game/offlineWelcome";
import type { GameAction, OfflineWelcomeSummary } from "../game/types";

interface OfflineWelcomeDialogProps {
  summary: OfflineWelcomeSummary;
  dispatch: Dispatch<GameAction>;
}

export function OfflineWelcomeDialog({
  summary,
  dispatch,
}: OfflineWelcomeDialogProps) {
  const gainedText = formatOfflineGained(summary.gained);
  const completionLines = [
    ...summary.structures,
    ...summary.research,
    ...summary.hires,
  ];
  if (summary.jobsFinished > 0) {
    completionLines.push(
      summary.jobsFinished === 1
        ? "1 job shift finished"
        : `${summary.jobsFinished} job shifts finished`,
    );
  }

  return (
    <div
      className="modal-backdrop offline-welcome-backdrop"
      onClick={() => dispatch({ type: "DISMISS_OFFLINE_SUMMARY" })}
      role="presentation"
    >
      <div
        className="modal offline-welcome-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="offline-welcome-title"
      >
        <header className="modal-header">
          <h2 id="offline-welcome-title">Welcome back</h2>
        </header>
        <div className="offline-welcome-body">
          <p className="offline-welcome-away">
            You were away for{" "}
            <strong>{formatOfflineAway(summary.awaySec)}</strong>
            {summary.awaySec > OFFLINE_CATCHUP_CAP_SEC
              ? " (resource catch-up capped at 24 hr)"
              : ""}
            .
          </p>
          {gainedText ? (
            <p className="offline-welcome-gained">
              <span className="offline-welcome-label">Earned</span>
              {gainedText}
            </p>
          ) : null}
          {completionLines.length > 0 ? (
            <div className="offline-welcome-completions">
              <span className="offline-welcome-label">Finished while away</span>
              <ul>
                {completionLines.slice(0, 8).map((line) => (
                  <li key={line}>{line}</li>
                ))}
                {completionLines.length > 8 ? (
                  <li className="muted">
                    +{completionLines.length - 8} more
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        <footer className="offline-welcome-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => dispatch({ type: "DISMISS_OFFLINE_SUMMARY" })}
          >
            Continue
          </button>
        </footer>
      </div>
    </div>
  );
}

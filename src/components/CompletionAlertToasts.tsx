import { useEffect, type CSSProperties, type Dispatch } from "react";
import type { CompletionAlert, GameAction, GameSettings } from "../game/types";

const EMPTY_ALERTS: CompletionAlert[] = [];

interface CompletionAlertToastsProps {
  alerts?: CompletionAlert[] | null;
  settings: GameSettings;
  dispatch: Dispatch<GameAction>;
}

function kindLabel(kind: CompletionAlert["kind"]): string {
  switch (kind) {
    case "structure":
      return "Structure";
    case "research":
      return "Research";
    case "recruitment":
      return "Recruitment";
    case "job":
      return "Task force";
  }
}

export function CompletionAlertToasts({
  alerts,
  settings,
  dispatch,
}: CompletionAlertToastsProps) {
  const list = alerts ?? EMPTY_ALERTS;
  const alertKey = list.map((alert) => alert.id).join("|");
  const autoDismiss = settings.alertAutoDismiss !== false;
  const lifeSec = Math.max(2, settings.alertAutoDismissSec ?? 7);
  const lifeMs = lifeSec * 1000;

  useEffect(() => {
    if (!autoDismiss || list.length === 0) return;
    const timers = list.map((alert) =>
      window.setTimeout(() => {
        dispatch({ type: "DISMISS_COMPLETION_ALERT", alertId: alert.id });
      }, lifeMs),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
    // Re-arm only when alert ids or dismiss settings change
  }, [alertKey, autoDismiss, lifeMs, dispatch]);

  if (list.length === 0) return null;

  return (
    <div className="completion-alert-stack" aria-live="polite">
      {list.map((alert) => (
        <aside
          key={alert.id}
          className={[
            "completion-alert",
            `completion-alert-${alert.kind}`,
            autoDismiss ? "completion-alert-autodismiss" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={
            autoDismiss
              ? ({ "--alert-life-ms": `${lifeMs}ms` } as CSSProperties)
              : undefined
          }
          role="status"
        >
          <div className="completion-alert-text">
            <span className="completion-alert-kind">{kindLabel(alert.kind)}</span>
            <strong className="completion-alert-title">{alert.title}</strong>
            {alert.detail ? (
              <span className="completion-alert-detail">{alert.detail}</span>
            ) : null}
          </div>
          <button
            type="button"
            className="completion-alert-close"
            aria-label="Dismiss"
            onClick={() =>
              dispatch({ type: "DISMISS_COMPLETION_ALERT", alertId: alert.id })
            }
          >
            ×
          </button>
        </aside>
      ))}
    </div>
  );
}

import { type Dispatch } from "react";
import {
  ALERT_AUTO_DISMISS_SEC_MAX,
  ALERT_AUTO_DISMISS_SEC_MIN,
  clampAlertAutoDismissSec,
  resetGameState,
} from "../game/save";
import { DevTimeSkip } from "./DevTimeSkip";
import type { GameAction, GameState } from "../game/types";

interface SettingsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function SettingsView({ state, dispatch }: SettingsViewProps) {
  return (
    <div className="main-view-panel">
      <header className="main-view-header">
        <h2>Settings</h2>
        <p className="muted">Display preferences and developer tools.</p>
      </header>

      <section className="settings-block">
        <h3>Display</h3>
        <label className="setting-row">
          UI scale
          <input
            type="range"
            min={0.85}
            max={1.25}
            step={0.05}
            value={state.settings.uiScale}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { uiScale: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="setting-row">
          Completion alerts
          <input
            type="checkbox"
            checked={state.settings.notifications}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { notifications: e.target.checked },
              })
            }
          />
        </label>
        <p className="muted setting-hint">
          Pop up when a structure, research project, or hire order finishes, and
          note what that queue starts next (if anything).
        </p>
        <label className="setting-row">
          Auto-dismiss alerts
          <input
            type="checkbox"
            checked={state.settings.alertAutoDismiss !== false}
            disabled={!state.settings.notifications}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { alertAutoDismiss: e.target.checked },
              })
            }
          />
        </label>
        <label className="setting-row">
          Alert fade timer
          <span className="setting-row-inline">
            <input
              type="range"
              min={ALERT_AUTO_DISMISS_SEC_MIN}
              max={ALERT_AUTO_DISMISS_SEC_MAX}
              step={1}
              value={clampAlertAutoDismissSec(
                state.settings.alertAutoDismissSec,
              )}
              disabled={
                !state.settings.notifications ||
                state.settings.alertAutoDismiss === false
              }
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  settings: {
                    alertAutoDismissSec: clampAlertAutoDismissSec(
                      Number(e.target.value),
                    ),
                  },
                })
              }
            />
            <span className="setting-value">
              {clampAlertAutoDismissSec(state.settings.alertAutoDismissSec)}s
            </span>
          </span>
        </label>
        <p className="muted setting-hint">
          When auto-dismiss is on, alerts fade out after this many seconds
          ({ALERT_AUTO_DISMISS_SEC_MIN}–{ALERT_AUTO_DISMISS_SEC_MAX}). Turn it
          off to keep alerts until you close them.
        </p>
        <div className="setting-row setting-row-stack">
          <span>Layout preview</span>
          <div className="viewport-preview-toggle" role="group" aria-label="Layout preview">
            {(["auto", "desktop", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={
                  (state.settings.viewportPreview ?? "auto") === mode
                    ? "tab active"
                    : "tab"
                }
                onClick={() =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    settings: { viewportPreview: mode },
                  })
                }
              >
                {mode === "auto"
                  ? "Auto"
                  : mode === "desktop"
                    ? "Desktop"
                    : "Mobile"}
              </button>
            ))}
          </div>
        </div>
        <p className="muted setting-hint">
          Override responsive layout for UI testing. Mobile forces bottom nav and
          phone-style breakpoints on any window size.
        </p>
      </section>

      <section className="dev-menu settings-block">
        <h3>Developer</h3>
        <label className="setting-row">
          Ignore all costs
          <input
            type="checkbox"
            checked={state.settings.ignoreCosts}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { ignoreCosts: e.target.checked },
              })
            }
          />
        </label>
        <p className="muted setting-hint">
          When on, structures, research, recruitment, branch opening, and tower
          bids do not spend resources or office power. All research nodes are
          unlocked regardless of prerequisites.
        </p>
        <label className="setting-row">
          Ignore all timers
          <input
            type="checkbox"
            checked={state.settings.ignoreTimers}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { ignoreTimers: e.target.checked },
              })
            }
          />
        </label>
        <p className="muted setting-hint">
          When on, structure builds, research, recruitment, staff travel, and
          job engagement shifts finish immediately. Passive income still runs
          normally.
        </p>
        <DevTimeSkip dispatch={dispatch} />
      </section>

      <section className="settings-block">
        <h3>Save</h3>
        <button
          type="button"
          className="btn danger-btn"
          onClick={() =>
            dispatch({ type: "LOAD", state: resetGameState(state.settings) })
          }
        >
          Reset save
        </button>
      </section>
    </div>
  );
}

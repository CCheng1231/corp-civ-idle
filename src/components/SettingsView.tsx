import { type Dispatch } from "react";
import { resetGameState } from "../game/save";
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
          Notifications
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
          When on, structure builds (table hours), recruitment, staff travel, and
          tower contracts finish immediately. Passive income still runs normally.
        </p>
        <DevTimeSkip dispatch={dispatch} />
      </section>

      <section className="settings-block">
        <h3>Save</h3>
        <button
          type="button"
          className="btn danger-btn"
          onClick={() => dispatch({ type: "LOAD", state: resetGameState() })}
        >
          Reset save
        </button>
      </section>
    </div>
  );
}

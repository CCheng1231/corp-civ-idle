import { type Dispatch } from "react";
import {
  ALERT_AUTO_DISMISS_SEC_MAX,
  ALERT_AUTO_DISMISS_SEC_MIN,
  clampAlertAutoDismissSec,
  resetGameState,
} from "../game/save";
import { DevTimeSkip } from "./DevTimeSkip";
import { AudioControls } from "./AudioControls";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession } from "../multiplayer/types";
import { PLAYER_LABELS, isOnlineSession } from "../multiplayer/types";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import { clearSession, writeSession, createSession } from "../multiplayer/session";
interface SettingsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  session?: OnlineSession;
}

export function SettingsView({ state, dispatch, session }: SettingsViewProps) {
  const online = session ? isOnlineSession(session) : false;

  function switchAccount() {    if (
      !window.confirm(
        "Return to account picker? Unsaved progress is auto-saved for Online.",
      )
    ) {
      return;
    }
    clearSession();
    window.location.reload();
  }

  function switchPlayMode(mode: "offline" | "online") {
    if (!session || session.playMode === mode) return;
    if (mode === "online" && !isFirebaseConfigured()) {
      window.alert("Online mode requires Firebase config in .env.local");
      return;
    }
    if (
      !window.confirm(
        `Switch to ${mode} mode? Offline and Online saves are separate.`,
      )
    ) {
      return;
    }
    writeSession(createSession(session.playerId, mode));
    window.location.reload();
  }

  return (
    <div className="main-view-panel">
      <header className="main-view-header">
        <h2>Settings</h2>
        <p className="muted">
          {online
            ? "Display preferences and account settings."
            : "Display preferences and developer tools."}
        </p>
      </header>

      {session ? (
        <section className="settings-block">
          <h3>Account &amp; mode</h3>
          <p className="muted setting-hint">
            Playing as <strong>{PLAYER_LABELS[session.playerId]}</strong> in{" "}
            <strong>{session.playMode}</strong> mode.
            {isOnlineSession(session) && state.onlineConnectionStatus
              ? ` Firestore: ${state.onlineConnectionStatus}.`
              : null}
          </p>
          <div className="settings-account-actions">
            <button type="button" className="btn" onClick={switchAccount}>
              Switch account
            </button>
            <button
              type="button"
              className={session.playMode === "offline" ? "tab active" : "tab"}
              onClick={() => switchPlayMode("offline")}
            >
              Offline
            </button>
            <button
              type="button"
              className={session.playMode === "online" ? "tab active" : "tab"}
              onClick={() => switchPlayMode("online")}
              disabled={!isFirebaseConfigured()}
            >
              Online
            </button>
          </div>
        </section>
      ) : null}
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
          When auto-dismiss is on, alerts fade out after this many seconds (
          {ALERT_AUTO_DISMISS_SEC_MIN}–{ALERT_AUTO_DISMISS_SEC_MAX}). Turn it
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
          Override layout for UI testing. Mobile locks the UI to a Galaxy S24
          frame (360×780 CSS · 1080×2340 @3×), bottom nav, and phone breakpoints,
          scaled to fit your window.
        </p>
      </section>

      <section className="settings-block">
        <h3>Audio</h3>
        <AudioControls
          settings={state.settings}
          dispatch={dispatch}
          variant="settings"
        />
        <p className="muted setting-hint">
          Background music plays while the game is open.
        </p>
      </section>

      {!online ? (
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
            task force shifts finish immediately. Passive income still runs
            normally.
          </p>
          <DevTimeSkip dispatch={dispatch} />
        </section>
      ) : null}

      {!online ? (
        <section className="settings-block">
          <h3>Save</h3>
          <button
            type="button"
            className="btn danger-btn"
            onClick={() =>
              dispatch({
                type: "LOAD",
                state: resetGameState(state.settings, session?.playerId),
              })
            }
          >
            Reset save
          </button>
        </section>
      ) : null}    </div>
  );
}

import { type Dispatch, useState } from "react";
import {
  ALERT_AUTO_DISMISS_SEC_MAX,
  ALERT_AUTO_DISMISS_SEC_MIN,
  clampAlertAutoDismissSec,
  resetGameState,
} from "../game/save";
import { DevTimeSkip } from "./DevTimeSkip";
import { AudioControls } from "./AudioControls";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession, PlayerId } from "../multiplayer/types";
import { PLAYER_IDS, PLAYER_LABELS, isOnlineSession } from "../multiplayer/types";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import { clearSession, writeSession, createSession } from "../multiplayer/session";
import {
  savePrivateState,
  resetOnlineDatabase,
  resetOnlinePlayerAccount,
  resetOnlineSharedWorldPreserveAccounts,
} from "../multiplayer/worldSync";
import { saveGameState } from "../game/save";
interface SettingsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  session?: OnlineSession;
}

type OnlineResetTarget = "world" | "shared-world" | PlayerId;

export function SettingsView({ state, dispatch, session }: SettingsViewProps) {
  const online = session ? isOnlineSession(session) : false;
  const [resettingOnline, setResettingOnline] = useState<OnlineResetTarget | null>(
    null,
  );

  async function switchAccount() {
    if (
      !window.confirm(
        "Return to account picker? Unsaved progress is auto-saved for Online.",
      )
    ) {
      return;
    }
    if (session && isOnlineSession(session)) {
      saveGameState({ ...state, onlineSession: session });
      try {
        await savePrivateState(session, { ...state, onlineSession: session });
      } catch (err) {
        console.error("Failed to flush online save before account switch", err);
      }
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

  async function resetOnline(target: OnlineResetTarget) {
    if (!session || !isOnlineSession(session)) return;
    if (!isFirebaseConfigured()) {
      window.alert("Firebase is not configured.");
      return;
    }

    const confirmed =
      target === "world"
        ? window.confirm(
            `Reset the entire online world (${session.worldId})? This deletes Tim and Chris private saves, map presence, and the shared job board for every client. Fresh postings are reseeded. This cannot be undone.`,
          )
        : target === "shared-world"
          ? window.confirm(
              `Reset shared world state (${session.worldId})? This wipes and reseeds the shared job board and clears active task forces for all players. Tim and Chris company progress (structures, resources, research, branches) is kept.`,
            )
          : window.confirm(
              `Reset ${PLAYER_LABELS[target]}'s online account? This deletes their private company save and map presence. The shared job board is kept. This cannot be undone.`,
            );
    if (!confirmed) return;

    setResettingOnline(target);
    try {
      if (target === "world") {
        await resetOnlineDatabase(session);
      } else if (target === "shared-world") {
        await resetOnlineSharedWorldPreserveAccounts(session);
      } else {
        await resetOnlinePlayerAccount(session, target);
      }

      if (
        target === "world" ||
        target === "shared-world" ||
        target === session.playerId
      ) {
        window.location.reload();
        return;
      }

      window.alert(`${PLAYER_LABELS[target]} online account reset.`);
      setResettingOnline(null);
    } catch (err) {
      console.error("Online reset failed", err);
      window.alert(
        "Online reset failed. Check the console and Firestore connection.",
      );
      setResettingOnline(null);
    }
  }

  const onlineResetBusy = resettingOnline !== null;

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

      {online && session ? (
        <section className="settings-block">
          <h3>Online world</h3>
          <p className="muted setting-hint">
            Dev resets for Firestore world <code>{session.worldId}</code>.
            Account resets clear one player&apos;s save. Shared-world reset
            reseeds the job board only. Full world reset wipes everything.
          </p>
          <div className="settings-online-reset-group">
            <span className="settings-online-reset-label">Reset account</span>
            <div
              className="settings-account-actions"
              role="group"
              aria-label="Reset online account"
            >
              {PLAYER_IDS.map((playerId) => (
                <button
                  key={playerId}
                  type="button"
                  className="btn danger-btn"
                  disabled={
                    onlineResetBusy ||
                    state.onlineConnectionStatus === "connecting"
                  }
                  onClick={() => void resetOnline(playerId)}
                >
                  {resettingOnline === playerId
                    ? "Resetting…"
                    : PLAYER_LABELS[playerId]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-online-reset-group">
            <span className="settings-online-reset-label">Reset world</span>
            <div
              className="settings-account-actions"
              role="group"
              aria-label="Reset online world"
            >
              <button
                type="button"
                className="btn danger-btn"
                disabled={
                  onlineResetBusy ||
                  state.onlineConnectionStatus === "connecting"
                }
                onClick={() => void resetOnline("shared-world")}
              >
                {resettingOnline === "shared-world"
                  ? "Resetting…"
                  : "Shared world only"}
              </button>
              <button
                type="button"
                className="btn danger-btn"
                disabled={
                  onlineResetBusy ||
                  state.onlineConnectionStatus === "connecting"
                }
                onClick={() => void resetOnline("world")}
              >
                {resettingOnline === "world"
                  ? "Resetting…"
                  : "Entire world + accounts"}
              </button>
            </div>
          </div>
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

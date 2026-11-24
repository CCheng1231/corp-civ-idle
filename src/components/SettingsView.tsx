import { type Dispatch, useState } from "react";
import {
  ALERT_AUTO_DISMISS_SEC_MAX,
  ALERT_AUTO_DISMISS_SEC_MIN,
  clampAlertAutoDismissSec,
  resetGameState,
  hasOfflineSaveBackup,
  restoreOfflineSaveFromBackup,
  hasOnlinePrivateCache,
  restoreOfflineFromOnlineCache,
} from "../game/save";
import {
  UI_SCALE_DEFAULT,
  UI_SCALE_MAX,
  UI_SCALE_MIN,
} from "../game/constants";
import { DevTimeSkip } from "./DevTimeSkip";
import { AudioControls } from "./AudioControls";
import type { GameAction, GameState } from "../game/types";
import type { OnlineSession, PlayerId } from "../multiplayer/types";
import {
  PLAYER_IDS,
  PLAYER_LABELS,
  accountDisplayName,
  isDevAccount,
  isOnlineSession,
} from "../multiplayer/types";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import {
  clearSession,
  writeSession,
  createOfflineSession,
  createOnlineSession,
} from "../multiplayer/session";
import { linkGoogleAccount, signOutFirebase } from "../multiplayer/firebaseAuth";
import {
  createPlaytestAccessKey,
  loadBrowserBinding,
  OnlineAccessError,
  readDevAccessKeyHint,
  redeemAccessKey,
} from "../multiplayer/onlineAccess";
import {
  forceResyncPrivateState,
  savePrivateState,
  resetOnlineDatabase,
  resetOnlinePlayerAccount,
  resetOnlineSharedWorldPreserveAccounts,
} from "../multiplayer/worldSync";
import { saveGameState } from "../game/save";
import {
  clearAllOnlineLocalCaches,
  clearOnlineLocalCache,
  saveAuthoritativeOnlineLocalCache,
} from "../multiplayer/companySave";
import { flushPendingOnlineWork } from "../hooks/useOnlineWorld";
import {
  AccessKeyInviteCopyRow,
  AccessKeyInviteDialog,
  type AccessKeyInviteDetails,
} from "./AccessKeyInviteDialog";

const ONLINE_RESET_TIMEOUT_MS = 30_000;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
        ms,
      );
    }),
  ]);
}
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
  const [pullingServerSave, setPullingServerSave] = useState(false);
  const [playtesterName, setPlaytesterName] = useState("");
  const [playtesterEmail, setPlaytesterEmail] = useState("");
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [creatingAccessKey, setCreatingAccessKey] = useState(false);
  const [keyInviteModal, setKeyInviteModal] =
    useState<AccessKeyInviteDetails | null>(null);
  const [lastCreatedInvite, setLastCreatedInvite] =
    useState<AccessKeyInviteDetails | null>(null);

  async function pullServerSave() {
    if (!session || !isOnlineSession(session)) return;
    if (!isFirebaseConfigured()) {
      window.alert("Firebase is not configured.");
      return;
    }
    setPullingServerSave(true);
    try {
      const loaded = await forceResyncPrivateState(session);
      saveAuthoritativeOnlineLocalCache(loaded, session);
      dispatch({ type: "LOAD", state: loaded });
      window.alert("Loaded the latest save from Firestore.");
    } catch (err) {
      console.error("Force resync failed", err);
      window.alert("Could not load the server save. Check the console.");
    } finally {
      setPullingServerSave(false);
    }
  }

  async function switchAccount() {
    if (
      !window.confirm(
        "Return to account picker? Unsaved progress is auto-saved for Online.",
      )
    ) {
      return;
    }
    if (session && isOnlineSession(session)) {
      saveGameState({ ...state, onlineSession: session }, session);
      try {
        await flushPendingOnlineWork(session, state, dispatch);
        await savePrivateState(session, { ...state, onlineSession: session });
      } catch (err) {
        console.error("Failed to flush online save before account switch", err);
      }
    }
    try {
      await signOutFirebase();
    } catch (err) {
      console.error("Firebase sign-out before account switch failed", err);
    }
    clearSession();
    window.location.reload();
  }

  async function linkGoogleForOnlineMigration() {
    setLinkingGoogle(true);
    try {
      await linkGoogleAccount();
      window.alert(
        "Google account linked on this browser. Online progress is unchanged — use Google sign-in at the gate from now on.",
      );
    } catch (err) {
      console.error("Link Google failed", err);
      window.alert(
        err instanceof OnlineAccessError
          ? err.message
          : "Could not link Google account.",
      );
    } finally {
      setLinkingGoogle(false);
    }
  }

  async function switchPlayMode(mode: "offline" | "online") {
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

    if (mode === "online") {
      try {
        let binding = await loadBrowserBinding(session.worldId);
        if (!binding && import.meta.env.DEV && isDevAccount(session.accountId)) {
          const hint = readDevAccessKeyHint(session.accountId);
          if (hint) {
            binding = await redeemAccessKey(hint, session.worldId);
          }
        }
        if (!binding) {
          window.alert(
            "Online mode needs an access key on this browser. Use Switch account and connect with your key (or Use Chris key in dev).",
          );
          return;
        }
        if (binding.accountId !== session.accountId) {
          window.alert(
            `This browser is linked to ${binding.displayName}. Use Switch account to change online identity.`,
          );
          return;
        }
      } catch (err) {
        console.error("Online access check before mode switch failed", err);
        window.alert(
          "Could not verify online access. Check Firebase config, Google sign-in, and Firestore rules.",
        );
        return;
      }
    }

    writeSession(
      mode === "online"
        ? createOnlineSession(session.accountId, session.displayName)
        : createOfflineSession(session.accountId as PlayerId),
    );
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
              `Reset shared world state (${session.worldId})? This wipes and reseeds the shared job board and clears active teams for all players. Tim and Chris company progress (structures, resources, research, branches) is kept.`,
            )
          : window.confirm(
              `Reset ${PLAYER_LABELS[target]}'s online account? This deletes their private company save and map presence. The shared job board is kept. This cannot be undone.`,
            );
    if (!confirmed) return;

    setResettingOnline(target);
    try {
      if (target === "world") {
        clearAllOnlineLocalCaches(session.worldId);
      } else if (target === "shared-world") {
        clearAllOnlineLocalCaches(session.worldId);
      } else {
        clearOnlineLocalCache(target, session.worldId);
      }

      const resetPromise =
        target === "world"
          ? resetOnlineDatabase(session)
          : target === "shared-world"
            ? resetOnlineSharedWorldPreserveAccounts(session)
            : resetOnlinePlayerAccount(session, target);

      await withTimeout(resetPromise, ONLINE_RESET_TIMEOUT_MS, "Online reset");

      if (
        target === "world" ||
        target === "shared-world" ||
        target === session.accountId
      ) {
        window.location.reload();
        return;
      }

      window.alert(
        `${PLAYER_LABELS[target]} online account reset. Close any open ${PLAYER_LABELS[target]} tabs, then switch to that account to verify.`,
      );
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
            Playing as{" "}
            <strong>
              {accountDisplayName(session.accountId, session.displayName)}
            </strong>{" "}
            in{" "}
            <strong>{session.playMode}</strong> mode.
            {isOnlineSession(session) && state.onlineConnectionStatus
              ? ` Firestore: ${state.onlineConnectionStatus}.`
              : null}
          </p>
          {online && import.meta.env.DEV ? (
            <p className="muted setting-hint">
              Migrating from anonymous auth?{" "}
              <button
                type="button"
                className="btn"
                disabled={linkingGoogle}
                onClick={() => void linkGoogleForOnlineMigration()}
              >
                {linkingGoogle ? "Linking…" : "Link Google account"}
              </button>
            </p>
          ) : null}
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
          <span className="setting-row-inline">
            <input
              type="range"
              min={UI_SCALE_MIN}
              max={UI_SCALE_MAX}
              step={0.05}
              value={state.settings.uiScale}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  settings: { uiScale: Number(e.target.value) },
                })
              }
            />
            <span className="setting-value">
              {Math.round(state.settings.uiScale * 100)}%
              {state.settings.uiScale <= UI_SCALE_MIN
                ? " · min"
                : state.settings.uiScale >= UI_SCALE_MAX
                  ? " · max"
                  : state.settings.uiScale === UI_SCALE_DEFAULT
                    ? " · default"
                    : ""}
            </span>
          </span>
        </label>
        <p className="muted setting-hint">
          Layout is designed at 100%. Same control as on the phone — 85% min,
          100% default, 125% max. Match this before comparing Mobile layout
          preview to your phone.
        </p>
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
          frame (360×780 CSS · 1080×2340 @3×), bottom nav, and phone
          breakpoints, scaled to fit your window.
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
            team shifts finish immediately. Passive income still runs
            normally.
          </p>
          <DevTimeSkip dispatch={dispatch} />
          <button
            type="button"
            className="btn dev-skip-btn"
            onClick={() =>
              dispatch({
                type: "DEV_MAX_SECRETARY_PROGRESS",
                secretaryId: state.chiefOfStaffId,
              })
            }
          >
            Max Chief of Staff (level &amp; skills)
          </button>
          <p className="muted setting-hint">
            Sets the current Chief of Staff to max level and maxes both skill
            trees for wardrobe / skin unlock testing.
          </p>
          {state.govProgram ? (
            <>
              <button
                type="button"
                className="btn dev-skip-btn"
                onClick={() => {
                  dispatch({ type: "GOV_RESET_GROWTH_TRACK" });
                  dispatch({ type: "SET_SECRETARY_PANEL", panel: "govProgram" });
                }}
              >
                Reset Govt Prog — Growth step 1
              </button>
              <button
                type="button"
                className="btn dev-skip-btn"
                onClick={() => {
                  dispatch({
                    type: "GOV_RESET_GROWTH_TRACK",
                    stepId: "growth_recruit_push",
                  });
                  dispatch({ type: "SET_VIEW", view: "recruitment" });
                }}
              >
                Reset Govt Prog — Growth step 2
              </button>
              {(
                [
                  ["growth_job", "3 Map contract", "world" as const],
                  ["growth_report", "4 After-action", "secretary" as const],
                  ["growth_research", "5 R&D voucher", "research" as const],
                  ["growth_bm_hint", "6 Branch hint", "research" as const],
                  ["growth_bm_hired", "7 Branch lead", "recruitment" as const],
                ] as const
              ).map(([stepId, label, view]) => (
                <button
                  key={stepId}
                  type="button"
                  className="btn dev-skip-btn"
                  onClick={() => {
                    dispatch({
                      type: "GOV_RESET_GROWTH_TRACK",
                      stepId,
                    });
                    if (view === "secretary") {
                      dispatch({ type: "SET_SECRETARY_PANEL", panel: "job" });
                    } else {
                      dispatch({ type: "SET_VIEW", view });
                    }
                  }}
                >
                  Reset Govt Prog — Growth step {label}
                </button>
              ))}
              <p className="muted setting-hint">
                Replays a growth step (earlier steps marked complete). Economy
                and roster unchanged. Step 1 starts Structure coach; step 2
                starts Recruit qty intro.
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      {online && session && isDevAccount(session.accountId) ? (
        <section className="settings-block">
          <h3>Playtest access keys</h3>
          <p className="muted setting-hint">
            Create an invite for friends or family. Set their Google email so
            only they can redeem the key. They sign in with Google once, then
            paste the key.
          </p>
          <label className="setting-row">
            Playtester name
            <input
              type="text"
              value={playtesterName}
              onChange={(e) => setPlaytesterName(e.target.value)}
              placeholder="e.g. Alice"
            />
          </label>
          <label className="setting-row">
            Google email (required for new invites)
            <input
              type="email"
              value={playtesterEmail}
              onChange={(e) => setPlaytesterEmail(e.target.value)}
              placeholder="alice@gmail.com"
              autoComplete="off"
            />
          </label>
          <div className="settings-account-actions">
            <button
              type="button"
              className="btn primary"
              disabled={
                creatingAccessKey ||
                !playtesterName.trim() ||
                !playtesterEmail.trim()
              }
              onClick={() => {
                void (async () => {
                  setCreatingAccessKey(true);
                  try {
                    const created = await createPlaytestAccessKey(
                      session,
                      playtesterName,
                      playtesterEmail,
                    );
                    setPlaytesterName("");
                    setPlaytesterEmail("");
                    setKeyInviteModal({
                      keyId: created.keyId,
                      displayName: created.displayName,
                      lockedEmail: created.lockedEmail,
                    });
                  } catch (err) {
                    console.error("Create access key failed", err);
                    window.alert(
                      err instanceof Error
                        ? err.message
                        : "Could not create access key.",
                    );
                  } finally {
                    setCreatingAccessKey(false);
                  }
                })();
              }}
            >
              {creatingAccessKey ? "Creating…" : "Create access key"}
            </button>
          </div>
          {lastCreatedInvite ? (
            <AccessKeyInviteCopyRow details={lastCreatedInvite} />
          ) : null}
        </section>
      ) : null}

      {keyInviteModal ? (
        <AccessKeyInviteDialog
          details={keyInviteModal}
          onClose={() => {
            setLastCreatedInvite(keyInviteModal);
            setKeyInviteModal(null);
          }}
        />
      ) : null}

      {online && session ? (
        <section className="settings-block">
          <h3>Online world</h3>
          <p className="muted setting-hint">
            Dev resets for Firestore world <code>{session.worldId}</code>.
            Account resets clear one player&apos;s save. Shared-world reset
            reseeds the job board only. Full world reset wipes everything.
          </p>
          <div className="settings-account-actions">
            <button
              type="button"
              className="btn"
              disabled={
                pullingServerSave ||
                onlineResetBusy ||
                state.onlineConnectionStatus === "connecting"
              }
              onClick={() => void pullServerSave()}
            >
              {pullingServerSave ? "Pulling…" : "Pull server save"}
            </button>
          </div>
          <p className="muted setting-hint">
            Overwrites this tab with Firestore (respects account resets). Use if
            another tab or reset left this session on stale progress.
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
          <p className="muted setting-hint">
            Offline progress lives in this browser only (
            <code>corp-civ-idle-save-v2-{session?.accountId ?? "tim"}</code>
            ). Backups: <code>-backup</code>, <code>-backup-prev</code>.
            Failed loads/quarantined writes: <code>-quarantine-*</code> (see{" "}
            <code>docs/save-integrity.md</code>).
          </p>
          {session && hasOfflineSaveBackup(session) ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const restored = restoreOfflineSaveFromBackup(session);
                if (restored) {
                  dispatch({ type: "LOAD", state: restored });
                } else {
                  window.alert(
                    "Could not read the automatic backup. Check the browser console.",
                  );
                }
              }}
            >
              Restore from automatic backup
            </button>
          ) : null}
          {session &&
          session.accountId &&
          hasOnlinePrivateCache(session.accountId as PlayerId) ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                const restored = restoreOfflineFromOnlineCache(session);
                if (restored) {
                  dispatch({ type: "LOAD", state: restored });
                } else {
                  window.alert(
                    "Could not import from the online browser cache.",
                  );
                }
              }}
            >
              Restore from online browser cache
            </button>
          ) : null}
          <button
            type="button"
            className="btn danger-btn"
            onClick={() =>
              dispatch({
                type: "LOAD",
                state: resetGameState(state.settings, session?.accountId),
              })
            }
          >
            Reset save
          </button>
        </section>
      ) : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  PLAYER_IDS,
  PLAYER_LABELS,
  accountDisplayName,
  type OnlineSession,
  type PlayerId,
  type PlayMode,
} from "../multiplayer/types";
import {
  createOfflineSession,
  createOnlineSession,
  writeSession,
} from "../multiplayer/session";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import {
  loadBrowserBinding,
  OnlineAccessError,
  readDevAccessKeyHint,
  redeemAccessKey,
  type BrowserBinding,
} from "../multiplayer/onlineAccess";

interface AccountGateProps {
  onStart: (session: OnlineSession) => void;
}

type OnlineGatePhase = "idle" | "checking" | "resume" | "key-entry";

export function AccountGate({ onStart }: AccountGateProps) {
  const [playerId, setPlayerId] = useState<PlayerId>("tim");
  const [playMode, setPlayMode] = useState<PlayMode>("offline");
  const [accessKey, setAccessKey] = useState("");
  const [onlinePhase, setOnlinePhase] = useState<OnlineGatePhase>("idle");
  const [boundAccount, setBoundAccount] = useState<BrowserBinding | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (playMode !== "online" || !firebaseReady) {
      setOnlinePhase("idle");
      setBoundAccount(null);
      setOnlineError(null);
      return;
    }

    let cancelled = false;
    setOnlinePhase("checking");
    setOnlineError(null);

    void loadBrowserBinding("dev")
      .then((binding) => {
        if (cancelled) return;
        if (binding) {
          setBoundAccount(binding);
          setOnlinePhase("resume");
        } else {
          setBoundAccount(null);
          setOnlinePhase("key-entry");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setOnlinePhase("key-entry");
        setOnlineError(
          err instanceof OnlineAccessError
            ? err.message
            : "Could not check this browser's online access.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [playMode, firebaseReady]);

  function startOffline() {
    const session = createOfflineSession(playerId);
    writeSession(session);
    onStart(session);
  }

  function startOnlineSession(binding: BrowserBinding) {
    const session = createOnlineSession(binding.accountId, binding.displayName);
    writeSession(session);
    onStart(session);
  }

  async function connectWithAccessKey(keyOverride?: string) {
    if (!firebaseReady) return;
    setConnecting(true);
    setOnlineError(null);
    try {
      const binding = await redeemAccessKey(keyOverride ?? accessKey, "dev");
      setBoundAccount(binding);
      startOnlineSession(binding);
    } catch (err) {
      setOnlineError(
        err instanceof OnlineAccessError
          ? err.message
          : "Could not connect with that access key.",
      );
    } finally {
      setConnecting(false);
    }
  }

  function handleStart() {
    if (playMode === "offline") {
      startOffline();
      return;
    }
    if (!firebaseReady) return;
    if (onlinePhase === "resume" && boundAccount) {
      startOnlineSession(boundAccount);
    }
  }

  async function useDevKeyHint(account: PlayerId) {
    const hint = readDevAccessKeyHint(account);
    if (!hint) {
      setOnlineError(
        `Add VITE_ONLINE_DEV_KEY_${account.toUpperCase()} to .env.local, or paste a key manually.`,
      );
      return;
    }
    setAccessKey(hint);
    await connectWithAccessKey(hint);
  }

  return (
    <div className="account-gate">
      <div className="account-gate-card">
        <header className="account-gate-header">
          <h1>Corp Civ Idle</h1>
          <p className="muted">Choose who you are and how you want to play.</p>
        </header>

        {playMode === "offline" ? (
          <section className="account-gate-section" aria-label="Account">
            <h2>Account</h2>
            <div className="account-gate-options" role="group" aria-label="Player">
              {PLAYER_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={playerId === id ? "tab active" : "tab"}
                  onClick={() => setPlayerId(id)}
                >
                  {PLAYER_LABELS[id]}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="account-gate-section" aria-label="Online access">
            <h2>Online access</h2>
            {onlinePhase === "checking" ? (
              <p className="muted">Checking this browser…</p>
            ) : onlinePhase === "resume" && boundAccount ? (
              <p className="account-gate-resume">
                This browser is linked to{" "}
                <strong>{boundAccount.displayName}</strong>.
              </p>
            ) : (
              <>
                <label className="account-gate-field">
                  <span className="account-gate-field-label">Access key</span>
                  <input
                    type="text"
                    className="account-gate-access-input"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Paste the key from your invite"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
                <p className="muted account-gate-hint">
                  Enter the key your dev sent you. This browser remembers your
                  account afterward — use the same key again on other devices.
                </p>
                {import.meta.env.DEV ? (
                  <div className="account-gate-dev-keys">
                    <span className="muted">Dev shortcuts:</span>
                    {PLAYER_IDS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="btn"
                        disabled={connecting}
                        onClick={() => void useDevKeyHint(id)}
                      >
                        Use {PLAYER_LABELS[id]} key
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>
        )}

        <section className="account-gate-section" aria-label="Play mode">
          <h2>Mode</h2>
          <div className="account-gate-options" role="group" aria-label="Mode">
            <button
              type="button"
              className={playMode === "offline" ? "tab active" : "tab"}
              onClick={() => setPlayMode("offline")}
            >
              Offline
            </button>
            <button
              type="button"
              className={playMode === "online" ? "tab active" : "tab"}
              onClick={() => setPlayMode("online")}
              disabled={!firebaseReady}
            >
              Online
            </button>
          </div>
          <p className="muted account-gate-hint">
            {playMode === "offline"
              ? "Single-player save on this device — separate from Online progress."
              : "Shared job board and map. One browser tab per online account. Requires an access key on first visit."}
          </p>
          {!firebaseReady ? (
            <p className="account-gate-warning" role="alert">
              Online mode needs Firebase config in <code>.env.local</code>{" "}
              (<code>VITE_FIREBASE_*</code>).
            </p>
          ) : null}
          {onlineError ? (
            <p className="account-gate-warning" role="alert">
              {onlineError}
            </p>
          ) : null}
        </section>

        {playMode === "online" && onlinePhase === "key-entry" ? (
          <button
            type="button"
            className="btn primary account-gate-start"
            disabled={!firebaseReady || connecting || accessKey.trim().length === 0}
            onClick={() => void connectWithAccessKey()}
          >
            {connecting ? "Connecting…" : "Connect with access key"}
          </button>
        ) : (
          <button
            type="button"
            className="btn primary account-gate-start"
            onClick={handleStart}
            disabled={
              playMode === "online" &&
              (!firebaseReady ||
                connecting ||
                onlinePhase === "checking" ||
                (onlinePhase === "key-entry" && !accessKey.trim()))
            }
          >
            {playMode === "online" && onlinePhase === "resume"
              ? `Continue as ${accountDisplayName(boundAccount?.accountId ?? "", boundAccount?.displayName)}`
              : "Start game"}
          </button>
        )}
      </div>
    </div>
  );
}

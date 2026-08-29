import { useState } from "react";
import {
  PLAYER_IDS,
  PLAYER_LABELS,
  type OnlineSession,
  type PlayerId,
  type PlayMode,
} from "../multiplayer/types";
import { createSession, writeSession } from "../multiplayer/session";
import { isFirebaseConfigured } from "../multiplayer/firebase";

interface AccountGateProps {
  onStart: (session: OnlineSession) => void;
}

export function AccountGate({ onStart }: AccountGateProps) {
  const [playerId, setPlayerId] = useState<PlayerId>("tim");
  const [playMode, setPlayMode] = useState<PlayMode>("offline");
  const firebaseReady = isFirebaseConfigured();

  function handleStart() {
    if (playMode === "online" && !firebaseReady) return;
    const session = createSession(playerId, playMode);
    writeSession(session);
    onStart(session);
  }

  return (
    <div className="account-gate">
      <div className="account-gate-card">
        <header className="account-gate-header">
          <h1>Corp Civ Idle</h1>
          <p className="muted">Choose who you are and how you want to play.</p>
        </header>

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
              : "Shared job board and map with the other dev. Your company economy stays private."}
          </p>
          {!firebaseReady ? (
            <p className="account-gate-warning" role="alert">
              Online mode needs Firebase config in <code>.env.local</code>{" "}
              (<code>VITE_FIREBASE_*</code>).
            </p>
          ) : null}
        </section>

        <button
          type="button"
          className="btn primary account-gate-start"
          onClick={handleStart}
          disabled={playMode === "online" && !firebaseReady}
        >
          Start game
        </button>
      </div>
    </div>
  );
}

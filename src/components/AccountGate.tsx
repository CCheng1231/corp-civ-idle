import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
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
import { getFirebaseAuth, isFirebaseConfigured } from "../multiplayer/firebase";
import {
  clearPendingGoogleOnlineRedirect,
  ensureGoogleRedirectHandled,
  getLastGoogleRedirectError,
  isGoogleSignedIn,
  isPendingGoogleOnlineRedirect,
  markPendingGoogleOnlineRedirect,
  signInWithGoogleRedirect,
  subscribeAuthState,
} from "../multiplayer/firebaseAuth";
import {
  buildEmbeddedBrowserAuthMessage,
  buildOAuthMisconfigMessage,
} from "../multiplayer/onlineAuthDiagnostics";
import {
  clickMountedGoogleSignInButton,
  consumePendingGisCredential,
  googleGisRedirectDevAvailable,
  googleIdentitySignInConfigured,
  mountGoogleSignInButton,
  mountGoogleSignInRedirectButton,
} from "../multiplayer/googleIdentitySignIn";
import {
  embeddedOAuthHostileBrowser,
  prefersGoogleSignInRedirect,
} from "../multiplayer/googleSignInEnvironment";
import {
  loadBrowserBinding,
  OnlineAccessError,
  readDevAccessKeyHint,
  redeemAccessKey,
  type BrowserBinding,
} from "../multiplayer/onlineAccess";
import signInHero from "../assets/sign-in/sign-in-title-bid-rise.jpg";

interface AccountGateProps {
  onStart: (session: OnlineSession) => void;
}

type GateView = "title" | "online";

type OnlineGatePhase =
  | "checking-auth"
  | "need-google"
  | "checking-binding"
  | "resume"
  | "key-entry";

function resolveGoogleGateUser(
  authUser: User | null,
  firebaseReady: boolean,
): User | null {
  if (authUser && isGoogleSignedIn(authUser)) return authUser;
  if (!firebaseReady) return null;
  try {
    const current = getFirebaseAuth().currentUser;
    if (current && isGoogleSignedIn(current)) return current;
  } catch {
    return null;
  }
  return null;
}

export function AccountGate({ onStart }: AccountGateProps) {
  const [gateView, setGateView] = useState<GateView>(() =>
    isPendingGoogleOnlineRedirect() ? "online" : "title",
  );
  const [playMode, setPlayMode] = useState<PlayMode>(() =>
    isPendingGoogleOnlineRedirect() ? "online" : "offline",
  );
  const useGoogleRedirect = prefersGoogleSignInRedirect();
  const embeddedPreview = embeddedOAuthHostileBrowser();
  const useGisRedirectInPreview =
    embeddedPreview && googleGisRedirectDevAvailable();
  const externalPlayUrl =
    typeof window !== "undefined" ? window.location.href : "";

  function redirectFailureMessage(): string {
    if (embeddedPreview) {
      return buildEmbeddedBrowserAuthMessage(externalPlayUrl);
    }
    return getLastGoogleRedirectError() ?? buildOAuthMisconfigMessage();
  }
  const [accessKey, setAccessKey] = useState("");
  const [onlinePhase, setOnlinePhase] = useState<OnlineGatePhase>("checking-auth");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [boundAccount, setBoundAccount] = useState<BrowserBinding | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [titleGoogleBusy, setTitleGoogleBusy] = useState(false);
  const [titleGoogleReady, setTitleGoogleReady] = useState(false);
  const googleSignInMountRef = useRef<HTMLDivElement | null>(null);
  const googleTitleSignInRef = useRef<HTMLDivElement | null>(null);
  const firebaseReady = isFirebaseConfigured();
  const googleButtonConfigured = googleIdentitySignInConfigured();

  const progressAfterGoogleUser = useCallback(
    async (user: User, setErr: (msg: string | null) => void) => {
      setConnecting(true);
      setOnlineError(null);
      try {
        setAuthUser(user);
        clearPendingGoogleOnlineRedirect();
        setOnlinePhase("checking-binding");
        const binding = await loadBrowserBinding("dev", user);
        if (binding) {
          setBoundAccount(binding);
          setOnlinePhase("resume");
        } else {
          setBoundAccount(null);
          setOnlinePhase("key-entry");
        }
      } catch (err) {
        setErr(
          err instanceof OnlineAccessError
            ? err.message
            : "Could not load online access after sign-in.",
        );
        setOnlinePhase("need-google");
      } finally {
        setConnecting(false);
      }
    },
    [],
  );

  function startOfflineSolo() {
    const session = createOfflineSession("tim");
    writeSession(session);
    onStart(session);
  }

  async function beginGoogleSignInRedirect() {
    if (!firebaseReady) return;
    setOnlineError(null);
    setTitleGoogleBusy(true);
    setPlayMode("online");
    setGateView("online");
    try {
      await signInWithGoogleRedirect();
    } catch (err) {
      setTitleGoogleBusy(false);
      setOnlineError(
        err instanceof OnlineAccessError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not start Google sign-in.",
      );
    }
  }

  useEffect(() => {
    if (!firebaseReady) return;
    if (!isPendingGoogleOnlineRedirect()) return;
    setGateView("online");
    setPlayMode("online");
  }, [firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) return;
    void consumePendingGisCredential(
      (user) => onGoogleSignedInRef.current(user),
      (message) => setOnlineError(message),
    );
  }, [firebaseReady]);

  function startOnlineSession(binding: BrowserBinding) {
    const session = createOnlineSession(binding.accountId, binding.displayName);
    writeSession(session);
    onStart(session);
  }

  useEffect(() => {
    if (gateView !== "online" || playMode !== "online" || !firebaseReady) {
      if (gateView !== "online") {
        setOnlinePhase("checking-auth");
        setAuthUser(null);
        setBoundAccount(null);
      }
      return;
    }

    let cancelled = false;
    setOnlineError(null);
    const expectingRedirectOnMount = isPendingGoogleOnlineRedirect();
    setOnlinePhase(expectingRedirectOnMount ? "checking-auth" : "need-google");

    const unsub = subscribeAuthState((user) => {
      if (cancelled) return;
      setAuthUser(user);
    });

    void (async () => {
      const expectingRedirect = isPendingGoogleOnlineRedirect();
      let user: User | null = null;
      try {
        user = (await ensureGoogleRedirectHandled()) ?? null;
      } catch (err) {
        console.error("Google auth bootstrap failed", err);
        if (!cancelled) {
          setOnlinePhase("need-google");
          setOnlineError("Could not initialize Google sign-in.");
        }
        return;
      }
      if (!user || (!isGoogleSignedIn(user) && user.isAnonymous)) {
        const allowAnonymous =
          import.meta.env.DEV &&
          import.meta.env.VITE_ONLINE_ALLOW_ANONYMOUS === "true";
        if (!user || (!allowAnonymous && !isGoogleSignedIn(user))) {
          if (!cancelled) {
            setOnlinePhase("need-google");
            setBoundAccount(null);
            if (expectingRedirect && !user) {
              setOnlineError(redirectFailureMessage());
            }
          }
          return;
        }
      }

      if (!cancelled) {
        clearPendingGoogleOnlineRedirect();
        setAuthUser(user);
        setGateView("online");
        setPlayMode("online");
      }

      if (!cancelled) setOnlinePhase("checking-binding");
      try {
        const binding = await loadBrowserBinding("dev", user);
        if (cancelled) return;
        if (binding) {
          setBoundAccount(binding);
          setOnlinePhase("resume");
        } else {
          setBoundAccount(null);
          setOnlinePhase("key-entry");
        }
      } catch (err) {
        if (cancelled) return;
        setBoundAccount(null);
        setOnlinePhase("need-google");
        setOnlineError(
          err instanceof OnlineAccessError
            ? err.message
            : "Could not check online access.",
        );
      }
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [gateView, playMode, firebaseReady]);

  useEffect(() => {
    if (gateView !== "online" || playMode !== "online" || !firebaseReady) return;
    if (!authUser || !isGoogleSignedIn(authUser)) return;
    if (onlinePhase !== "need-google" && onlinePhase !== "checking-auth") return;

    let cancelled = false;
    void (async () => {
      clearPendingGoogleOnlineRedirect();
      setOnlinePhase("checking-binding");
      try {
        const binding = await loadBrowserBinding("dev", authUser);
        if (cancelled) return;
        if (binding) {
          setBoundAccount(binding);
          setOnlinePhase("resume");
        } else {
          setBoundAccount(null);
          setOnlinePhase("key-entry");
        }
      } catch (err) {
        if (cancelled) return;
        setOnlinePhase("need-google");
        setOnlineError(
          err instanceof OnlineAccessError
            ? err.message
            : "Could not load online access after sign-in.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gateView, playMode, firebaseReady, authUser, onlinePhase]);

  const onGoogleSignedIn = useCallback(
    (user: User) => {
      setPlayMode("online");
      setGateView("online");
      void progressAfterGoogleUser(user, setOnlineError);
    },
    [progressAfterGoogleUser],
  );

  const onGoogleSignedInRef = useRef(onGoogleSignedIn);
  onGoogleSignedInRef.current = onGoogleSignedIn;

  useEffect(() => {
    if (useGoogleRedirect) return;
    if (gateView !== "title" || !firebaseReady || !googleButtonConfigured) return;
    const el = googleTitleSignInRef.current;
    if (!el) return;

    let cancelled = false;
    setTitleGoogleReady(false);
    const mount = useGisRedirectInPreview
      ? mountGoogleSignInRedirectButton
      : mountGoogleSignInButton;
    void mount(
      el,
      (user) => {
        setTitleGoogleBusy(false);
        onGoogleSignedInRef.current(user);
      },
      (message) => {
        setTitleGoogleBusy(false);
        setOnlineError(message);
      },
      { width: 240, size: "large" },
    ).then(() => {
      if (!cancelled) setTitleGoogleReady(true);
    });

    return () => {
      cancelled = true;
      setTitleGoogleReady(false);
    };
  }, [
    gateView,
    firebaseReady,
    googleButtonConfigured,
    onGoogleSignedIn,
    useGoogleRedirect,
    useGisRedirectInPreview,
  ]);

  useEffect(() => {
    if (!titleGoogleBusy || connecting) return;
    const clearBusy = () => {
      window.setTimeout(() => {
        setTitleGoogleBusy((busy) => (busy && !connecting ? false : busy));
      }, 500);
    };
    window.addEventListener("focus", clearBusy);
    return () => window.removeEventListener("focus", clearBusy);
  }, [titleGoogleBusy, connecting]);

  useEffect(() => {
    if (gateView !== "online" || playMode !== "online" || !firebaseReady) return;
    const googleUser = resolveGoogleGateUser(authUser, firebaseReady);
    const showGoogleButton =
      onlinePhase === "need-google" ||
      (onlinePhase === "key-entry" && !googleUser);
    if (!showGoogleButton) return;
    const el = googleSignInMountRef.current;
    if (!el) return;

    void mountGoogleSignInButton(
      el,
      (user) => {
        onGoogleSignedInRef.current(user);
      },
      (message) => {
        setOnlineError(message);
      },
    );

    return () => {};
  }, [
    gateView,
    playMode,
    onlinePhase,
    firebaseReady,
    googleButtonConfigured,
    onGoogleSignedIn,
    authUser,
  ]);

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

  async function useDevKeyHint(account: PlayerId) {
    if (!authUser || !isGoogleSignedIn(authUser)) {
      setOnlineError("Sign in with Google first.");
      return;
    }
    const hint = readDevAccessKeyHint(account);
    if (!hint) {
      setOnlineError(
        `Add VITE_ONLINE_DEV_KEY_${account.toUpperCase()} to .env.local.`,
      );
      return;
    }
    setAccessKey(hint);
    await connectWithAccessKey(hint);
  }

  const googleGateUser = resolveGoogleGateUser(authUser, firebaseReady);
  const canConnectWithKey =
    Boolean(googleGateUser) && accessKey.trim().length > 0 && !connecting;

  const showOnlinePanel = gateView === "online" && playMode === "online";

  return (
    <div className="account-gate">
      <div className="account-gate-card account-gate-card--title">
        <img
          className="account-gate-hero"
          src={signInHero}
          alt=""
          width={960}
          height={540}
          decoding="async"
        />
        <h1 className="account-gate-title">Corp Civ Idle</h1>

        {gateView === "title" ? (
          <div className="account-gate-title-actions" role="group" aria-label="Play">
            <button
              type="button"
              className="btn account-gate-title-btn"
              onClick={startOfflineSolo}
            >
              Play solo
            </button>
            {firebaseReady && (googleButtonConfigured || useGoogleRedirect) ? (
              <>
                <button
                  type="button"
                  className="btn account-gate-title-btn"
                  disabled={
                    useGoogleRedirect
                      ? titleGoogleBusy || connecting
                      : !titleGoogleReady || titleGoogleBusy || connecting
                  }
                  onClick={() => {
                    if (useGoogleRedirect) {
                      void beginGoogleSignInRedirect();
                      return;
                    }
                    setOnlineError(null);
                    setTitleGoogleBusy(true);
                    if (useGisRedirectInPreview) {
                      markPendingGoogleOnlineRedirect();
                    }
                    const opened = clickMountedGoogleSignInButton(
                      googleTitleSignInRef.current,
                    );
                    if (!opened) setTitleGoogleBusy(false);
                  }}
                >
                  {titleGoogleBusy || connecting
                    ? "Signing in…"
                    : "Sign in with Google"}
                </button>
                {!useGoogleRedirect ? (
                  <div
                    ref={googleTitleSignInRef}
                    className="account-gate-google-gsi account-gate-google-gsi--proxy"
                    aria-hidden="true"
                  />
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className="btn account-gate-title-btn"
                disabled
              >
                Sign in with Google
              </button>
            )}
          </div>
        ) : null}

        {showOnlinePanel ? (
          <div className="account-gate-online" aria-live="polite">
            {onlinePhase === "checking-auth" ||
            onlinePhase === "checking-binding" ? (
              <div className="account-gate-online-busy" aria-busy="true" />
            ) : null}

            {onlinePhase === "need-google" ? (
              <>
                <div
                  ref={googleSignInMountRef}
                  className="account-gate-google-gsi"
                  aria-label="Sign in with Google"
                />
                {!googleButtonConfigured ? (
                  <p className="account-gate-warning" role="alert">
                    Set VITE_GOOGLE_OAUTH_CLIENT_ID in .env.local and restart
                    dev.
                  </p>
                ) : null}
              </>
            ) : null}

            {onlinePhase === "resume" && boundAccount ? (
              <button
                type="button"
                className="btn primary account-gate-title-btn"
                disabled={connecting}
                onClick={() => startOnlineSession(boundAccount)}
              >
                Continue as{" "}
                {accountDisplayName(
                  boundAccount.accountId,
                  boundAccount.displayName,
                )}
              </button>
            ) : null}

            {onlinePhase === "key-entry" ? (
              <>
                {!googleGateUser ? (
                  <div
                    ref={googleSignInMountRef}
                    className="account-gate-google-gsi"
                    aria-label="Sign in with Google"
                  />
                ) : null}
                <input
                  type="text"
                  className="account-gate-access-input"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Access key"
                  aria-label="Access key"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canConnectWithKey) {
                      void connectWithAccessKey();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn primary account-gate-title-btn"
                  disabled={!canConnectWithKey}
                  onClick={() => void connectWithAccessKey()}
                >
                  {connecting ? "Connecting…" : "Enter game"}
                </button>
                {import.meta.env.DEV ? (
                  <div className="account-gate-dev-keys">
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
            ) : null}

            <button
              type="button"
              className="btn account-gate-back"
              onClick={() => {
                setGateView("title");
                setPlayMode("offline");
                setOnlineError(null);
              }}
            >
              Back
            </button>
          </div>
        ) : null}

        {onlineError ? (
          <p className="account-gate-warning" role="alert">
            {onlineError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
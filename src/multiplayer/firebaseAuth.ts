import {
  GoogleAuthProvider,
  getRedirectResult,
  linkWithPopup,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import {
  buildOAuthMisconfigMessage,
  logRedirectDiagnostics,
} from "./onlineAuthDiagnostics";
import { OnlineAccessError } from "./onlineAccessError";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const PENDING_GOOGLE_ONLINE_KEY = "corp-civ-idle-pending-google-online";

/** Set before signInWithRedirect so the account gate re-opens in Online mode. */
export function markPendingGoogleOnlineRedirect(): void {
  sessionStorage.setItem(PENDING_GOOGLE_ONLINE_KEY, "1");
}

export function isPendingGoogleOnlineRedirect(): boolean {
  return sessionStorage.getItem(PENDING_GOOGLE_ONLINE_KEY) === "1";
}

export function clearPendingGoogleOnlineRedirect(): void {
  sessionStorage.removeItem(PENDING_GOOGLE_ONLINE_KEY);
}

function firebaseAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? "";
  const message = err instanceof Error ? err.message : String(err);

  if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
    return (
      "Google sign-in popup could not finish (blank popup or closed window). " +
      "Use “Sign in with Google (full page)” below, or in Google Cloud Console add " +
      "this site to your OAuth Web client → Authorized JavaScript origins " +
      "(e.g. http://localhost:5173)."
    );
  }
  if (code === "auth/unauthorized-domain") {
    return (
      "This site is not authorized in Firebase. Add its domain under " +
      "Authentication → Settings → Authorized domains."
    );
  }
  if (code === "auth/cancelled-popup-request") {
    return "Google sign-in is already in progress.";
  }
  if (code) {
    return `Google sign-in failed (${code}). ${message}`;
  }
  return message || "Google sign-in failed.";
}

let redirectHandled: Promise<User | null> | null = null;

let lastGoogleRedirectError: string | null = null;

export function getLastGoogleRedirectError(): string | null {
  return lastGoogleRedirectError;
}

function recordGoogleRedirectError(err: unknown): void {
  const code = (err as { code?: string }).code;
  const message = err instanceof Error ? err.message : String(err);
  lastGoogleRedirectError = code ? `${code}: ${message}` : message;
  console.error("getRedirectResult failed", err);
}

async function resolveGoogleRedirectUser(): Promise<User | null> {
  lastGoogleRedirectError = null;
  const auth = getFirebaseAuth();
  const expectingRedirect = isPendingGoogleOnlineRedirect();
  try {
    if (
      "authStateReady" in auth &&
      typeof (auth as { authStateReady?: () => Promise<void> }).authStateReady ===
        "function"
    ) {
      await (auth as { authStateReady: () => Promise<void> }).authStateReady();
    }
    const result = await getRedirectResult(auth);
    if (result?.user) {
      clearPendingGoogleOnlineRedirect();
      return result.user;
    }
    if (expectingRedirect) {
      logRedirectDiagnostics("getRedirectResult returned no user after redirect");
    }
  } catch (err) {
    recordGoogleRedirectError(err);
  }

  if (auth.currentUser) {
    clearPendingGoogleOnlineRedirect();
    return auth.currentUser;
  }

  if (expectingRedirect) {
    const user = await waitForInitialAuth({
      allowNull: false,
      timeoutMs: 15_000,
    });
    clearPendingGoogleOnlineRedirect();
    if (!user) {
      lastGoogleRedirectError = buildOAuthMisconfigMessage();
      logRedirectDiagnostics("no Firebase user 15s after redirect");
    }
    return user;
  }

  return waitForInitialAuth({ allowNull: true, timeoutMs: 5_000 });
}

/**
 * getRedirectResult() is one-shot per redirect. Call exactly once per page load
 * (React Strict Mode must not call it twice).
 */
export function ensureGoogleRedirectHandled(): Promise<User | null> {
  if (!redirectHandled) {
    redirectHandled = resolveGoogleRedirectUser();
  }
  return redirectHandled;
}

/** @deprecated Use ensureGoogleRedirectHandled */
export async function bootstrapGoogleAuth(): Promise<User | null> {
  return ensureGoogleRedirectHandled();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isGoogleSignedIn(user: User): boolean {
  if (user.isAnonymous) return false;
  if (user.providerData.some((p) => p.providerId === "google.com")) {
    return true;
  }
  return Boolean(user.email);
}

/** Wait for Firebase auth to hydrate (IndexedDB / redirect). */
export function waitForInitialAuth(options?: {
  allowNull?: boolean;
  timeoutMs?: number;
}): Promise<User | null> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  const allowNull = options?.allowNull ?? true;
  const timeoutMs =
    options?.timeoutMs ?? (allowNull ? 5_000 : 0);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (user: User | null) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(user);
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        finish(user);
      } else if (allowNull) {
        finish(null);
      }
    });

    if (timeoutMs > 0) {
      window.setTimeout(() => finish(auth.currentUser), timeoutMs);
    }
  });
}

export function subscribeAuthState(
  onUser: (user: User | null) => void,
): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, onUser);
}

/** Call once on startup when redirect sign-in is enabled (mobile / popup blocked). */
export async function consumeGoogleRedirectResult(): Promise<User | null> {
  return ensureGoogleRedirectHandled();
}

export async function signInWithGoogle(options?: {
  useRedirect?: boolean;
}): Promise<User> {
  const auth = getFirebaseAuth();
  try {
    if (options?.useRedirect) {
      await signInWithRedirect(auth, googleProvider);
      throw new OnlineAccessError("Redirecting to Google sign-in…");
    }
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (err) {
    if (err instanceof OnlineAccessError) throw err;
    throw new OnlineAccessError(firebaseAuthErrorMessage(err));
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  markPendingGoogleOnlineRedirect();
  const auth = getFirebaseAuth();
  await signInWithRedirect(auth, googleProvider);
}

/** Preserve Firebase uid when upgrading anonymous → Google on the same browser. */
export async function linkGoogleAccount(): Promise<User> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new OnlineAccessError("Sign in before linking a Google account.");
  }
  if (isGoogleSignedIn(user)) {
    return user;
  }
  if (!user.isAnonymous) {
    throw new OnlineAccessError("This account cannot be linked to Google.");
  }
  const cred = await linkWithPopup(user, googleProvider);
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/**
 * Online mode requires a Google account (Option 1B — email-locked keys).
 * Dev builds may set VITE_ONLINE_ALLOW_ANONYMOUS=true for legacy testing.
 */
export async function requireOnlineUser(): Promise<User> {
  await ensureGoogleRedirectHandled();
  const auth = getFirebaseAuth();
  let user = auth.currentUser;
  if (!user) {
    user = await waitForInitialAuth({ allowNull: true });
  }
  if (!user) {
    throw new OnlineAccessError("Sign in with Google to play Online.");
  }
  const allowAnonymous =
    import.meta.env.DEV &&
    import.meta.env.VITE_ONLINE_ALLOW_ANONYMOUS === "true";
  if (user.isAnonymous && !allowAnonymous) {
    throw new OnlineAccessError("Sign in with Google to play Online.");
  }
  return user;
}

export function requireUserEmail(user: User): string {
  const email = user.email?.trim();
  if (!email) {
    throw new OnlineAccessError(
      "Your Google account has no email on file. Use another account.",
    );
  }
  return normalizeEmail(email);
}
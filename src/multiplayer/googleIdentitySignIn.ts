import { GoogleAuthProvider, signInWithCredential, type User } from "firebase/auth";
import { clearPendingGoogleOnlineRedirect } from "./firebaseAuth";
import { getFirebaseAuth } from "./firebase";

/** Set by Vite dev middleware after GIS redirect UX (Cursor / embedded browsers). */
export const PENDING_GIS_CREDENTIAL_SESSION_KEY =
  "corp-civ-idle-pending-gis-credential";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback?: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void;
        };
      };
    };
  }
}

export function readGoogleOAuthClientId(): string | null {
  const id = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim();
  return id && id.length > 0 ? id : null;
}

let gsiLoad: Promise<void> | null = null;
let initializedForClientId: string | null = null;
let initializedUxMode: "popup" | "redirect" | null = null;

export function googleGisRedirectCallbackPath(): string {
  return "/auth/google/callback";
}

export function googleGisRedirectLoginUri(): string {
  return `${window.location.origin}${googleGisRedirectCallbackPath()}`;
}

/** GIS redirect POST handler exists on the Vite dev server only (see vite.plugins). */
export function googleGisRedirectDevAvailable(): boolean {
  return import.meta.env.DEV;
}

type GsiHandlers = {
  onSignedIn: (user: User) => void;
  onError: (message: string) => void;
};

let gsiHandlers: GsiHandlers = {
  onSignedIn: () => {},
  onError: () => {},
};

async function handleGsiCredentialResponse(response: {
  credential?: string;
}): Promise<void> {
  if (!response.credential) {
    gsiHandlers.onError("Google sign-in did not return credentials.");
    return;
  }
  try {
    const auth = getFirebaseAuth();
    const cred = GoogleAuthProvider.credential(response.credential);
    const result = await signInWithCredential(auth, cred);
    clearPendingGoogleOnlineRedirect();
    gsiHandlers.onSignedIn(result.user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message = err instanceof Error ? err.message : String(err);
    gsiHandlers.onError(
      code
        ? `Firebase sign-in failed (${code}): ${message}`
        : message || "Firebase sign-in failed.",
    );
  }
}

function loadGoogleGsiScript(): Promise<void> {
  if (gsiLoad) return gsiLoad;
  gsiLoad = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Sign-In."));
    document.head.appendChild(script);
  });
  return gsiLoad;
}

/**
 * Google Identity Services button → Firebase via ID token (no redirect handler).
 * Works reliably on localhost when signInWithRedirect / getRedirectResult fails.
 */
export async function mountGoogleSignInButton(
  container: HTMLElement,
  onSignedIn: (user: User) => void,
  onError: (message: string) => void,
  options?: { width?: number; size?: "large" | "medium" | "small" },
): Promise<void> {
  const clientId = readGoogleOAuthClientId();
  if (!clientId) {
    onError(
      "Set VITE_GOOGLE_OAUTH_CLIENT_ID in .env.local to the Web client ID from Firebase → Authentication → Google.",
    );
    return;
  }

  try {
    await loadGoogleGsiScript();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Could not load Google Sign-In.");
    return;
  }

  const gsi = window.google?.accounts?.id;
  if (!gsi) {
    onError("Google Sign-In is unavailable in this browser.");
    return;
  }

  gsiHandlers = { onSignedIn, onError };

  if (
    initializedForClientId !== clientId ||
    initializedUxMode !== "popup"
  ) {
    gsi.initialize({
      client_id: clientId,
      callback: (response) => {
        void handleGsiCredentialResponse(response);
      },
      ux_mode: "popup",
    });
    initializedForClientId = clientId;
    initializedUxMode = "popup";
  }

  container.replaceChildren();
  const width =
    options?.width ??
    Math.max(240, Math.min(container.clientWidth || 320, 400));
  gsi.renderButton(container, {
    theme: "outline",
    size: options?.size ?? "large",
    text: "signin_with",
    shape: "rectangular",
    width,
  });
}

/**
 * Full-page GIS redirect → dev POST callback → Firebase credential.
 * Works in Cursor's preview when popup / Firebase redirect do not.
 */
export async function mountGoogleSignInRedirectButton(
  container: HTMLElement,
  onSignedIn: (user: User) => void,
  onError: (message: string) => void,
  options?: { width?: number; size?: "large" | "medium" | "small" },
): Promise<void> {
  if (!googleGisRedirectDevAvailable()) {
    onError("GIS redirect sign-in is only available on the Vite dev server.");
    return;
  }

  const clientId = readGoogleOAuthClientId();
  if (!clientId) {
    onError(
      "Set VITE_GOOGLE_OAUTH_CLIENT_ID in .env.local to the Web client ID from Firebase → Authentication → Google.",
    );
    return;
  }

  try {
    await loadGoogleGsiScript();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Could not load Google Sign-In.");
    return;
  }

  const gsi = window.google?.accounts?.id;
  if (!gsi) {
    onError("Google Sign-In is unavailable in this browser.");
    return;
  }

  const loginUri = googleGisRedirectLoginUri();
  gsiHandlers = { onSignedIn, onError };

  if (
    initializedForClientId !== clientId ||
    initializedUxMode !== "redirect"
  ) {
    gsi.initialize({
      client_id: clientId,
      ux_mode: "redirect",
      login_uri: loginUri,
    });
    initializedForClientId = clientId;
    initializedUxMode = "redirect";
  }

  container.replaceChildren();
  const width =
    options?.width ??
    Math.max(240, Math.min(container.clientWidth || 320, 400));
  gsi.renderButton(container, {
    theme: "outline",
    size: options?.size ?? "large",
    text: "signin_with",
    shape: "rectangular",
    width,
  });
}

/** After GIS redirect round-trip, credential is in sessionStorage (dev middleware). */
export async function consumePendingGisCredential(
  onSignedIn: (user: User) => void,
  onError: (message: string) => void,
): Promise<boolean> {
  const raw = sessionStorage.getItem(PENDING_GIS_CREDENTIAL_SESSION_KEY);
  if (!raw) return false;
  sessionStorage.removeItem(PENDING_GIS_CREDENTIAL_SESSION_KEY);
  gsiHandlers = { onSignedIn, onError };
  try {
    const parsed = JSON.parse(raw) as { credential?: string };
    await handleGsiCredentialResponse(parsed);
    return true;
  } catch {
    onError("Could not read Google sign-in response.");
    return false;
  }
}

/** Opens the GIS account picker for a container already mounted via mountGoogleSignInButton. */
export function clickMountedGoogleSignInButton(container: HTMLElement | null): boolean {
  if (!container) return false;
  const inner = container.querySelector<HTMLElement>('[role="button"]');
  if (!inner) return false;
  inner.click();
  return true;
}

export function googleIdentitySignInConfigured(): boolean {
  return readGoogleOAuthClientId() !== null;
}
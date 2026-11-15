import { readFirebaseConfig } from "./firebase";

/** When redirect/popup cannot persist Firebase session (Cursor preview, etc.). */
export function buildEmbeddedBrowserAuthMessage(origin?: string): string {
  const url =
    origin ?? (typeof window !== "undefined" ? window.location.href : "");
  const callback =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/google/callback`
      : "http://localhost:5173/auth/google/callback";
  return [
    "Google sign-in did not reach Firebase in this preview browser.",
    "",
    import.meta.env.DEV
      ? `In dev, add this Authorized redirect URI on your OAuth Web client:\n${callback}`
      : "Use Chrome or Edge at the same URL for online play.",
    "",
    url ? `Or open: ${url}` : "",
    "",
    "Turn off VITE_GOOGLE_SIGNIN_REDIRECT in .env.local (use GIS redirect in Cursor dev, not Firebase redirect).",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Actionable OAuth checklist when redirect returns but Firebase has no user. */
export function buildOAuthMisconfigMessage(): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const cfg = readFirebaseConfig();
  const projectId = cfg?.projectId ?? "YOUR_PROJECT_ID";
  const authDomain = cfg?.authDomain ?? `${projectId}.firebaseapp.com`;
  const handler = `https://${authDomain}/__/auth/handler`;

  return [
    "Google signed you in, but Firebase did not get a session (getRedirectResult was empty).",
    "",
    `Your app URL right now: ${origin}`,
    "",
    "In Google Cloud (same project as Firebase) → APIs & Services → Credentials:",
    "",
    "1) OAuth 2.0 Client ID → Web client",
    `   • Authorized JavaScript origins: ${origin}`,
    "   (Also add http://127.0.0.1:5173 if you use 127.0.0.1 instead of localhost.)",
    `   • Authorized redirect URIs: ${handler}`,
    "",
    "2) API Keys → Browser key (auto created by Google Service)",
    "   • If “HTTP referrers” is enabled, add ALL of:",
    `     ${origin}/*`,
    "     http://localhost:5173/*",
    "     http://127.0.0.1:5173/*",
    `     https://${authDomain}/*`,
    `     https://${projectId}.web.app/*`,
    "   • Or set Application restrictions to None for local dev.",
    "",
    "4) Firebase Console → Authentication → Sign-in method → Google",
    "   • Note the “Web client ID” — edit THAT OAuth client in step 1 (not a random other client).",
    "",
    "5) Google Cloud → APIs & Services → Enabled APIs",
    "   • Ensure “Identity Toolkit API” is enabled for this project.",
    "",
    "3) Firebase Console → Authentication → Settings → Authorized domains",
    "   • localhost (and your deploy host if not local).",
    "",
    "Save, wait one minute, hard refresh, try full-page sign-in again.",
    "Use a normal browser window (not strict private mode — redirect needs storage).",
  ].join("\n");
}

export function logRedirectDiagnostics(context: string): void {
  const cfg = readFirebaseConfig();
  console.warn(`[online-auth] ${context}`, {
    origin: window.location.origin,
    href: window.location.href,
    authDomain: cfg?.authDomain,
    projectId: cfg?.projectId,
  });
}
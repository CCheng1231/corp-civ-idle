/**
 * Cursor / VS Code preview, Electron shells, and iframes often break both GIS popups
 * and Firebase redirect (getRedirectResult empty). Normal Chrome/Firefox tabs are fine.
 */
export function embeddedOAuthHostileBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  if (/Electron|vscode-webview|Cursor/i.test(ua)) return true;

  const win = window as Window & {
    process?: { versions?: { electron?: string } };
  };
  if (win.process?.versions?.electron) return true;

  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }

  return false;
}

/** Full-page Firebase redirect — opt-in only (unreliable in IDE embedded browsers). */
export function prefersGoogleSignInRedirect(): boolean {
  const forced = import.meta.env.VITE_GOOGLE_SIGNIN_REDIRECT?.trim().toLowerCase();
  if (forced === "true" || forced === "1" || forced === "yes") return true;
  return false;
}
import type { Plugin } from "vite";

/** Must match sessionStorage key used in googleIdentitySignIn.ts */
export const PENDING_GIS_CREDENTIAL_SESSION_KEY =
  "corp-civ-idle-pending-gis-credential";

function readRequestBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function readCookie(req: import("http").IncomingMessage, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * GIS redirect UX POSTs the ID token here (dev server only).
 * Returns HTML that stashes the credential and returns to the SPA.
 */
export function googleAuthCallbackPlugin(): Plugin {
  return {
    name: "google-auth-callback",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        if (path !== "/auth/google/callback") {
          next();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("Use Sign in with Google to reach this endpoint.");
          return;
        }

        try {
          const body = await readRequestBody(req);
          const params = new URLSearchParams(body);
          const credential = params.get("credential");
          const csrfParam = params.get("g_csrf_token");
          const csrfCookie = readCookie(req, "g_csrf_token");

          if (!credential?.trim()) {
            res.statusCode = 400;
            res.end("Missing credential.");
            return;
          }
          if (!csrfParam || !csrfCookie || csrfParam !== csrfCookie) {
            res.statusCode = 400;
            res.end("Invalid CSRF token.");
            return;
          }

          const stash = JSON.stringify({ credential: credential.trim() });
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<script>
sessionStorage.setItem(${JSON.stringify(PENDING_GIS_CREDENTIAL_SESSION_KEY)}, ${JSON.stringify(stash)});
sessionStorage.setItem("corp-civ-idle-pending-google-online", "1");
location.replace("/");
</script>
</body>
</html>`);
        } catch (err) {
          console.error("[google-auth-callback]", err);
          res.statusCode = 500;
          res.end("Could not complete Google sign-in.");
        }
      });
    },
  };
}
# Google sign-in setup (corp-civ-idle-a8a18)

Use when redirect sign-in loops or shows “no Firebase session”.

## 1. Firebase Console

- [Authentication](https://console.firebase.google.com/project/corp-civ-idle-a8a18/authentication/providers) → **Google** → **Enable**
- **Authentication** → **Settings** → **Authorized domains** → `localhost` (+ Netlify host if deployed)

## 2. Google Cloud — OAuth Web client

[Credentials](https://console.cloud.google.com/apis/credentials?project=corp-civ-idle-a8a18) → **OAuth 2.0 Client IDs** → **Web client (auto created by Google Service)**

| Field | Value |
|--------|--------|
| **Authorized JavaScript origins** | `http://localhost:5173` (and exact origin you play on, e.g. Netlify URL) |
| | `http://127.0.0.1:5173` if you open the game that way |
| **Authorized redirect URIs** | `https://corp-civ-idle-a8a18.firebaseapp.com/__/auth/handler` |

## 3. Google Cloud — API key (often missed)

Same **Credentials** page → **API Keys** → **Browser key (auto created by Google Service)**

If **Application restrictions** = **HTTP referrers**, add:

- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`
- `https://corp-civ-idle-a8a18.firebaseapp.com/*` (auth handler uses this domain)
- `https://corp-civ-idle-a8a18.web.app/*`
- Your deploy origin, e.g. `https://your-site.netlify.app/*`

For local dev you may set restrictions to **None** temporarily.

## 4. `.env.local`

Must match Firebase **Project settings** → Web app:

- `VITE_FIREBASE_PROJECT_ID=corp-civ-idle-a8a18`
- `VITE_FIREBASE_AUTH_DOMAIN=corp-civ-idle-a8a18.firebaseapp.com`

Restart `npm run dev` after changes.

## 5. Browser

- Use a normal window (strict private/incognito can break redirect state).
- Match the URL bar to the JavaScript origin you added (same host **and** port).

## Recommended: Google button (no redirect)

Redirect (`getRedirectResult` empty) is a common localhost pain. Prefer the **official Google button** on the account gate:

1. Firebase Console → **Authentication** → **Google** → copy **Web client ID**.
2. Add to `.env.local`:

   ```
   VITE_GOOGLE_OAUTH_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   ```

3. Restart `npm run dev`, hard refresh, **Online** → use the rendered **Sign in with Google** button.

This uses Google Identity Services + `signInWithCredential` (no `firebaseapp.com` redirect handler).

After saving Google Cloud changes, wait ~1 minute, hard refresh. Use full-page redirect only if the button is unavailable.

## Cursor IDE browser / embedded preview

Popup GIS and Firebase redirect often fail in Cursor's preview. **`npm run dev`** enables a **full-page GIS redirect** path (same tab, no popup):

1. Google Cloud → OAuth Web client → **Authorized redirect URIs**, add:

   `http://localhost:5173/auth/google/callback`

   (Use your exact dev port; keep `Authorized JavaScript origins` on `http://localhost:5173`.)

2. Restart dev, hard refresh in Cursor, click **Sign in with Google** (you leave the tab for Google, then land back on the title with online steps).

Production static hosting has no POST handler yet — use Chrome/Edge for deployed previews, or **Play solo** in Cursor.

## Netlify (production deploy)

Set these in **Site configuration → Environment variables** (scopes that include **Build**), then trigger a new deploy:

| Variable | Notes |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Required for any Google sign-in |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `corp-civ-idle-a8a18.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Optional but recommended (GIS button); title sign-in still works via Firebase popup when only Firebase vars are set |

Also add your Netlify URL (`https://your-site.netlify.app`) to Firebase **Authorized domains**, OAuth **JavaScript origins**, and the browser **API key** HTTP referrers (see sections above).

Do **not** set `VITE_GOOGLE_SIGNIN_REDIRECT=true` for Cursor (that is Firebase redirect, not GIS redirect).
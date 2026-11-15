# Firestore security (Online multiplayer)

Firebase **Test Mode** expires after 30 days. This project uses **Google sign-in + access keys + Firestore rules** (Option 1B: optional `lockedEmail` on each key).

There is no password login — playtesters **sign in with Google**, then paste an **access key** at the account gate (once per Google account). Keys are **reusable** on other devices after Google sign-in. Bindings are stored at `worlds/dev/bindings/{firebaseUid}`.

## One-time Firebase Console setup

1. **Authentication → Sign-in method → Google** — Enable (support email, authorized domains).
2. **Authentication → Sign-in method → Anonymous** — Optional (legacy dev only; set `VITE_ONLINE_ALLOW_ANONYMOUS=true` in local dev if needed).
3. **Firestore → Rules** — Publish `firestore.rules` from the repo (or `firebase deploy --only firestore:rules`).

## Bootstrap dev keys (Tim & Chris)

Before anyone can play online, create dev keys once (unlocked keys still work for dev Google accounts):

```bash
# Requires: npm install firebase-admin --save-dev
# Set GOOGLE_APPLICATION_CREDENTIALS and VITE_FIREBASE_PROJECT_ID (from .env.local)

node scripts/create-access-key.mjs "Tim dev" --account tim --email tim@example.com
node scripts/create-access-key.mjs "Chris dev" --account chris --email chris@example.com
```

Omit `--email` only for legacy unlocked dev keys (any Google account can redeem — avoid for playtesters).

Optional — add to `.env.local` for Account Gate dev shortcuts:

```
VITE_ONLINE_DEV_KEY_TIM=<uuid-from-script>
VITE_ONLINE_DEV_KEY_CHRIS=<uuid-from-script>
```

Each dev: **Online** → **Sign in with Google** → enter key once (or dev shortcut in local builds), then **Continue** on future visits with the same Google account.

## Inviting friends & family

While logged in online as **Tim** or **Chris**:

1. **Settings → Playtest access keys**
2. Name + **Google email** (required) → **Create access key**
3. Copy the UUID and send it with “Sign in with this Google account”

Or via script:

```bash
node scripts/create-access-key.mjs "Alice" --email alice@gmail.com
```

Playtester flow:

1. Open the game → **Sign in with Google** on the welcome screen (must match locked email; production builds no longer show Tim/Chris — use dev **Offline** mode for local single-player only)
2. Paste access key → **Connect with access key**
3. Same Google account next time → **Continue as Alice** (no key)
4. New device → Google sign-in → same key once if not yet bound on that Google uid

## Data model

| Path | Purpose |
|------|---------|
| `worlds/dev/accessKeys/{uuid}` | Invite key → `accountId`, `displayName`, `revoked`, optional `lockedEmail` |
| `worlds/dev/bindings/{firebaseUid}` | Google uid → `accountId` (auto-resume) |
| `worlds/dev/companies/{accountId}/private/state` | Private company save |
| `worlds/dev/jobPostings/*` | Shared job board |
| `worlds/dev/shared/mapLayout` | Shared playtest hex map (dev publish → all players read) |
| `worlds/dev/shared/marketLeaderboard` | Public net-worth rankings (Market Research) |

Account ids: `tim`, `chris`, or `guest-<random>`.

## Security model

| Protected | Limit |
|-----------|-------|
| Unauthenticated internet traffic | Blocked by rules |
| Playtesters without a key | Cannot connect |
| Wrong Google account for locked key | Blocked (client + rules) |
| Key reused on second device (same person, same Google) | Allowed |
| Playtester editing someone else's save | Blocked (rules check `boundAccountId`) |
| Dev (Tim/Chris) world resets | Can write any company doc (dev tools) |

Keys are unguessable UUIDs. `lockedEmail` ties the key to one Google identity. Send keys privately.

## Reclaiming / rotating access

| Problem | Fix |
|---------|-----|
| Playtester new device | Google sign-in + paste the same access key once if needed |
| Switch Google account | **Settings → Switch account** (signs out of Google) → sign in again |
| Legacy anonymous browser | Dev builds: **Settings → Link Google account**, or sign in with Google and re-redeem key |
| Compromised key | Set `revoked: true` on the `accessKeys` doc |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing or insufficient permissions` | Publish rules; enable Google auth. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`). |
| `Invalid access key` | Key typo, deleted doc, or wrong Firebase project |
| Email lock mismatch | Sign in with the exact `lockedEmail` on the key doc |
| Devs can't create keys in Settings | Redeem a Tim/Chris dev key first (bootstrap) |

## Deploy rules (CLI)

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```
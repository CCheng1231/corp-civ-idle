# Firestore security (Online multiplayer)

Firebase **Test Mode** expires after 30 days. This project uses **Anonymous Auth + access keys + Firestore rules**.

There is no password login — playtesters paste an **access key** at the account gate. Keys are **reusable** (same key on phone, laptop, etc.). Each browser remembers the account via invisible Firebase anonymous sign-in and a binding document.

## One-time Firebase Console setup

1. **Authentication → Sign-in method → Anonymous** — Enable.
2. **Firestore → Rules** — Publish `firestore.rules` from the repo (or `firebase deploy --only firestore:rules`).

## Bootstrap dev keys (Tim & Chris)

Before anyone can play online, create dev keys once:

```bash
# Requires: npm install firebase-admin --save-dev
# Set GOOGLE_APPLICATION_CREDENTIALS and VITE_FIREBASE_PROJECT_ID (from .env.local)

node scripts/create-access-key.mjs "Tim dev" --account tim
node scripts/create-access-key.mjs "Chris dev" --account chris
```

Optional — add to `.env.local` for Account Gate dev shortcuts:

```
VITE_ONLINE_DEV_KEY_TIM=<uuid-from-script>
VITE_ONLINE_DEV_KEY_CHRIS=<uuid-from-script>
```

Each dev opens **Online**, enters their key once (or clicks the dev shortcut in local builds), then **Continue as Tim/Chris** on future visits from the same browser profile.

## Inviting friends & family

While logged in online as **Tim** or **Chris**:

1. **Settings → Playtest access keys**
2. Enter a name → **Create access key**
3. Copy the UUID and send it to the playtester (shown once in the alert)

Or via script:

```bash
node scripts/create-access-key.mjs "Alice"
# Creates guest-xxxx account + key
```

Playtester flow:

1. Open the game → **Online**
2. Paste access key → **Connect with access key**
3. Same browser next time → **Continue as Alice** (no key needed)
4. New browser/device → paste the **same key** again (once per browser)

## Data model

| Path | Purpose |
|------|---------|
| `worlds/dev/accessKeys/{uuid}` | Invite key → `accountId`, `displayName`, `revoked` |
| `worlds/dev/bindings/{firebaseUid}` | This browser → `accountId` (auto-resume) |
| `worlds/dev/companies/{accountId}/private/state` | Private company save |
| `worlds/dev/jobPostings/*` | Shared job board |

Account ids: `tim`, `chris`, or `guest-<random>`.

## Security model

| Protected | Limit |
|-----------|-------|
| Unauthenticated internet traffic | Blocked by rules |
| Playtesters without a key | Cannot connect |
| Key reused on second browser | Allowed (same account) |
| Playtester editing someone else's save | Blocked (rules check `boundAccountId`) |
| Dev (Tim/Chris) world resets | Can write any company doc (dev tools) |

Keys are unguessable UUIDs. Treat them like passwords — send privately.

## Reclaiming / rotating access

| Problem | Fix |
|---------|-----|
| Playtester new browser | Paste the same access key again |
| Switch browser account | Delete `worlds/dev/bindings/{firebaseUid}` in Firestore, then redeem a different key |
| Compromised key | Set `revoked: true` on the `accessKeys` doc (dev accounts can revoke via Firestore console) |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing or insufficient permissions` | Publish rules; enable Anonymous auth |
| `Invalid access key` | Key typo, deleted doc, or wrong Firebase project |
| `Already linked to another browser` | Old rules/key doc — republish rules; keys are reusable now |
| Devs can't create keys in Settings | Redeem a Tim/Chris dev key first (bootstrap) |

## Deploy rules (CLI)

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

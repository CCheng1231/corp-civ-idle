# Save integrity protocol

Player progress is the top priority. All persistence paths go through guards in
[`src/game/saveIntegrity.ts`](../src/game/saveIntegrity.ts).

## Offline (localStorage)

| Key | Purpose |
|-----|---------|
| `corp-civ-idle-save-v2-{tim\|chris}` | Primary offline slot |
| `…-backup` / `…-backup-prev` | Rotating backups before each accepted write |
| `…-quarantine-{timestamp}` | Raw blobs when load fails or a write is blocked (max 5 kept) |

**Load order:** primary → `-backup` / `-backup-prev` → fresh (with `saveLoadFailed`).

**Write rules:**

1. Block if the new blob looks like a **fresh template** replacing **meaningful progress** (net worth, branches, persistRevision heuristics).
2. Block **stale** writes (`persistRevision` / `lastTickAt` regression).
3. Never write while `saveLoadFailed` is set (bad load must not clobber primary).
4. Rotate backup before every accepted overwrite.

**Recovery (Settings → Save):** Restore from automatic backup; restore from online browser cache when available.

## Online

| Layer | Guard |
|-------|--------|
| **Firestore** (`savePrivateState`) | Transaction rejects writes that regress remote `persistRevision` / net worth / branches (same heuristics). Still enforces reset generation + save session id. |
| **Browser cache** (`corp-civ-idle-online-cache-{world}-{account}`) | Same `writeProtectedLocalSaveBlob` as offline. |
| **Server reset** (`writeFreshPrivateState`) | Archives prior Firestore doc to local `…-firestore-backup` before writing fresh state. |

**Errors:**

- `OnlineSaveRejectedError` — account reset / session mismatch; reload from server.
- `SaveRegressionError` — local tab tried to push a regressed save; connection shows error, Firestore unchanged.

## Developer checklist

When changing save shape or migration:

1. Run load on an old JSON fixture; ensure `normalizeSave` does not throw.
2. If migration can throw, add a test save to `docs/` or script — **never** ship a throw without a quarantine path.
3. Watch console for `[save-integrity]` logs.
4. Do not bypass `writeProtectedLocalSaveBlob` / `savePrivateState` for economy state.

## Explicit reset only

`resetGameState`, Settings → Reset save, and online account reset flows may use
`allowExplicitReset` or server reset paths. Those rotate backup **before** wiping.

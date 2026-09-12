import { getAuth, signInAnonymously, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type FirestoreError,
} from "firebase/firestore";
import { getDb, getFirebaseApp } from "./firebase";
import type { OnlineAccountId, OnlineSession, WorldId } from "./types";
import {
  accountDisplayName,
  isDevAccount,
  isValidOnlineAccountId,
} from "./types";

export class OnlineAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnlineAccessError";
  }
}

export interface BrowserBinding {
  uid: string;
  accountId: OnlineAccountId;
  displayName: string;
  boundAt: number;
  keyId: string;
}

export interface AccessKeyRecord {
  accountId: OnlineAccountId;
  displayName: string;
  createdAt: number;
  createdBy?: string;
  revoked?: boolean;
}

function bindingRef(worldId: WorldId, uid: string) {
  return doc(getDb(), "worlds", worldId, "bindings", uid);
}

function accessKeyRef(worldId: WorldId, keyId: string) {
  return doc(getDb(), "worlds", worldId, "accessKeys", keyId);
}

function newGuestAccountId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `guest-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `guest-${Date.now().toString(36)}`;
}

function newAccessKeyId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Invisible Firebase sign-in — required for Firestore rules, no user-facing login. */
export async function ensureFirebaseUser(): Promise<User> {
  const auth = getAuth(getFirebaseApp());
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  const user = auth.currentUser;
  if (!user) {
    throw new OnlineAccessError("Firebase sign-in failed.");
  }
  return user;
}

export async function loadBrowserBinding(
  worldId: WorldId = "dev",
): Promise<BrowserBinding | null> {
  const user = await ensureFirebaseUser();
  const snap = await getDoc(bindingRef(worldId, user.uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  const accountId = String(data.accountId ?? "");
  if (!isValidOnlineAccountId(accountId)) return null;

  return {
    uid: user.uid,
    accountId,
    displayName: accountDisplayName(accountId, String(data.displayName ?? "")),
    boundAt: Number(data.boundAt ?? 0),
    keyId: String(data.keyId ?? ""),
  };
}

/**
 * Redeem a dev-provided access key on this browser.
 * Keys are reusable — the same key works on any browser (one binding per browser).
 * Same browser profile auto-resumes via Firebase anonymous uid + binding doc.
 */
export async function redeemAccessKey(
  keyId: string,
  worldId: WorldId = "dev",
): Promise<BrowserBinding> {
  const trimmed = keyId.trim();
  if (!trimmed) {
    throw new OnlineAccessError("Enter an access key.");
  }

  const user = await ensureFirebaseUser();
  const existing = await loadBrowserBinding(worldId);
  if (existing) {
    return existing;
  }

  const keyRef = accessKeyRef(worldId, trimmed);

  try {
    return await runTransaction(getDb(), async (tx) => {
      const keySnap = await tx.get(keyRef);
      if (!keySnap.exists()) {
        throw new OnlineAccessError("Invalid access key.");
      }

      const key = keySnap.data() as AccessKeyRecord;
      if (key.revoked) {
        throw new OnlineAccessError("This access key has been revoked.");
      }

      const accountId = String(key.accountId ?? "");
      if (!isValidOnlineAccountId(accountId)) {
        throw new OnlineAccessError("Access key is misconfigured.");
      }

      const bindingSnap = await tx.get(bindingRef(worldId, user.uid));
      if (bindingSnap.exists()) {
        const row = bindingSnap.data();
        return {
          uid: user.uid,
          accountId: String(row.accountId),
          displayName: accountDisplayName(
            String(row.accountId),
            String(row.displayName ?? ""),
          ),
          boundAt: Number(row.boundAt ?? 0),
          keyId: String(row.keyId ?? trimmed),
        };
      }

      const now = Date.now();
      const displayName = accountDisplayName(
        accountId,
        String(key.displayName ?? ""),
      );

      tx.set(bindingRef(worldId, user.uid), {
        uid: user.uid,
        accountId,
        displayName,
        boundAt: now,
        keyId: trimmed,
      });

      return {
        uid: user.uid,
        accountId,
        displayName,
        boundAt: now,
        keyId: trimmed,
      };
    });
  } catch (err) {
    if (err instanceof OnlineAccessError) throw err;
    const code = (err as FirestoreError).code;
    if (code === "permission-denied") {
      throw new OnlineAccessError(
        "Access denied. Check Firestore rules and Anonymous Auth.",
      );
    }
    throw err;
  }
}

/** Verify this browser is bound to the requested online account. */
export async function ensureOnlineAccess(
  session: OnlineSession,
): Promise<User> {
  const user = await ensureFirebaseUser();
  const binding = await loadBrowserBinding(session.worldId);
  if (!binding) {
    throw new OnlineAccessError(
      "No access key on this browser. Enter your key at the account gate.",
    );
  }
  if (binding.accountId !== session.accountId) {
    throw new OnlineAccessError(
      `This browser is linked to ${binding.displayName}, not ${accountDisplayName(session.accountId, session.displayName)}.`,
    );
  }
  return user;
}

/** Dev-only: mint a new playtest access key (friend/family account). */
export async function createPlaytestAccessKey(
  session: OnlineSession,
  displayName: string,
): Promise<{ keyId: string; accountId: OnlineAccountId; displayName: string }> {
  if (!isDevAccount(session.accountId)) {
    throw new OnlineAccessError("Only dev accounts can create access keys.");
  }

  const label = displayName.trim();
  if (!label) {
    throw new OnlineAccessError("Enter a name for the playtester.");
  }

  await ensureOnlineAccess(session);

  const accountId = newGuestAccountId();
  const keyId = newAccessKeyId();
  const record: AccessKeyRecord = {
    accountId,
    displayName: label,
    createdAt: Date.now(),
    createdBy: session.accountId,
    revoked: false,
  };

  await setDoc(accessKeyRef(session.worldId, keyId), record);

  return { keyId, accountId, displayName: label };
}

/** Optional dev shortcuts from .env.local (not committed). */
export function readDevAccessKeyHint(accountId: OnlineAccountId): string | null {
  if (!import.meta.env.DEV) return null;
  if (accountId === "tim") {
    return import.meta.env.VITE_ONLINE_DEV_KEY_TIM?.trim() || null;
  }
  if (accountId === "chris") {
    return import.meta.env.VITE_ONLINE_DEV_KEY_CHRIS?.trim() || null;
  }
  return null;
}

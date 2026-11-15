import type { User } from "firebase/auth";
import { normalizeEmail } from "./firebaseAuth";

export interface AccessKeyEmailLockFields {
  lockedEmail?: string;
}

export function accessKeyEmailLockSatisfied(
  key: AccessKeyEmailLockFields,
  user: User,
): boolean {
  const lock = key.lockedEmail?.trim();
  if (!lock) return true;
  const email = user.email?.trim();
  if (!email) return false;
  return normalizeEmail(email) === normalizeEmail(lock);
}

export function accessKeyEmailLockMessage(lockedEmail: string): string {
  return `This invite is for ${lockedEmail.trim()}. Sign in with that Google account, then enter the key.`;
}
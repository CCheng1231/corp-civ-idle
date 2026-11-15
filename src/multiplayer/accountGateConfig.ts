import type { PlayMode } from "./types";
import { isFirebaseConfigured } from "./firebase";

/** Tim/Chris offline picker — local dev only; production playtesters use Online sign-in. */
export function accountGateOfflineModeEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  return import.meta.env.VITE_ACCOUNT_GATE_OFFLINE !== "false";
}

export function accountGateDefaultPlayMode(): PlayMode {
  if (!accountGateOfflineModeEnabled()) return "online";
  return isFirebaseConfigured() ? "online" : "offline";
}
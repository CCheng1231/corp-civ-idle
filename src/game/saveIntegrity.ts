/**
 * Save integrity protocol (offline + online local cache + Firestore guards).
 *
 * Goals:
 * 1. Never replace meaningful progress with an accidental fresh/template save.
 * 2. Keep rotating local backups before every accepted overwrite.
 * 3. Quarantine corrupt blobs instead of silently deleting history.
 * 4. Reject monotonic regressions on persistRevision / netWorth heuristics.
 */

export const SAVE_SCHEMA_VERSION = 1;

export class SaveRegressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveRegressionError";
  }
}

export interface SaveProgressMetrics {
  persistRevision: number;
  worldPersistRevision: number;
  netWorth: number;
  lastTickAt: number;
  branchSiteCount: number;
  researchUnlocks: number;
}

export type SaveIntegrityBlockReason =
  | "load_failed"
  | "regression"
  | "stale_revision"
  | "explicit_reset_only";

export interface SaveIntegrityEvent {
  at: number;
  storageKey: string;
  reason: SaveIntegrityBlockReason;
  message: string;
}

let lastIntegrityEvent: SaveIntegrityEvent | null = null;

export function consumeLastSaveIntegrityEvent(): SaveIntegrityEvent | null {
  const event = lastIntegrityEvent;
  lastIntegrityEvent = null;
  return event;
}

export function peekLastSaveIntegrityEvent(): SaveIntegrityEvent | null {
  return lastIntegrityEvent;
}

function recordIntegrityEvent(event: Omit<SaveIntegrityEvent, "at">): void {
  lastIntegrityEvent = { ...event, at: Date.now() };
  console.error(`[save-integrity] ${event.reason}: ${event.message}`, {
    storageKey: event.storageKey,
  });
}

export function saveProgressMetrics(
  raw: Record<string, unknown> | string,
): SaveProgressMetrics {
  let parsed: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return emptyMetrics();
    }
  } else {
    parsed = raw;
  }

  const researchLevels = parsed.researchLevels as Record<string, number> | undefined;
  let researchUnlocks = 0;
  if (researchLevels) {
    for (const level of Object.values(researchLevels)) {
      if (Number(level) > 0) researchUnlocks += 1;
    }
  }

  return {
    persistRevision: Number(parsed.persistRevision ?? 0),
    worldPersistRevision: Number(parsed.worldPersistRevision ?? 0),
    netWorth: Number(parsed.netWorth ?? 0),
    lastTickAt: Number(parsed.lastTickAt ?? 0),
    branchSiteCount: Array.isArray(parsed.branchSites)
      ? parsed.branchSites.length
      : 0,
    researchUnlocks,
  };
}

function emptyMetrics(): SaveProgressMetrics {
  return {
    persistRevision: 0,
    worldPersistRevision: 0,
    netWorth: 0,
    lastTickAt: 0,
    branchSiteCount: 0,
    researchUnlocks: 0,
  };
}

/** True when the blob looks like createInitialState(), not mid-game progress. */
export function isLikelyFreshTemplateSave(
  metrics: SaveProgressMetrics,
): boolean {
  if (metrics.branchSiteCount > 0) return false;
  if (metrics.researchUnlocks > 2) return false;
  if (metrics.persistRevision > 3) return false;
  if (metrics.netWorth > 8_000) return false;
  return metrics.netWorth < 3_000;
}

export function saveHasMeaningfulProgress(
  metrics: SaveProgressMetrics,
): boolean {
  return (
    metrics.persistRevision > 0 ||
    metrics.netWorth > 500 ||
    metrics.branchSiteCount > 0 ||
    metrics.researchUnlocks > 1
  );
}

/**
 * Returns true when the write must be blocked (regression / accidental wipe).
 * `allowExplicitReset` — Settings → Reset save, dev account reset flows.
 */
export function saveWriteWouldRegress(
  existingRaw: string | null,
  nextBlob: Record<string, unknown>,
  options?: { allowExplicitReset?: boolean },
): boolean {
  if (options?.allowExplicitReset) return false;
  if (!existingRaw) return false;

  const existing = saveProgressMetrics(existingRaw);
  const next = saveProgressMetrics(nextBlob);

  if (!saveHasMeaningfulProgress(existing)) return false;

  if (
    isLikelyFreshTemplateSave(next) &&
    !isLikelyFreshTemplateSave(existing)
  ) {
    return true;
  }

  if (next.persistRevision + 1 < existing.persistRevision) {
    return true;
  }

  if (
    existing.netWorth > 5_000 &&
    next.netWorth < existing.netWorth * 0.45
  ) {
    return true;
  }

  if (
    existing.branchSiteCount > 0 &&
    next.branchSiteCount === 0 &&
    next.persistRevision <= existing.persistRevision
  ) {
    return true;
  }

  return false;
}

export function shouldAcceptSaveRevision(
  existingRaw: string | null,
  nextBlob: Record<string, unknown>,
): boolean {
  if (!existingRaw) return true;
  try {
    const existing = saveProgressMetrics(existingRaw);
    const next = saveProgressMetrics(nextBlob);
    if (next.persistRevision > existing.persistRevision) return true;
    if (next.persistRevision < existing.persistRevision) return false;
    return next.lastTickAt >= existing.lastTickAt;
  } catch {
    return false;
  }
}

export function rotateLocalBackup(
  primaryKey: string,
  existingRaw: string,
): void {
  if (typeof localStorage === "undefined") return;
  const backupKey = `${primaryKey}-backup`;
  const prevKey = `${primaryKey}-backup-prev`;
  try {
    const currentBackup = localStorage.getItem(backupKey);
    if (currentBackup) {
      localStorage.setItem(prevKey, currentBackup);
    }
    localStorage.setItem(backupKey, existingRaw);
  } catch (err) {
    console.error("[save-integrity] backup rotation failed", err);
  }
}

const MAX_QUARANTINE_ENTRIES = 5;

/** Preserve corrupt / rejected blobs for manual recovery (DevTools). */
export function quarantineLocalSaveBlob(
  primaryKey: string,
  raw: string,
  reason: string,
): void {
  if (typeof localStorage === "undefined") return;
  const entryKey = `${primaryKey}-quarantine-${Date.now()}`;
  try {
    localStorage.setItem(
      entryKey,
      JSON.stringify({
        reason,
        quarantinedAt: Date.now(),
        payload: raw,
      }),
    );
    trimQuarantineEntries(primaryKey);
  } catch (err) {
    console.error("[save-integrity] quarantine write failed", err);
  }
}

function trimQuarantineEntries(primaryKey: string): void {
  if (typeof localStorage === "undefined") return;
  const prefix = `${primaryKey}-quarantine-`;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.sort();
  while (keys.length > MAX_QUARANTINE_ENTRIES) {
    const drop = keys.shift();
    if (drop) localStorage.removeItem(drop);
  }
}

export interface LocalSaveWriteResult {
  ok: boolean;
  blocked?: SaveIntegrityBlockReason;
}

/**
 * Single gate for all localStorage save blobs (offline slots + online cache).
 */
export function writeProtectedLocalSaveBlob(
  primaryKey: string,
  blob: Record<string, unknown>,
  options?: {
    rejectStale?: boolean;
    allowExplicitReset?: boolean;
    skipBackup?: boolean;
  },
): LocalSaveWriteResult {
  if (typeof localStorage === "undefined") return { ok: false };

  const existingRaw = localStorage.getItem(primaryKey);
  const enriched: Record<string, unknown> = {
    ...blob,
    saveSchemaVersion: SAVE_SCHEMA_VERSION,
  };

  if (saveWriteWouldRegress(existingRaw, enriched, options)) {
    if (existingRaw) {
      quarantineLocalSaveBlob(
        primaryKey,
        JSON.stringify(enriched),
        "blocked-regression-write",
      );
    }
    recordIntegrityEvent({
      storageKey: primaryKey,
      reason: "regression",
      message:
        "Blocked save write that would regress progress (likely fresh state after load failure).",
    });
    return { ok: false, blocked: "regression" };
  }

  if (
    options?.rejectStale !== false &&
    existingRaw &&
    !shouldAcceptSaveRevision(existingRaw, enriched)
  ) {
    recordIntegrityEvent({
      storageKey: primaryKey,
      reason: "stale_revision",
      message: "Blocked stale local save (older persistRevision).",
    });
    return { ok: false, blocked: "stale_revision" };
  }

  try {
    if (
      !options?.skipBackup &&
      existingRaw &&
      saveHasMeaningfulProgress(saveProgressMetrics(existingRaw))
    ) {
      rotateLocalBackup(primaryKey, existingRaw);
    }
    localStorage.setItem(primaryKey, JSON.stringify(enriched));
    return { ok: true };
  } catch (err) {
    console.error("[save-integrity] localStorage setItem failed", err);
    return { ok: false };
  }
}

/** Call when parse/migrate fails so the raw blob survives elsewhere. */
export function quarantineFailedLoad(
  primaryKey: string,
  raw: string | null,
  error: unknown,
): void {
  if (!raw) return;
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");
  quarantineLocalSaveBlob(primaryKey, raw, `load-failed: ${message}`);
  recordIntegrityEvent({
    storageKey: primaryKey,
    reason: "load_failed",
    message: `Load failed; primary blob quarantined (${message}).`,
  });
}

export function readRotatingBackup(primaryKey: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return (
    localStorage.getItem(`${primaryKey}-backup`) ??
    localStorage.getItem(`${primaryKey}-backup-prev`)
  );
}

export function localSaveBackupExists(primaryKey: string): boolean {
  return Boolean(readRotatingBackup(primaryKey));
}

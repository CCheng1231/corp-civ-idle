import { formatNumber } from "./constants";
import type { GameState } from "./types";

export function ignoreTimers(state: GameState): boolean {
  return state.settings.ignoreTimers === true;
}

export function timerHasElapsed(
  now: number,
  at: number,
  state: GameState,
): boolean {
  return ignoreTimers(state) || now >= at;
}

export function timerHasNotElapsed(
  now: number,
  at: number,
  state: GameState,
): boolean {
  return !ignoreTimers(state) && now < at;
}

/** Delay before a scheduled event (0 when dev ignore timers is on). */
export function timerDelayMs(state: GameState, delayMs: number): number {
  return ignoreTimers(state) ? 0 : delayMs;
}

export function scheduleTimerAt(
  state: GameState,
  now: number,
  delayMs: number,
): number {
  return now + timerDelayMs(state, delayMs);
}

/** Compact preview for structure cards (no seconds). */
export function formatBuildTimeHours(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${formatNumber(Math.round(hours * 10) / 10)} hr`;
}

/** Queue / countdown display — hr, min, and sec. */
export function formatQueueTimeMs(ms: number): string {
  if (ms <= 0) return "—";
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sec`);

  return parts.join(" ");
}

/** Compact queue / countdown — hr and min only (for dense tables). */
export function formatQueueTimeCompactMs(ms: number): string {
  if (ms <= 0) return "—";
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes > 0) return `${hours} hr ${minutes} min`;
  return `${hours} hr`;
}

export function formatQueueTimeHours(hours: number): string {
  if (hours <= 0) return "—";
  return formatQueueTimeMs(hours * 3600 * 1000);
}

/** @deprecated Use formatQueueTimeMs */
export function formatBuildTimeMs(ms: number): string {
  return formatQueueTimeMs(ms);
}

/** @deprecated Use formatQueueTimeMs */
export function formatRecruitTimeMs(ms: number): string {
  return formatQueueTimeMs(ms);
}

/** @deprecated Use formatQueueTimeHours */
export function formatRecruitTimeHours(hours: number): string {
  return formatQueueTimeHours(hours);
}

/** @deprecated Use formatQueueTimeMs */
export function formatDurationMs(msLeft: number): string {
  return formatQueueTimeMs(msLeft);
}

export function formatTimerRemaining(
  state: GameState,
  at: number | null,
  now: number,
): string {
  if (ignoreTimers(state)) return "Instant (dev)";
  if (at === null) return "Queued";
  if (at <= now) return "Finishing…";
  return formatQueueTimeMs(at - now);
}

/** Like formatTimerRemaining but omits seconds (dense list/table views). */
export function formatTimerRemainingCompact(
  state: GameState,
  at: number | null,
  now: number,
): string {
  if (ignoreTimers(state)) return "Instant";
  if (at === null) return "Queued";
  if (at <= now) return "Finishing…";
  return formatQueueTimeCompactMs(at - now);
}

export interface QueueJobTiming {
  completesAt: number | null;
  durationMs: number;
}

/** Milliseconds from `now` until this queue index may start. */
export function queueWaitBeforeIndex(
  jobs: QueueJobTiming[],
  index: number,
  now: number,
): number {
  let startAt = now;
  for (let i = 0; i < index; i++) {
    const job = jobs[i];
    if (job.completesAt !== null) {
      startAt = Math.max(startAt, job.completesAt);
    } else {
      startAt += job.durationMs;
    }
  }
  return Math.max(0, startAt - now);
}

/** Countdown for active jobs; duration / start wait for queued jobs. */
export function formatQueueJobStatus(
  state: GameState,
  job: QueueJobTiming,
  _waitBeforeStartMs: number,
  now: number,
): string {
  if (ignoreTimers(state)) return "Instant (dev)";

  if (job.completesAt !== null) {
    if (job.completesAt <= now) return "Finishing…";
    return formatQueueTimeMs(job.completesAt - now);
  }

  if (job.durationMs <= 0) return "Queued";

  return formatQueueTimeMs(job.durationMs);
}

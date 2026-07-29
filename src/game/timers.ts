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

export function formatTimerRemaining(
  state: GameState,
  at: number | null,
  now: number,
): string {
  if (ignoreTimers(state)) return "Instant (dev)";
  if (at === null) return "Queued";
  if (at <= now) return "Finishing…";
  const msLeft = at - now;
  if (msLeft < 10_000) {
    const sec = Math.ceil(msLeft / 100) / 10;
    return `${sec}s`;
  }
  const sec = Math.ceil(msLeft / 1000);
  if (sec >= 3600) {
    const hrs = (sec / 3600).toFixed(sec >= 36000 ? 0 : 1);
    return `${hrs} hr`;
  }
  return `${sec}s`;
}

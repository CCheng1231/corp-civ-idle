import { useState, type Dispatch } from "react";
import type { GameAction } from "../game/types";

interface DevTimeSkipProps {
  dispatch: Dispatch<GameAction>;
}

const PRESETS = [
  { label: "1m", minutes: 1 },
  { label: "5m", minutes: 5 },
  { label: "15m", minutes: 15 },
  { label: "1h", minutes: 60 },
  { label: "6h", minutes: 360 },
  { label: "24h", minutes: 1440 },
] as const;

export function DevTimeSkip({ dispatch }: DevTimeSkipProps) {
  const [minutes, setMinutes] = useState(60);
  const [lastSkip, setLastSkip] = useState<string | null>(null);

  function skip(value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    const capped = Math.min(value, 60 * 24 * 7);
    dispatch({ type: "DEV_SKIP_TIME", minutes: capped });
    setMinutes(capped);
    setLastSkip(
      capped >= 60
        ? `Skipped ${capped / 60} hour${capped === 60 ? "" : "s"}`
        : `Skipped ${capped} minute${capped === 1 ? "" : "s"}`,
    );
  }

  return (
    <div className="dev-time-skip">
      <p className="muted setting-hint">
        Advances production, structure/research/hire queues, staff travel, job
        engagement shifts, and posting expiry by the chosen amount.
      </p>
      <div className="dev-skip-presets" role="group" aria-label="Skip presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="tab"
            onClick={() => skip(preset.minutes)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="setting-row">
        Minutes
        <input
          type="number"
          min={1}
          max={10080}
          step={1}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
        />
      </label>
      <button type="button" className="btn dev-skip-btn" onClick={() => skip(Number(minutes))}>
        Skip time
      </button>
      {lastSkip ? (
        <p className="muted setting-hint" role="status">
          {lastSkip}. Check Secretary / queues — countdowns and completions
          should reflect the jump.
        </p>
      ) : null}
    </div>
  );
}

import { useState, type Dispatch } from "react";
import type { GameAction } from "../game/types";

interface DevTimeSkipProps {
  dispatch: Dispatch<GameAction>;
}

export function DevTimeSkip({ dispatch }: DevTimeSkipProps) {
  const [minutes, setMinutes] = useState(5);

  function skip() {
    const value = Number(minutes);
    if (!Number.isFinite(value) || value <= 0) return;
    dispatch({ type: "DEV_SKIP_TIME", minutes: value });
  }

  return (
    <div className="dev-time-skip">
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
      <button type="button" className="btn dev-skip-btn" onClick={skip}>
        Skip time
      </button>
    </div>
  );
}

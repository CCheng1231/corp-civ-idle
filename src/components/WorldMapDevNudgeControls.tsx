import type { Dispatch } from "react";
import type { AxialCoord, GameAction, GameSettings } from "../game/types";
import { axialKey } from "../game/hexLayout";
import { isMapLayoutLockedCoord } from "../game/mapDevLayout";

const STEP = 2;
const STEP_FINE = 1;

interface WorldMapDevNudgeControlsProps {
  settings: GameSettings;
  dispatch: Dispatch<GameAction>;
  /** Hex under inspection / last clicked on the map. */
  inspectedHex: AxialCoord | null;
}

function NudgePad({
  label,
  dx,
  dy,
  disabled,
  onNudge,
}: {
  label: string;
  dx: number;
  dy: number;
  disabled?: boolean;
  onNudge: (
    ndx: number,
    ndy: number,
    fine: boolean,
    reset?: boolean,
  ) => void;
}) {
  return (
    <div className="world-map-dev-nudge-pad" role="group" aria-label={label}>
      <span className="world-map-dev-nudge-label">{label}</span>
      <span className="world-map-dev-nudge-readout" aria-live="polite">
        {dx},{dy}
      </span>
      <button
        type="button"
        className="map-zoom-btn"
        disabled={disabled}
        aria-label={`${label} up`}
        onClick={(e) => onNudge(0, -1, e.shiftKey)}
      >
        ↑
      </button>
      <div className="world-map-dev-nudge-row">
        <button
          type="button"
          className="map-zoom-btn"
          disabled={disabled}
          aria-label={`${label} left`}
          onClick={(e) => onNudge(-1, 0, e.shiftKey)}
        >
          ←
        </button>
        <button
          type="button"
          className="map-zoom-btn"
          disabled={disabled}
          aria-label={`${label} reset`}
          onClick={() => onNudge(0, 0, false, true)}
        >
          ·
        </button>
        <button
          type="button"
          className="map-zoom-btn"
          disabled={disabled}
          aria-label={`${label} right`}
          onClick={(e) => onNudge(1, 0, e.shiftKey)}
        >
          →
        </button>
      </div>
      <button
        type="button"
        className="map-zoom-btn"
        disabled={disabled}
        aria-label={`${label} down`}
        onClick={(e) => onNudge(0, 1, e.shiftKey)}
      >
        ↓
      </button>
    </div>
  );
}

export function WorldMapDevNudgeControls({
  settings,
  dispatch,
  inspectedHex,
}: WorldMapDevNudgeControlsProps) {
  const grid = settings.mapDevGridNudge ?? { dx: 0, dy: 0 };
  const hexTargetRaw =
    inspectedHex ?? settings.mapDevHexNudgeTarget ?? null;
  const hexLocked =
    hexTargetRaw != null && isMapLayoutLockedCoord(hexTargetRaw, settings);
  const hexTarget = hexLocked ? null : hexTargetRaw;
  const hexNudges = settings.mapDevHexNudges ?? {};
  const hexKey = hexTarget ? axialKey(hexTarget) : null;
  const hex = hexKey ? (hexNudges[hexKey] ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 };

  function patch(partial: Partial<GameSettings>) {
    dispatch({ type: "UPDATE_SETTINGS", settings: partial });
  }

  function nudgeGrid(
    dirX: number,
    dirY: number,
    fine: boolean,
    reset?: boolean,
  ) {
    if (reset) {
      patch({ mapDevGridNudge: undefined });
      return;
    }
    const step = fine ? STEP_FINE : STEP;
    const next = {
      dx: grid.dx + dirX * step,
      dy: grid.dy + dirY * step,
    };
    patch({
      mapDevGridNudge:
        next.dx === 0 && next.dy === 0 ? undefined : next,
    });
  }

  function nudgeHex(
    dirX: number,
    dirY: number,
    fine: boolean,
    reset?: boolean,
  ) {
    if (!hexTarget || !hexKey) return;
    if (reset) {
      const next = { ...hexNudges };
      delete next[hexKey];
      patch({
        mapDevHexNudges:
          Object.keys(next).length > 0 ? next : undefined,
      });
      return;
    }
    const step = fine ? STEP_FINE : STEP;
    const nextHex = {
      dx: hex.dx + dirX * step,
      dy: hex.dy + dirY * step,
    };
    const next = { ...hexNudges, [hexKey]: nextHex };
    if (nextHex.dx === 0 && nextHex.dy === 0) {
      delete next[hexKey];
    }
    patch({
      mapDevHexNudgeTarget: hexTarget,
      mapDevHexNudges:
        Object.keys(next).length > 0 ? next : undefined,
    });
  }

  return (
    <div className="world-map-dev-nudge" role="group" aria-label="Hex nudge">
      <NudgePad
        label="All hexes"
        dx={grid.dx}
        dy={grid.dy}
        onNudge={nudgeGrid}
      />
      <div className="world-map-dev-nudge-site">
        <span className="world-map-dev-nudge-label">
          One hex
          {hexLocked
            ? ` ${hexTargetRaw!.q},${hexTargetRaw!.r} (locked)`
            : hexTarget
              ? ` ${hexTarget.q},${hexTarget.r}`
              : " — click map"}
        </span>
        <NudgePad
          label="Hex px"
          dx={hex.dx}
          dy={hex.dy}
          disabled={!hexTarget || hexLocked}
          onNudge={nudgeHex}
        />
      </div>
      <span className="world-map-z1-place-hint">
        Gov + major hubs locked · other hexes: 2px/step · Shift = 1px
      </span>
    </div>
  );
}

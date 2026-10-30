import { useId, useState } from "react";
import type { Dispatch } from "react";
import { playerWorldLandmarkArtVisible } from "../game/mapLandmarkPolicy";
import type { GameAction, GameSettings } from "../game/types";

interface MapWorldLandmarkFilterControlProps {
  settings: GameSettings;
  dispatch: Dispatch<GameAction>;
}

/** Player map filter (top-right) — world landmarks only; separate from Jobs panel. */
export function MapWorldLandmarkFilterControl({
  settings,
  dispatch,
}: MapWorldLandmarkFilterControlProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const landmarksOn = playerWorldLandmarkArtVisible(settings);

  function setLandmarksOn(next: boolean) {
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: { mapShowWorldLandmarkArt: next },
    });
  }

  return (
    <div
      className={`map-world-landmark-filter${open ? " is-open" : ""}${
        landmarksOn ? "" : " is-filtered-off"
      }`}
    >
      <button
        type="button"
        className="map-world-landmark-filter-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Filter
        {!landmarksOn ? (
          <span className="map-world-landmark-filter-badge">Hidden</span>
        ) : null}
      </button>
      {open ? (
        <div
          id={panelId}
          className="map-world-landmark-filter-panel"
          role="group"
          aria-label="Map display filters"
        >
          <label className="map-world-landmark-filter-row">
            <input
              type="checkbox"
              checked={landmarksOn}
              onChange={(e) => setLandmarksOn(e.target.checked)}
            />
            <span className="map-world-landmark-filter-row-title">
              Landmark icon
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

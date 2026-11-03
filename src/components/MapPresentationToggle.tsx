import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";

interface MapPresentationToggleProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  className?: string;
}

export function MapPresentationToggle({
  state,
  dispatch,
  className = "",
}: MapPresentationToggleProps) {
  const isDev = state.settings.mapPresentation === "dev";

  return (
    <div
      className={`world-map-presentation-toggle${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Map view mode"
    >
      <button
        type="button"
        className={`tab world-map-presentation-btn${!isDev ? " active" : ""}`}
        aria-pressed={!isDev}
        aria-label="Player's view"
        title="Player's view"
        onClick={() =>
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: { mapPresentation: "player" },
          })
        }
      >
        Player
      </button>
      <button
        type="button"
        className={`tab world-map-presentation-btn${isDev ? " active" : ""}`}
        aria-pressed={isDev}
        aria-label="Developer view"
        title="Developer view"
        onClick={() =>
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: { mapPresentation: "dev" },
          })
        }
      >
        Dev
      </button>
    </div>
  );
}

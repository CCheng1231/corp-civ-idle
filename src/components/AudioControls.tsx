import type { Dispatch } from "react";
import type { GameAction, GameState } from "../game/types";

interface AudioControlsProps {
  settings: GameState["settings"];
  dispatch: Dispatch<GameAction>;
}

export function AudioControls({ settings, dispatch }: AudioControlsProps) {
  const { masterVolume, musicMuted } = settings;

  return (
    <div className="audio-controls" aria-label="Music controls">
      <input
        type="range"
        className="audio-volume-slider"
        min={0}
        max={1}
        step={0.05}
        value={masterVolume}
        aria-label="Music volume"
        title={`Music volume ${Math.round(masterVolume * 100)}%`}
        onChange={(e) =>
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: { masterVolume: Number(e.target.value) },
          })
        }
      />
      <button
        type="button"
        className="audio-mute-btn"
        aria-label={musicMuted ? "Unmute music" : "Mute music"}
        aria-pressed={musicMuted}
        title={musicMuted ? "Unmute music" : "Mute music"}
        onClick={() =>
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: { musicMuted: !musicMuted },
          })
        }
      >
        {musicMuted ? <MutedIcon /> : <VolumeIcon />}
      </button>
    </div>
  );
}

function VolumeIcon() {
  return (
    <svg
      className="audio-icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.65-4.11v8.22A4.5 4.5 0 0 0 16.5 12zm2.65 0c0 1.77-.71 3.37-1.86 4.53l1.42 1.42A7.96 7.96 0 0 0 21 12c0-2.22-.9-4.23-2.29-5.69l-1.42 1.42A5.96 5.96 0 0 1 19.15 12z"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      className="audio-icon"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M3.63 3.63 2.22 5.04 7.19 10H3v4h4l5 5v-6.59l4.18 4.18a4.5 4.5 0 0 0 1.86-4.53l1.41 1.41A7.96 7.96 0 0 1 21 12c0-1.4-.36-2.72-1-3.88L19.15 12a5.96 5.96 0 0 1-1.5 2.65l1.42 1.42A7.96 7.96 0 0 0 21 12c0-2.22-.9-4.23-2.29-5.69l-1.42 1.42c.55.87.86 1.9.86 3.02 0 .62-.12 1.21-.34 1.75L16.5 12v6.59l-2.35-2.35L7 10.41V5l1.41 1.41-1.77 1.77L3.63 3.63z"
      />
    </svg>
  );
}

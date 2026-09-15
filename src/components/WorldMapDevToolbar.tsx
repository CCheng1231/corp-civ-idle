import type { Dispatch } from "react";
import type { AxialCoord, GameAction, GameSettings } from "../game/types";
import type { Z1RasterAlignment } from "../game/worldMapZ1Align";
import {
  defaultMapDevMovableLandmarkKey,
  mapDevLandmarkOptions,
  mapDevLayoutExportPayload,
} from "../game/mapDevLayout";
import { WorldMapDevNudgeControls } from "./WorldMapDevNudgeControls";

interface WorldMapDevToolbarProps {
  settings: GameSettings;
  dispatch: Dispatch<GameAction>;
  mapV01Band: number;
  z1RasterAlign: Z1RasterAlignment;
  onAdjustBakeScale: (delta: number) => void;
  inspectedHex: AxialCoord | null;
}

function downloadJson(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2);
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    /* ignore */
  }
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function WorldMapDevToolbar({
  settings,
  dispatch,
  mapV01Band,
  z1RasterAlign,
  onAdjustBakeScale,
  inspectedHex,
}: WorldMapDevToolbarProps) {
  const hexEdit = settings.mapDevHexEdit === true;
  const hexMode = settings.mapDevHexEditMode ?? "move";
  const selectedLandmark =
    settings.mapDevHexEditLandmark ?? defaultMapDevMovableLandmarkKey();

  function patch(partial: Partial<GameSettings>) {
    dispatch({ type: "UPDATE_SETTINGS", settings: partial });
  }

  return (
    <div className="world-map-dev-toolbar" role="group" aria-label="Map developer tools">
      {mapV01Band === 1 ? (
        <>
          <label className="world-map-z1-align-toggle">
            <input
              type="checkbox"
              checked={settings.mapZ1AlignDrag === true}
              onChange={(e) =>
                patch({
                  mapZ1AlignDrag: e.target.checked,
                  mapDevHexEdit: e.target.checked ? false : settings.mapDevHexEdit,
                })
              }
            />
            Drag Z1 bake
          </label>
          <div className="world-map-z1-scale-controls" role="group" aria-label="Z1 bake scale">
            <span className="world-map-z1-scale-label">
              Bake {Math.round(z1RasterAlign.scale * 100)}%
            </span>
            <button
              type="button"
              className="map-zoom-btn"
              aria-label="Shrink Z1 bake"
              onClick={() => onAdjustBakeScale(-0.03)}
            >
              −
            </button>
            <button
              type="button"
              className="map-zoom-btn"
              aria-label="Grow Z1 bake"
              onClick={() => onAdjustBakeScale(0.03)}
            >
              +
            </button>
            <span className="world-map-z1-scale-hint">Ctrl+wheel</span>
          </div>
          <label className="world-map-z1-align-toggle">
            <input
              type="checkbox"
              checked={settings.mapZ1AlignGuide === true}
              onChange={(e) => patch({ mapZ1AlignGuide: e.target.checked })}
            />
            Z1 align guide
          </label>
          <button
            type="button"
            className="world-map-z1-clear-markers"
            onClick={() =>
              downloadJson(
                "z1-layout-canonical.json",
                mapDevLayoutExportPayload(settings, z1RasterAlign),
              )
            }
          >
            Export layout JSON
          </button>
        </>
      ) : null}

      <label className="world-map-z1-align-toggle">
        <input
          type="checkbox"
          checked={hexEdit}
          onChange={(e) =>
            patch({
              mapDevHexEdit: e.target.checked,
              mapZ1AlignDrag: e.target.checked ? false : settings.mapZ1AlignDrag,
            })
          }
        />
        Edit hex layout
      </label>
      {hexEdit ? (
        <>
          <label className="world-map-dev-hex-mode">
            <span className="sr-only">Hex edit mode</span>
            <select
              value={hexMode}
              aria-label="Hex edit mode"
              onChange={(e) =>
                patch({
                  mapDevHexEditMode: e.target.value as "move" | "create",
                })
              }
            >
              <option value="move">Move landmark</option>
              <option value="create">Create hex</option>
            </select>
          </label>
          {hexMode === "move" ? (
            <label className="world-map-dev-hex-mode">
              <span className="sr-only">Landmark to move</span>
              <select
                value={selectedLandmark}
                aria-label="Landmark to move"
                onChange={(e) =>
                  patch({ mapDevHexEditLandmark: e.target.value })
                }
              >
                {mapDevLandmarkOptions().filter((o) => !o.locked).map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="world-map-z1-place-hint">
              Click map to add nearest hex
            </span>
          )}
          {hexMode === "move" ? (
            <span className="world-map-z1-place-hint">
              Drag landmark hex to new cell, or click destination · Alt+drag pans
            </span>
          ) : null}
          <button
            type="button"
            className="world-map-z1-clear-markers"
            onClick={() =>
              patch({
                mapDevLandmarkCoords: undefined,
                mapDevExtraHexes: undefined,
                mapDevHexNudges: undefined,
                mapDevHexNudgeTarget: undefined,
              })
            }
          >
            Reset hex edits
          </button>
        </>
      ) : null}

      <WorldMapDevNudgeControls
        settings={settings}
        dispatch={dispatch}
        inspectedHex={inspectedHex}
      />
    </div>
  );
}

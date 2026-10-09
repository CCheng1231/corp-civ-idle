import { useState } from "react";
import type { Dispatch } from "react";
import { saveGameState } from "../game/save";
import {
  clearWorldMapDevLayoutStore,
  isWorldMapDevLayoutSavedToLocalStore,
  settingsFromSavedWorldMapDevLayout,
  syncWorldMapDevLayoutFromSettings,
} from "../game/worldMapDevLayoutStore";
import type {
  GameAction,
  GameSettings,
  GameState,
  MapRegion,
} from "../game/types";
import { OnlineAccessError } from "../multiplayer/onlineAccess";
import { publishWorldMapDevLayout } from "../multiplayer/worldMapLayoutSync";
import { readSession } from "../multiplayer/session";
import type { OnlineSession } from "../multiplayer/types";
import { isDevAccount } from "../multiplayer/types";
import {
  defaultMapDevMovableLandmarkKey,
  mapDevLandmarkOptions,
  mapDevRegionBrushOptions,
} from "../game/mapDevLayout";

interface WorldMapDevToolbarProps {
  state: GameState;
  session?: OnlineSession | null;
  dispatch: Dispatch<GameAction>;
}

export function WorldMapDevToolbar({
  state,
  session,
  dispatch,
}: WorldMapDevToolbarProps) {
  const settings = state.settings;
  const [saveFlash, setSaveFlash] = useState<"idle" | "ok">("idle");
  const [pushFlash, setPushFlash] = useState<"idle" | "ok" | "err">("idle");
  const [pushError, setPushError] = useState<string | null>(null);
  const hexEdit = settings.mapDevHexEdit === true;
  const hexMode = settings.mapDevHexEditMode ?? "move";
  const selectedLandmark =
    settings.mapDevHexEditLandmark ?? defaultMapDevMovableLandmarkKey();
  const regionBrush = settings.mapDevRegionBrush ?? "countryside";

  function patch(partial: Partial<GameSettings>) {
    dispatch({ type: "UPDATE_SETTINGS", settings: partial });
  }

  function saveMapLayoutLocally() {
    syncWorldMapDevLayoutFromSettings(state.settings);
    saveGameState(state, session ?? state.onlineSession ?? null);
    setSaveFlash("ok");
    window.setTimeout(() => setSaveFlash("idle"), 2500);
  }

  async function pushMapLayoutToWorld() {
    setPushError(null);

    if (!isWorldMapDevLayoutSavedToLocalStore(state.settings)) {
      setPushError("Save layout first — you have unsaved map edits.");
      setPushFlash("err");
      return;
    }

    const publishSettings = settingsFromSavedWorldMapDevLayout(state.settings);

    const accountSession =
      session ?? state.onlineSession ?? readSession() ?? null;
    const accountId = accountSession?.accountId;
    if (!accountId || !isDevAccount(accountId)) {
      setPushError("Sign in as Tim or Chris to publish the shared map.");
      setPushFlash("err");
      return;
    }

    try {
      await publishWorldMapDevLayout(
        accountSession?.worldId ?? "dev",
        accountId,
        publishSettings,
      );
      setPushFlash("ok");
      window.setTimeout(() => setPushFlash("idle"), 2500);
    } catch (err) {
      const message =
        err instanceof OnlineAccessError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Publish failed";
      setPushError(message);
      setPushFlash("err");
    }
  }

  function resetHexEditsLocally() {
    clearWorldMapDevLayoutStore();
    patch({
      mapDevLandmarkCoords: undefined,
      mapDevExtraHexes: undefined,
      mapDevRegionOverrides: undefined,
    });
    const nextState = {
      ...state,
      settings: {
        ...state.settings,
        mapDevLandmarkCoords: undefined,
        mapDevExtraHexes: undefined,
        mapDevRegionOverrides: undefined,
      },
    };
    syncWorldMapDevLayoutFromSettings(nextState.settings);
    saveGameState(nextState, session ?? state.onlineSession ?? null);
    setSaveFlash("ok");
    window.setTimeout(() => setSaveFlash("idle"), 2500);
  }

  const saveLabel = saveFlash === "ok" ? "Saved" : "Save layout";
  const pushLabel =
    pushFlash === "ok"
      ? "Pushed"
      : pushFlash === "err"
        ? "Push failed"
        : "Push to world";

  return (
    <div className="world-map-dev-toolbar" role="group" aria-label="Map developer tools">
      <label className="world-map-z1-align-toggle">
        <input
          type="checkbox"
          checked={hexEdit}
          onChange={(e) => patch({ mapDevHexEdit: e.target.checked })}
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
                  mapDevHexEditMode: e.target.value as
                    | "move"
                    | "create"
                    | "region",
                })
              }
            >
              <option value="move">Move landmark</option>
              <option value="create">Create hex</option>
              <option value="region">Paint region</option>
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
                {mapDevLandmarkOptions()
                  .filter((o) => !o.locked)
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          {hexMode === "region" ? (
            <label className="world-map-dev-hex-mode">
              <span className="sr-only">Region to paint</span>
              <select
                value={regionBrush}
                aria-label="Region to paint"
                onChange={(e) =>
                  patch({
                    mapDevRegionBrush: e.target.value as MapRegion,
                  })
                }
              >
                {mapDevRegionBrushOptions().map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {hexMode === "create" ? (
            <span className="world-map-z1-place-hint">
              Click map to add nearest hex
            </span>
          ) : null}
          {hexMode === "move" ? (
            <span className="world-map-z1-place-hint">
              Drag or click destination · Alt+drag pans
            </span>
          ) : null}
          {hexMode === "region" ? (
            <span className="world-map-z1-place-hint">
              Click hex to paint · Shift+click clears override
            </span>
          ) : null}
          <button
            type="button"
            className="world-map-z1-clear-markers"
            onClick={() => resetHexEditsLocally()}
          >
            Reset hex edits
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="world-map-z1-clear-markers"
        onClick={() => saveMapLayoutLocally()}
      >
        {saveLabel}
      </button>
      <button
        type="button"
        className="world-map-z1-clear-markers"
        onClick={() => void pushMapLayoutToWorld()}
      >
        {pushLabel}
      </button>
      {pushError ? (
        <span className="world-map-z1-place-hint" role="alert">
          {pushError}
        </span>
      ) : (
        <span className="world-map-z1-place-hint">
          Save layout on this device, then Push to world for all players
        </span>
      )}
    </div>
  );
}

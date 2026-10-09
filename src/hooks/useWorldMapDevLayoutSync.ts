import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { GameAction } from "../game/types";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import { ensureFirebaseUser } from "../multiplayer/onlineAccess";
import {
  applyWorldMapLayoutDocToLocalCache,
  layoutSettingsPatchFromStore,
  loadWorldMapDevLayout,
  subscribeWorldMapDevLayout,
} from "../multiplayer/worldMapLayoutSync";
import type { WorldId } from "../multiplayer/types";

/**
 * Keeps map dev layout in sync with Firestore `worlds/dev/shared/mapLayout`
 * for every player (online guests + offline with Firebase binding).
 */
export function useWorldMapDevLayoutSync(
  dispatch: Dispatch<GameAction>,
  worldId: WorldId = "dev",
): void {
  const lastAppliedAtRef = useRef(0);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let unsub: (() => void) | undefined;
    let cancelled = false;

    function applyRemote(updatedAt: number, patch: ReturnType<typeof layoutSettingsPatchFromStore>) {
      if (updatedAt <= lastAppliedAtRef.current) return;
      lastAppliedAtRef.current = updatedAt;
      dispatch({
        type: "UPDATE_SETTINGS",
        settings: {
          mapDevLandmarkCoords: patch.mapDevLandmarkCoords,
          mapDevExtraHexes: patch.mapDevExtraHexes,
          mapDevRegionOverrides: patch.mapDevRegionOverrides,
          mapDevRegionBrush: patch.mapDevRegionBrush,
        },
      });
    }

    void (async () => {
      try {
        await ensureFirebaseUser();
        if (cancelled) return;

        const initial = await loadWorldMapDevLayout(worldId);
        if (initial && !cancelled) {
          applyWorldMapLayoutDocToLocalCache(initial);
          applyRemote(initial.updatedAt, layoutSettingsPatchFromStore(initial.layout));
        }

        unsub = subscribeWorldMapDevLayout(
          worldId,
          (doc) => {
            if (!doc) return;
            applyWorldMapLayoutDocToLocalCache(doc);
            applyRemote(doc.updatedAt, layoutSettingsPatchFromStore(doc.layout));
          },
          (err) => console.warn("World map layout sync error", err),
        );
      } catch (err) {
        console.warn("World map layout bootstrap skipped", err);
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [dispatch, worldId]);
}

import { useEffect, useRef } from "react";
import type { Dispatch } from "react";
import type { GameAction } from "../game/types";
import { isFirebaseConfigured } from "../multiplayer/firebase";
import { ensureFirebaseUser } from "../multiplayer/onlineAccess";
import {
  loadWorldMapDevLayout,
  subscribeWorldMapDevLayout,
} from "../multiplayer/worldMapLayoutSync";
import { setLatestSharedWorldMapLayout } from "../multiplayer/sharedWorldMap";
import type { WorldId } from "../multiplayer/types";

/**
 * Online: apply Firestore `worlds/dev/shared/mapLayout` (single source of truth).
 * Does not write browser-local map caches.
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

    function applyRemote(
      updatedAt: number,
      layout: Parameters<typeof setLatestSharedWorldMapLayout>[0],
    ) {
      if (updatedAt <= lastAppliedAtRef.current) return;
      lastAppliedAtRef.current = updatedAt;
      setLatestSharedWorldMapLayout(layout, updatedAt);
      dispatch({
        type: "SYNC_SHARED_WORLD_MAP_LAYOUT",
        layout,
      });
    }

    void (async () => {
      try {
        await ensureFirebaseUser();
        if (cancelled) return;

        const initial = await loadWorldMapDevLayout(worldId);
        if (initial && !cancelled) {
          applyRemote(initial.updatedAt, initial.layout);
        }

        unsub = subscribeWorldMapDevLayout(
          worldId,
          (doc) => {
            if (!doc) return;
            applyRemote(doc.updatedAt, doc.layout);
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

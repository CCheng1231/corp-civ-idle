import { useEffect, type Dispatch } from "react";
import { TICK_MS } from "../game/constants";
import type { GameAction } from "../game/types";

export function useGameLoop(dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    const tick = () => dispatch({ type: "TICK", now: Date.now() });

    const id = window.setInterval(tick, TICK_MS);

    const catchUp = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("focus", catchUp);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("focus", catchUp);
    };
  }, [dispatch]);
}

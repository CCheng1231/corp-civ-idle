import { useEffect, type Dispatch } from "react";
import { TICK_MS } from "../game/constants";
import type { GameAction } from "../game/types";

export function useGameLoop(dispatch: Dispatch<GameAction>) {
  useEffect(() => {
    const id = window.setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [dispatch]);
}

import { type Dispatch } from "react";
import { LocationOverview } from "./LocationOverview";
import type { GameAction, GameState } from "../game/types";

interface OperationsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function OperationsView({ state, dispatch }: OperationsViewProps) {
  return (
    <div className="main-view-panel">
      <header className="main-view-header">
        <h2>Office sites</h2>
        <p className="muted">
          Expand each location for staff summary, structure upgrades, and
          recruitment. Phase 1: grow the firm and win contracts on the map.
        </p>
      </header>
      <LocationOverview state={state} dispatch={dispatch} />
    </div>
  );
}

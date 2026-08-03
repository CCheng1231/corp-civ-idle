import { type Dispatch } from "react";
import { LocationSitePanel } from "./LocationSitePanel";
import { LocationViewHeader } from "./LocationViewHeader";
import type { GameAction, GameState } from "../game/types";

interface OperationsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function OperationsView({ state, dispatch }: OperationsViewProps) {
  const officeId = state.selectedOffice;

  return (
    <div className="main-view-panel location-view-panel">
      <LocationViewHeader
        title="Office sites"
        description="Site summary and structure upgrades. Queues, hiring, and research use the office selected here."
        state={state}
        dispatch={dispatch}
      />
      <div className="location-view-body">
        <LocationSitePanel
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      </div>
    </div>
  );
}

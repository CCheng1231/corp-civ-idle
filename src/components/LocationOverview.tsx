import { type Dispatch } from "react";
import { ownedOfficeIds } from "../game/mapWorld";
import { LocationSitePanel } from "./LocationSitePanel";
import type { GameAction, GameState } from "../game/types";

interface LocationOverviewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LocationOverview({ state, dispatch }: LocationOverviewProps) {
  return (
    <section className="location-overview">
      <p className="muted">
        Each office has collapsible sections for summary, structure upgrades,
        and recruitment. Hiring takes 1s per contractor and queues at that site.
      </p>
      <div className="location-sites-list">
        {ownedOfficeIds(state).map((officeId) => (
          <LocationSitePanel
            key={officeId}
            state={state}
            dispatch={dispatch}
            officeId={officeId}
          />
        ))}
      </div>
    </section>
  );
}

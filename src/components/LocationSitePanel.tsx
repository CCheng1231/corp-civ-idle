import { type Dispatch } from "react";
import { OfficeSiteSummary } from "./OfficeSiteSummary";
import { OfficeStructurePanel } from "./OfficeStructurePanel";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface LocationSitePanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
}

export function LocationSitePanel({
  state,
  dispatch,
  officeId,
}: LocationSitePanelProps) {
  return (
    <article className="location-site-block office-sites-panel">
      <OfficeStructurePanel
        state={state}
        dispatch={dispatch}
        officeId={officeId}
        siteSummary={
          <section className="office-site-capacity-section">
            <OfficeSiteSummary
              state={state}
              dispatch={dispatch}
              officeId={officeId}
            />
          </section>
        }
      />
    </article>
  );
}

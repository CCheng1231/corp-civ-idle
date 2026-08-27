import { type Dispatch } from "react";
import { LocationSitePanel } from "./LocationSitePanel";
import { LocationViewHeader } from "./LocationViewHeader";
import { TabPortraitLayout } from "./TabPortraitLayout";
import { tabQuote } from "../game/tabQuotes";
import officePortrait from "../assets/office.webp";
import type { GameAction, GameState } from "../game/types";

interface OperationsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Office sites — structure upgrades per HQ/Branch. */
export function OperationsView({ state, dispatch }: OperationsViewProps) {
  const officeId = state.selectedOffice;

  return (
    <div className="main-view-panel location-view-panel portrait-lock-page">
      <div className="location-view-body portrait-lock-layout-body">
        <TabPortraitLayout
          src={officePortrait}
          storageKey="corp-civ-idle-operations-portrait-size"
          defaultLargeOnDesktop
          quote={tabQuote(state, "office")}
          portraitLayout="fixed"
          parallaxScroll={false}
          portraitLocked
          className="tab-portrait-vertical-layout portrait-lock-tab"
        >
          <div className="portrait-lock-split-right">
            <div className="portrait-lock-frozen-header">
              <LocationViewHeader
                title="Office sites"
                description="Site summary and structure upgrades. Queues, hiring, and research use the office selected here."
                state={state}
                dispatch={dispatch}
              />
            </div>
            <div className="portrait-lock-scroll-body">
              <LocationSitePanel
                state={state}
                dispatch={dispatch}
                officeId={officeId}
              />
            </div>
          </div>
        </TabPortraitLayout>
      </div>
    </div>
  );
}

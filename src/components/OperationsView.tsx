import { type Dispatch } from "react";
import { LocationSitePanel } from "./LocationSitePanel";
import { LocationViewHeader } from "./LocationViewHeader";
import {
  DUAL_PORTRAIT_TAB_PROPS,
  TabPortraitLayout,
  dualPortraitTabClass,
  portraitLockBodyClass,
  portraitLockPageClass,
  useTabPortraitSize,
} from "./TabPortraitLayout";
import { tabQuote } from "../game/tabQuotes";
import officePortrait from "../assets/office.jpg";
import type { GameAction, GameState } from "../game/types";

interface OperationsViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Nav: Office sites — structure upgrades per HQ/Branch. */
export function OperationsView({ state, dispatch }: OperationsViewProps) {
  const officeId = state.selectedOffice;
  const portraitStorageKey = "corp-civ-idle-operations-portrait-size";
  const { portraitSize, setPortraitSize, portraitLarge } = useTabPortraitSize(
    portraitStorageKey,
    false,
  );

  return (
    <div
      className={`main-view-panel location-view-panel ${portraitLockPageClass(portraitLarge)}`}
    >
      {portraitLarge ? (
        <LocationViewHeader
          title="Office sites"
          description="Site summary and structure upgrades. Queues, hiring, and research use the office selected here."
          state={state}
          dispatch={dispatch}
        />
      ) : null}
      <div
        className={`location-view-body ${portraitLockBodyClass(portraitLarge)}`}
      >
        <TabPortraitLayout
          src={officePortrait}
          storageKey={portraitStorageKey}
          portraitSize={portraitSize}
          onPortraitSizeChange={setPortraitSize}
          quote={tabQuote(state, "office")}
          {...DUAL_PORTRAIT_TAB_PROPS}
          className={dualPortraitTabClass(portraitLarge)}
        >
          {portraitLarge ? (
            <LocationSitePanel
              state={state}
              dispatch={dispatch}
              officeId={officeId}
            />
          ) : (
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
          )}
        </TabPortraitLayout>
      </div>
    </div>
  );
}

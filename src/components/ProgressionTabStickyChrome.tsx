import { type Dispatch } from "react";
import {
  TabSiteHeader,
  type HomeHubTab,
  type SecretaryHubTab,
} from "./TabSiteHeader";
import type { GameAction, GameState } from "../game/types";

type ProgressionTabStickyChromeProps = {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /** Info dialog — home hub tabs require it; secretary tabs optional (e.g. Gov't Prog). */
  onInfo?: () => void;
} & (
  | {
      homeHubTab: HomeHubTab;
      secretaryHubTab?: never;
    }
  | {
      homeHubTab?: never;
      secretaryHubTab: SecretaryHubTab;
    }
);

export function ProgressionTabStickyChrome(props: ProgressionTabStickyChromeProps) {
  const { state, dispatch } = props;

  return (
    <div className="progression-tab-sticky-chrome">
      <div className="progression-tab-sticky-info-slot">
        {props.onInfo ? (
          <button
            type="button"
            className="office-collapse-all office-catalog-toolbar-chip progression-tab-sticky-info"
            onClick={props.onInfo}
            aria-haspopup="dialog"
          >
            Info
          </button>
        ) : null}
      </div>
      <TabSiteHeader
        homeHubTab={props.homeHubTab}
        secretaryHubTab={props.secretaryHubTab}
        state={state}
        dispatch={dispatch}
      />
    </div>
  );
}

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
  const hasInfo = Boolean(props.onInfo);

  return (
    <div
      className={[
        "progression-tab-sticky-chrome",
        "progression-tab-sticky-chrome--compact-hub",
        hasInfo ? null : "progression-tab-sticky-chrome--no-info",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasInfo ? (
        <div className="progression-tab-sticky-info-slot">
          <button
            type="button"
            className="office-collapse-all office-catalog-toolbar-chip progression-tab-sticky-info"
            onClick={props.onInfo}
            aria-haspopup="dialog"
          >
            Info
          </button>
        </div>
      ) : null}
      <div className="progression-tab-sticky-portrait-slot" aria-hidden="true" />
      <div className="progression-tab-sticky-chrome-main">
        <TabSiteHeader
          homeHubTab={props.homeHubTab}
          secretaryHubTab={props.secretaryHubTab}
          state={state}
          dispatch={dispatch}
        />
      </div>
    </div>
  );
}

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
  const sectionPrefs = state.settings.officeSiteSections[officeId];

  function setStructuresOpen(open: boolean) {
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        officeSiteSections: {
          ...state.settings.officeSiteSections,
          [officeId]: {
            ...sectionPrefs,
            structuresOpen: open,
          },
        },
      },
    });
  }

  return (
    <article className="location-site-block">
      <details className="office-site-section" open>
        <summary>Summary</summary>
        <OfficeSiteSummary state={state} dispatch={dispatch} officeId={officeId} />
      </details>

      <details
        className="office-site-section"
        open={sectionPrefs.structuresOpen}
        onToggle={(e) =>
          setStructuresOpen((e.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>Structure upgrades</summary>
        <OfficeStructurePanel
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      </details>
    </article>
  );
}

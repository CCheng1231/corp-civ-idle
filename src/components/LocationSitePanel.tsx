import { type Dispatch } from "react";
import { OFFICE_LABELS } from "../game/constants";
import { OfficeRecruitmentPanel } from "./OfficeRecruitmentPanel";
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
  const selected = state.selectedOffice === officeId;
  const sectionPrefs = state.settings.officeSiteSections[officeId];

  function setSectionOpen(
    key: "structuresOpen" | "recruitmentOpen",
    open: boolean,
  ) {
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        officeSiteSections: {
          ...state.settings.officeSiteSections,
          [officeId]: {
            ...sectionPrefs,
            [key]: open,
          },
        },
      },
    });
  }

  return (
    <article
      className={`location-site-block${selected ? " location-site-block-selected" : ""}`}
    >
      <header className="location-site-block-head">
        <button
          type="button"
          className="location-site-select"
          onClick={() => dispatch({ type: "SELECT_OFFICE", officeId })}
        >
          {OFFICE_LABELS[officeId]}
          {selected && <span className="location-site-active-tag">Selected</span>}
        </button>
      </header>

      <details className="office-site-section" open>
        <summary>Summary</summary>
        <OfficeSiteSummary state={state} dispatch={dispatch} officeId={officeId} />
      </details>

      <details
        className="office-site-section"
        open={sectionPrefs.structuresOpen}
        onToggle={(e) =>
          setSectionOpen(
            "structuresOpen",
            (e.currentTarget as HTMLDetailsElement).open,
          )
        }
      >
        <summary>Structure upgrades</summary>
        <OfficeStructurePanel
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      </details>

      <details
        className="office-site-section"
        open={sectionPrefs.recruitmentOpen}
        onToggle={(e) =>
          setSectionOpen(
            "recruitmentOpen",
            (e.currentTarget as HTMLDetailsElement).open,
          )
        }
      >
        <summary>Recruitment</summary>
        <OfficeRecruitmentPanel
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      </details>
    </article>
  );
}

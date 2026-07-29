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

      <details className="office-site-section">
        <summary>Structure upgrades</summary>
        <OfficeStructurePanel
          state={state}
          dispatch={dispatch}
          officeId={officeId}
        />
      </details>

      <details className="office-site-section">
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

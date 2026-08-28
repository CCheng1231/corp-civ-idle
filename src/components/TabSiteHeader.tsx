import { type Dispatch, type ReactNode } from "react";
import { allOfficesOptionAvailable } from "../game/officeSelection";
import { overviewOfficeOptions } from "../game/mapWorld";
import type { GameAction, GameState, OfficeSelectionId } from "../game/types";

interface TabSiteHeaderProps {
  title: string;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  titleExtra?: ReactNode;
}

export function TabSiteHeader({
  title,
  state,
  dispatch,
  titleExtra,
}: TabSiteHeaderProps) {
  const officeOptions = overviewOfficeOptions(state);
  const officeId = state.selectedOffice;
  const selectedOption = officeOptions.find(
    (option) => option.id === officeId,
  );

  return (
    <header className="main-view-header location-view-header tab-hero-header">
      <div
        className={`tab-hero-header-row tab-title-row${titleExtra ? " tab-title-extra-row" : ""}`}
      >
        <h2>{title}</h2>
        {titleExtra}
      </div>
      <div className="tab-hero-header-row tab-office-row">
        <span className="location-office-picker-label">Office</span>
        <select
          className="location-office-select tab-office-select"
          value={officeId}
          aria-label="Office"
          onChange={(e) =>
            dispatch({
              type: "SELECT_OFFICE",
              officeId: e.target.value as OfficeSelectionId,
            })
          }
        >
          {allOfficesOptionAvailable(state) ? (
            <option value="all">All offices</option>
          ) : null}
          {officeOptions.map((option) => (
            <option
              key={option.id}
              value={option.id}
              disabled={!option.available}
            >
              {option.label}
              {!option.available ? " (not open)" : ""}
            </option>
          ))}
        </select>
      </div>
      {selectedOption?.hint ? (
        <p className="muted location-office-hint">{selectedOption.hint}</p>
      ) : null}
    </header>
  );
}

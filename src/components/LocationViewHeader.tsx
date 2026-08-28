import { type Dispatch, type ReactNode } from "react";
import { allOfficesOptionAvailable } from "../game/officeSelection";
import { overviewOfficeOptions } from "../game/mapWorld";
import type { GameAction, GameState, OfficeSelectionId } from "../game/types";

interface LocationViewHeaderProps {
  title: string;
  description?: ReactNode;
  belowTitle?: ReactNode;
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LocationViewHeader({
  title,
  description,
  belowTitle,
  state,
  dispatch,
}: LocationViewHeaderProps) {
  const officeOptions = overviewOfficeOptions(state);
  const officeId = state.selectedOffice;
  const selectedOption = officeOptions.find((option) => option.id === officeId);
  const stacked = Boolean(belowTitle);

  const officeSelect = (
    <label className="location-office-picker">
      <span className="location-office-picker-label">Office</span>
      <select
        className="location-office-select"
        value={officeId}
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
    </label>
  );

  return (
    <header
      className={`main-view-header location-view-header${stacked ? " location-view-header-stacked" : ""}`}
    >
      {stacked ? (
        <>
          <div className="location-view-header-copy">
            <h2>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          {belowTitle}
          {officeSelect}
        </>
      ) : (
        <div className="location-view-header-row">
          <div className="location-view-header-copy">
            <h2>{title}</h2>
            {description ? <p className="muted">{description}</p> : null}
          </div>
          {officeSelect}
        </div>
      )}
      {selectedOption?.hint && (
        <p className="muted location-office-hint">{selectedOption.hint}</p>
      )}
    </header>
  );
}

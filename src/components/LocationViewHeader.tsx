import { type Dispatch, type ReactNode } from "react";
import { overviewOfficeOptions } from "../game/mapWorld";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface LocationViewHeaderProps {
  title: string;
  description: ReactNode;
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LocationViewHeader({
  title,
  description,
  state,
  dispatch,
}: LocationViewHeaderProps) {
  const officeOptions = overviewOfficeOptions(state);
  const officeId = state.selectedOffice;
  const selectedOption = officeOptions.find((option) => option.id === officeId);

  return (
    <header className="main-view-header location-view-header">
      <div className="location-view-header-row">
        <div className="location-view-header-copy">
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <label className="location-office-picker">
          <span className="location-office-picker-label">Office</span>
          <select
            className="location-office-select"
            value={officeId}
            onChange={(e) =>
              dispatch({
                type: "SELECT_OFFICE",
                officeId: e.target.value as OfficeLocationId,
              })
            }
          >
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
      </div>
      {selectedOption?.hint && (
        <p className="muted location-office-hint">{selectedOption.hint}</p>
      )}
    </header>
  );
}

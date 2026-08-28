import { type Dispatch } from "react";
import { OfficeStructurePanel } from "./OfficeStructurePanel";
import { officeDisplayName } from "../game/mapWorld";
import type { GameAction, GameState, OfficeLocationId } from "../game/types";

interface LocationSitePanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  officeId: OfficeLocationId;
  showBuildQueue?: boolean;
  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  readOnly?: boolean;
}

export function LocationSitePanel({
  state,
  dispatch,
  officeId,
  showBuildQueue = true,
  hideCompleted,
  onHideCompletedChange,
  readOnly = false,
}: LocationSitePanelProps) {
  const officeLabel = officeDisplayName(state, officeId);

  return (
    <article className="office-sites-panel">
      {readOnly ? (
        <p className="muted office-catalog-readonly-note">
          Viewing {officeLabel} — pick an office to upgrade.
        </p>
      ) : null}
      <OfficeStructurePanel
        state={state}
        dispatch={dispatch}
        officeId={officeId}
        showBuildQueue={showBuildQueue}
        hideCompleted={hideCompleted}
        onHideCompletedChange={onHideCompletedChange}
        readOnly={readOnly}
      />
    </article>
  );
}

import type { Dispatch, ReactNode } from "react";
import type { ProgressionLockNavTarget } from "../game/progressionLockNav";
import type { GameAction } from "../game/types";
import { ProgressionLockRequirements } from "./ProgressionLockRequirements";

interface ProgressionCardPortraitColumnProps {
  portrait: ReactNode;
  lockLines: ProgressionLockNavTarget[];
  dispatch: Dispatch<GameAction>;
  /** When true and lockLines is non-empty, show overlay links on the portrait. */
  showLockOverlay: boolean;
}

/** Left portrait strip + optional lock-requirement overlay (Build / Research / Recruit cards). */
export function ProgressionCardPortraitColumn({
  portrait,
  lockLines,
  dispatch,
  showLockOverlay,
}: ProgressionCardPortraitColumnProps) {
  const overlay = showLockOverlay && lockLines.length > 0;
  return (
    <div
      className={`recruitment-card-portrait-column${
        overlay ? " recruitment-card-portrait-column--lock" : ""
      }`}
    >
      {portrait}
      {overlay ? (
        <ProgressionLockRequirements
          lines={lockLines}
          dispatch={dispatch}
          placement="portrait-overlay"
        />
      ) : null}
    </div>
  );
}

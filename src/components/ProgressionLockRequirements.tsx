import type { Dispatch } from "react";
import type { ProgressionLockNavTarget } from "../game/progressionLockNav";
import type { GameAction } from "../game/types";

interface ProgressionLockRequirementsProps {
  lines: ProgressionLockNavTarget[];
  dispatch: Dispatch<GameAction>;
  /** Requirement links over the roster/scene portrait strip. */
  placement?: "default" | "portrait-overlay";
}

function lockRequirementsClassName(
  placement: ProgressionLockRequirementsProps["placement"],
): string {
  return placement === "portrait-overlay"
    ? "progression-lock-requirements progression-lock-requirements--portrait-overlay"
    : "progression-lock-requirements";
}

function navigateToLockTarget(
  dispatch: Dispatch<GameAction>,
  target: ProgressionLockNavTarget,
) {
  if (target.kind === "research") {
    dispatch({
      type: "SET_VIEW",
      view: "research",
      researchFocusResearchId: target.researchId,
    });
    return;
  }
  dispatch({
    type: "SET_VIEW",
    view: "operations",
    structureFocusStructureId: target.structureId,
  });
}

export function ProgressionLockRequirements({
  lines,
  dispatch,
  placement = "default",
}: ProgressionLockRequirementsProps) {
  if (lines.length === 0) return null;

  return (
    <div className={lockRequirementsClassName(placement)}>
      <span className="progression-lock-requirements-label">Requires:</span>
      <ul className="progression-lock-requirements-list">
        {lines.map((line) => (
          <li
            key={`${line.kind}-${line.kind === "research" ? line.researchId : line.structureId}`}
          >
            <button
              type="button"
              className="progression-lock-requirements-link"
              onClick={() => navigateToLockTarget(dispatch, line)}
            >
              {line.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

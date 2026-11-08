import type { RecruitmentUnitDefinition } from "../game/recruitmentData";
import type { UnitAssignment, UnitId } from "../game/types";

interface UnitCountPickerProps {
  units: readonly RecruitmentUnitDefinition[];
  maxForUnit: (unitId: UnitId) => number;
  assignment: UnitAssignment;
  disabled?: boolean;
  onChange: (next: UnitAssignment) => void;
  onRecruitClick?: (unitId: UnitId) => void;
}

export function UnitCountPicker({
  units,
  maxForUnit,
  assignment,
  disabled,
  onChange,
  onRecruitClick,
}: UnitCountPickerProps) {
  function setUnitCount(unitId: UnitId, raw: number) {
    const max = maxForUnit(unitId);
    const count = Math.max(0, Math.min(max, Math.floor(raw) || 0));
    const next = { ...assignment };
    if (count <= 0) {
      delete next[unitId];
    } else {
      next[unitId] = count;
    }
    onChange(next);
  }

  function adjustUnitCount(unitId: UnitId, delta: number) {
    const current = assignment[unitId] ?? 0;
    setUnitCount(unitId, current + delta);
  }

  return (
    <div className="mission-crew-picker">
      <ul className="mission-crew-unit-list">
        {units.map((unit) => {
          const available = maxForUnit(unit.id);
          const value = assignment[unit.id] ?? 0;
          const controlsDisabled = disabled || available <= 0;
          return (
            <li
              key={unit.id}
              className={`mission-crew-unit-row${
                available <= 0 ? " is-empty" : ""
              }`}
            >
              {onRecruitClick ? (
                <button
                  type="button"
                  className="btn linkish mission-crew-unit-link"
                  aria-label={`Recruit ${unit.name}`}
                  title={`Open Recruit tab — ${unit.name}`}
                  onClick={() => onRecruitClick(unit.id)}
                >
                  {unit.name}
                </button>
              ) : (
                <span className="mission-crew-unit-link">{unit.name}</span>
              )}
              <div
                className="mission-crew-unit-controls"
                role="group"
                aria-label={`Assign ${unit.name}`}
              >
                <button
                  type="button"
                  className="mission-crew-step-btn"
                  aria-label={`Decrease ${unit.name}`}
                  disabled={controlsDisabled || value <= 0}
                  onClick={() => adjustUnitCount(unit.id, -1)}
                >
                  −
                </button>
                <input
                  type="number"
                  className="mission-crew-unit-count"
                  min={0}
                  max={available}
                  inputMode="numeric"
                  value={value}
                  disabled={controlsDisabled}
                  aria-label={`Assigned ${unit.name}`}
                  onChange={(e) =>
                    setUnitCount(unit.id, Number(e.target.value))
                  }
                />
                <button
                  type="button"
                  className="mission-crew-step-btn"
                  aria-label={`Increase ${unit.name}`}
                  disabled={controlsDisabled || value >= available}
                  onClick={() => adjustUnitCount(unit.id, 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="mission-crew-max-btn"
                  aria-label={`Assign all available ${unit.name}`}
                  disabled={controlsDisabled || value >= available}
                  onClick={() => setUnitCount(unit.id, available)}
                >
                  Max
                </button>
                <span className="muted mission-crew-available">/ {available}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

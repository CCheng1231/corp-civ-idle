import { type Dispatch } from "react";
import { formatResourceCost, rosterAt } from "../game/constants";
import { jobDefinitionById } from "../game/jobs";
import {
  DEFAULT_TIER1_UNIT,
  RECRUITMENT_UNITS,
} from "../game/recruitmentData";
import { unitDefinition, unitsInCategory } from "../game/unitEffects";
import type {
  GameAction,
  JobDefinition,
  OfficeLocationId,
  UnitAssignment,
  UnitId,
} from "../game/types";

interface MissionCrewPickerProps {
  officeId: OfficeLocationId;
  job: JobDefinition;
  roster: ReturnType<typeof rosterAt>;
  assignment: UnitAssignment;
  disabled?: boolean;
  dispatch: Dispatch<GameAction>;
  onChange: (next: UnitAssignment) => void;
}

export function MissionCrewPicker({
  officeId: _officeId,
  job,
  roster,
  assignment,
  disabled,
  dispatch,
  onChange,
}: MissionCrewPickerProps) {
  const tier1Job = job.tier === 1;
  const units = tier1Job
    ? [unitDefinition(DEFAULT_TIER1_UNIT[job.requiredCategory])]
    : unitsInCategory(job.requiredCategory).filter(
        (unit) => unit.tier >= job.minUnitTier,
      );

  function setUnitCount(unitId: UnitId, raw: number) {
    const max = roster[unitId] ?? 0;
    const count = Math.max(0, Math.min(max, Math.floor(raw) || 0));
    const next = { ...assignment };
    if (count <= 0) {
      delete next[unitId];
    } else {
      next[unitId] = count;
    }
    onChange(next);
  }

  function openRecruitment(unitId: UnitId) {
    dispatch({
      type: "SET_VIEW",
      view: "recruitment",
      recruitFocusUnitId: unitId,
    });
  }

  return (
    <div className="mission-crew-picker">
      <ul className="mission-crew-unit-list">
        {units.map((unit) => {
          const available = roster[unit.id] ?? 0;
          const value = assignment[unit.id] ?? 0;
          return (
            <li
              key={unit.id}
              className={`mission-crew-unit-row${
                available <= 0 ? " is-empty" : ""
              }`}
            >
              <button
                type="button"
                className="btn linkish mission-crew-unit-link"
                onClick={() => openRecruitment(unit.id)}
              >
                {unit.name}
              </button>
              <label className="mission-crew-unit-input">
                <input
                  type="number"
                  min={0}
                  max={available}
                  value={value}
                  disabled={disabled || available <= 0}
                  aria-label={`Assign ${unit.name}`}
                  onChange={(e) =>
                    setUnitCount(unit.id, Number(e.target.value))
                  }
                />
                <span className="muted">/ {available}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function emptyAssignmentForJob(
  definitionId: string,
  roster: ReturnType<typeof rosterAt>,
  existing: Record<string, UnitAssignment> | undefined,
  postingId: string,
): UnitAssignment {
  if (existing?.[postingId]) return { ...existing[postingId] };
  let job: JobDefinition;
  try {
    job = jobDefinitionById(definitionId);
  } catch {
    job = { requiredCategory: "farming", minUnitTier: 1, tier: 1 } as JobDefinition;
  }
  if (job.tier === 1) {
    const unitId = DEFAULT_TIER1_UNIT[job.requiredCategory];
    if ((roster[unitId] ?? 0) > 0) return { [unitId]: 1 };
    return {};
  }
  const eligible = unitsInCategory(job.requiredCategory).filter(
    (def) => def.tier >= job.minUnitTier && (roster[def.id] ?? 0) > 0,
  );
  if (eligible[0]) return { [eligible[0].id]: 1 };
  return {};
}

/** @deprecated Use emptyAssignmentForJob */
export function emptyAssignmentForProject(
  projectId: string,
  roster: ReturnType<typeof rosterAt>,
  existing?: Record<string, UnitAssignment>,
): UnitAssignment {
  return emptyAssignmentForJob(projectId, roster, existing, projectId);
}

export function formatUnitName(unitId: UnitId): string {
  return unitDefinition(unitId).name;
}

export function formatUnitCost(cost: ReturnType<typeof unitDefinition>["cost"]) {
  return formatResourceCost(cost);
}

export { RECRUITMENT_UNITS };

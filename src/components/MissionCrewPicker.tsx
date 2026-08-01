import {
  CONTRACTOR_TYPES,
  countInCategory,
  formatNumber,
  rosterAt,
} from "../game/constants";
import {
  assignmentMeetsJobRequirements,
  jobDefinitionById,
  returnPerHour,
} from "../game/jobs";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import {
  canAssignFromRoster,
  totalAssigned,
  unitDefinition,
  unitsInCategory,
} from "../game/unitEffects";
import type {
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
  onChange: (next: UnitAssignment) => void;
}

export function MissionCrewPicker({
  officeId,
  job,
  roster,
  assignment,
  disabled,
  onChange,
}: MissionCrewPickerProps) {
  const valid =
    canAssignFromRoster(roster, assignment) &&
    assignmentMeetsJobRequirements(assignment, job);
  const units = unitsInCategory(job.requiredCategory).filter(
    (unit) => unit.tier >= job.minUnitTier,
  );
  const typeDef = CONTRACTOR_TYPES.find((t) => t.id === job.requiredCategory);
  const assigned = totalAssigned(assignment);
  const availableInCategory = countInCategory(roster, job.requiredCategory);

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

  return (
    <div className="mission-crew-picker">
      <p className="cost-line">
        Assign {job.requiredCategory} units (tier {job.minUnitTier}+) from{" "}
        {officeId.toUpperCase()}. Total job value is hidden — size band is a
        hint only.
      </p>
      <div className="mission-crew-group">
        <h4>
          {typeDef?.role ?? job.requiredCategory}{" "}
          <span className="muted">
            ({assigned} assigned · {availableInCategory} available)
          </span>
        </h4>
        <ul className="mission-crew-unit-list">
          {units.map((unit) => {
            const available = roster[unit.id] ?? 0;
            if (available <= 0) return null;
            const value = assignment[unit.id] ?? 0;
            return (
              <li key={unit.id} className="mission-crew-unit-row">
                <div className="mission-crew-unit-meta">
                  <strong>{unit.name}</strong>
                  <span className="muted">T{unit.tier}</span>
                  <small className="cost-line">{unit.proposedRole}</small>
                </div>
                <label className="mission-crew-unit-input">
                  Assign
                  <input
                    type="number"
                    min={0}
                    max={available}
                    value={value}
                    disabled={disabled}
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
      <p className="cost-line">
        Crew: {assigned} units · Preview ~$
        {formatNumber(returnPerHour(job, assigned))}/hr
        {!valid && assigned > 0 && (
          <>
            {" "}
            · <span className="structure-blocker">Invalid unit mix</span>
          </>
        )}
        {assigned <= 0 && (
          <>
            {" "}
            · <span className="structure-blocker">Assign at least 1 unit</span>
          </>
        )}
      </p>
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
    job = { requiredCategory: "farming", minUnitTier: 1 } as JobDefinition;
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
  return Object.entries(cost)
    .map(([k, v]) =>
      k === "electricity"
        ? `power ${formatNumber(v ?? 0)}`
        : `${k} ${formatNumber(v ?? 0)}`,
    )
    .join(" · ");
}

export { RECRUITMENT_UNITS };

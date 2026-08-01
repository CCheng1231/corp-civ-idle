import {
  CONTRACTOR_TYPES,
  countInCategory,
  formatNumber,
  rosterAt,
} from "../game/constants";
import { optimalCrewForProject, towerById } from "../game/mapWorld";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import {
  canAssignFromRoster,
  farmingAssigned,
  previewMissionModifiers,
  unitDefinition,
  unitsInCategory,
} from "../game/unitEffects";
import type {
  ContractorCategoryId,
  OfficeLocationId,
  ProjectDefinition,
  UnitAssignment,
  UnitId,
} from "../game/types";

const CATEGORY_ORDER: ContractorCategoryId[] = [
  "farming",
  "support",
  "defense",
  "intel",
];

interface MissionCrewPickerProps {
  officeId: OfficeLocationId;
  project: ProjectDefinition;
  roster: ReturnType<typeof rosterAt>;
  assignment: UnitAssignment;
  disabled?: boolean;
  onChange: (next: UnitAssignment) => void;
}

export function MissionCrewPicker({
  officeId,
  project,
  roster,
  assignment,
  disabled,
  onChange,
}: MissionCrewPickerProps) {
  const tower = towerById(project.towerId);
  const optimalCrew = optimalCrewForProject(tower, project);
  const preview = previewMissionModifiers(assignment, project, optimalCrew);
  const valid = canAssignFromRoster(roster, assignment);

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
        Assign units from {officeId.toUpperCase()}. Need at least 1 farming
        crew. Optimal field crew is hidden — unit mix changes payout and
        duration.
      </p>
      {CATEGORY_ORDER.map((category) => {
        const typeDef = CONTRACTOR_TYPES.find((t) => t.id === category);
        const units = unitsInCategory(category);
        const assignedInCategory = units.reduce(
          (sum, def) => sum + (assignment[def.id] ?? 0),
          0,
        );
        const availableInCategory = countInCategory(roster, category);
        if (availableInCategory <= 0 && assignedInCategory <= 0) return null;

        return (
          <div key={category} className="mission-crew-group">
            <h4>
              {typeDef?.role ?? category}{" "}
              <span className="muted">
                ({assignedInCategory} assigned · {availableInCategory} available)
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
        );
      })}
      <p className="cost-line">
        Field crew: {farmingAssigned(assignment)} · Preview duration{" "}
        {preview.durationSec}s · Preview payout {preview.payoutPercent}%
        {!valid && (
          <>
            {" "}
            · <span className="structure-blocker">Need ≥1 farming unit</span>
          </>
        )}
      </p>
    </div>
  );
}

export function emptyAssignmentForProject(
  projectId: string,
  roster: ReturnType<typeof rosterAt>,
  existing?: Record<string, UnitAssignment>,
): UnitAssignment {
  if (existing?.[projectId]) return { ...existing[projectId] };
  const fresh = roster.fresh_graduate ?? 0;
  if (fresh > 0) return { fresh_graduate: 1 };
  const firstFarming = unitsInCategory("farming").find(
    (def) => (roster[def.id] ?? 0) > 0,
  );
  if (firstFarming) return { [firstFarming.id]: 1 };
  return {};
}

/** Used by roster summaries. */
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

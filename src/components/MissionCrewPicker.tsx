import { type Dispatch } from "react";
import { rosterAt } from "../game/constants";
import { jobDefinitionById } from "../game/jobs";
import { requiredMinUnitTierForJob } from "../game/jobUnitTier";
import { unitsInCategory } from "../game/unitEffects";
import type {
  GameAction,
  JobDefinition,
  OfficeLocationId,
  UnitAssignment,
  UnitId,
} from "../game/types";
import { UnitCountPicker } from "./UnitCountPicker";

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
  const minUnitTier = requiredMinUnitTierForJob(job);
  const units = unitsInCategory(job.requiredCategory).filter(
    (unit) => unit.tier >= minUnitTier,
  );

  function openRecruitment(unitId: UnitId) {
    dispatch({
      type: "SET_VIEW",
      view: "recruitment",
      recruitFocusUnitId: unitId,
    });
  }

  return (
    <UnitCountPicker
      units={units}
      maxForUnit={(unitId) => roster[unitId] ?? 0}
      assignment={assignment}
      disabled={disabled}
      onChange={onChange}
      onRecruitClick={openRecruitment}
    />
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
  const minUnitTier = requiredMinUnitTierForJob(job);
  const eligible = unitsInCategory(job.requiredCategory).filter(
    (def) => def.tier >= minUnitTier && (roster[def.id] ?? 0) > 0,
  );
  if (eligible[0]) return { [eligible[0].id]: 1 };
  return {};
}

import { type Dispatch } from "react";
import { rosterAt } from "../game/constants";
import { jobDefinitionForPosting, postingById } from "../game/jobs";
import { requiredMinUnitTierForJob } from "../game/jobUnitTier";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type {
  GameAction,
  GameState,
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
  compactLayout?: boolean;
  coachQtyAnchorUnitId?: UnitId;
}

export function MissionCrewPicker({
  officeId: _officeId,
  job,
  roster,
  assignment,
  disabled,
  dispatch,
  onChange,
  compactLayout,
  coachQtyAnchorUnitId,
}: MissionCrewPickerProps) {
  const minUnitTier = requiredMinUnitTierForJob(job);
  const units = RECRUITMENT_UNITS.filter(
    (unit) =>
      unit.id !== "branch_manager" &&
      unit.tier >= minUnitTier &&
      (roster[unit.id] ?? 0) > 0,
  );

  function openRecruitment(unitId: UnitId) {
    dispatch({
      type: "SET_VIEW",
      view: "recruitment",
      recruitFocusUnitId: unitId,
    });
  }

  if (units.length === 0) {
    return (
      <p className="muted mission-crew-empty">
        No units available at this office — recruit staff or wait for crews to
        return.
      </p>
    );
  }

  return (
    <UnitCountPicker
      units={units}
      maxForUnit={(unitId) => roster[unitId] ?? 0}
      assignment={assignment}
      disabled={disabled}
      onChange={onChange}
      onRecruitClick={openRecruitment}
      compactLayout={compactLayout}
      coachQtyAnchorUnitId={coachQtyAnchorUnitId}
    />
  );
}

export function emptyAssignmentForJob(
  state: GameState,
  postingId: string,
  roster: ReturnType<typeof rosterAt>,
  existing: Record<string, UnitAssignment> | undefined,
): UnitAssignment {
  if (existing?.[postingId]) return { ...existing[postingId] };
  const posting = postingById(state, postingId);
  let job: JobDefinition;
  try {
    job = posting
      ? jobDefinitionForPosting(posting)
      : ({ minUnitTier: 1, tier: 1 } as JobDefinition);
  } catch {
    job = { minUnitTier: 1, tier: 1 } as JobDefinition;
  }
  const minUnitTier = requiredMinUnitTierForJob(job);
  const eligible = RECRUITMENT_UNITS.filter(
    (def) => def.tier >= minUnitTier && (roster[def.id] ?? 0) > 0,
  );
  if (eligible[0]) return { [eligible[0].id]: 1 };
  return {};
}
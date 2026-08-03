import { type Dispatch } from "react";
import { formatNumber, rosterAt } from "../game/constants";
import {
  BUSINESS_TYPE_LABELS,
  COMPLETION_BAND_RANK,
  completionBand,
  completionBandLabel,
  jobDefinitionForPosting,
  JOB_SIZE_LABELS,
  returnPerHour,
  validateEngagementAssignment,
} from "../game/jobs";
import { formatJobDurationSec } from "../game/jobBoard";
import { REGION_LABELS, towerById } from "../game/mapWorld";
import { formatTimerRemaining } from "../game/timers";
import { totalAssigned } from "../game/unitEffects";
import type {
  GameAction,
  GameState,
  JobPosting,
  UnitAssignment,
} from "../game/types";
import { MissionCrewPicker } from "./MissionCrewPicker";

interface JobPostingCardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  posting: JobPosting;
  assignment: UnitAssignment;
  onAssignmentChange: (next: UnitAssignment) => void;
  showTower?: boolean;
}

export function JobPostingCard({
  state,
  dispatch,
  posting,
  assignment,
  onAssignmentChange,
  showTower = false,
}: JobPostingCardProps) {
  const officeId = state.selectedOffice;
  const officeRoster = rosterAt(state, officeId);
  const def = jobDefinitionForPosting(posting);
  const tower = towerById(posting.towerId);
  const unitCount = totalAssigned(assignment);
  const band = completionBand(posting.unitHoursCompleted, def.unitHoursTotal);
  const blockReason = validateEngagementAssignment(
    state,
    posting.id,
    assignment,
  );
  const disabled = Boolean(blockReason);
  const expiresIn = formatTimerRemaining(
    state,
    posting.expiresAt,
    Date.now(),
  );

  return (
    <article className="project-card job-posting-card">
      <header>
        <strong>{def.title}</strong>
        <span>{BUSINESS_TYPE_LABELS[def.businessType]}</span>
        {showTower && (
          <span className="job-posting-tower muted">
            {tower.name} · {REGION_LABELS[tower.region]}
          </span>
        )}
      </header>
      <p className="structure-desc muted">{def.description}</p>
      <ul>
        <li>Tier {def.tier} · Size {JOB_SIZE_LABELS[def.size]}</li>
        <li>
          Shift: {formatJobDurationSec(def.durationSec)} (units return after)
        </li>
        {def.tier === 1 && (
          <li>Payout: ${def.cashPerUnitHour}/unit-hour</li>
        )}
        {def.tier === 2 && (
          <li>Payout: ${def.cashPerUnitHour}/unit-hour (partial info)</li>
        )}
        <li>
          Completion:{" "}
          <span
            title={`Rank ${COMPLETION_BAND_RANK[band]} of 5 — ${completionBandLabel(band)}`}
          >
            {completionBandLabel(band)}
          </span>
        </li>
        <li>Expires: {expiresIn}</li>
        <li>
          Requires {def.requiredCategory} tier {def.minUnitTier}+
        </li>
        {unitCount > 0 && (
          <li>
            Return preview: ~${formatNumber(returnPerHour(def, unitCount))}/hr
          </li>
        )}
      </ul>
      <MissionCrewPicker
        job={def}
        officeId={officeId}
        roster={officeRoster}
        assignment={assignment}
        onChange={onAssignmentChange}
      />
      <button
        type="button"
        className="btn primary"
        disabled={disabled}
        onClick={() =>
          dispatch({
            type: "ENGAGE_JOB",
            postingId: posting.id,
            crewAssigned: assignment,
          })
        }
      >
        {blockReason ?? "Engage"}
      </button>
    </article>
  );
}

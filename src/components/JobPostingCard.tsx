import { type Dispatch } from "react";
import { formatNumber, rosterAt } from "../game/constants";
import { resolveOfficeLocation, isAllOfficesSelected } from "../game/officeSelection";
import {
  actualShiftReturnPerHour,
  BUSINESS_TYPE_LABELS,
  COMPLETION_BANDS,
  completionBand,
  completionBandLabel,
  jobDefinitionForPosting,
  JOB_SIZE_LABELS,
  JOB_SIZES,
  returnPerHour,
  validateEngagementAssignment,
} from "../game/jobs";
import { formatJobDurationSec } from "../game/jobBoard";
import { REGION_LABELS, jobSiteLabelForPosting, jobSiteRegionForPosting } from "../game/mapWorld";
import { formatTimerRemaining } from "../game/timers";
import { totalAssigned } from "../game/unitEffects";
import type {
  CompletionBand,
  GameAction,
  GameState,
  JobPosting,
  JobSize,
  UnitAssignment,
} from "../game/types";
import { MissionCrewPicker } from "./MissionCrewPicker";

interface JobPostingCardProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  posting: JobPosting;
  assignment: UnitAssignment;
  onAssignmentChange: (next: UnitAssignment) => void;
  onEngageSuccess?: () => void;
  showTower?: boolean;
}

function MetaTip<T extends string>({
  tipId,
  title,
  current,
  options,
  labelFor,
  classFor,
}: {
  tipId: string;
  title?: string;
  current: T;
  options: readonly T[];
  labelFor: (value: T) => string;
  classFor: (value: T) => string;
}) {
  return (
    <span className="job-info-tip">
      <span
        className={`job-info-tip-value ${classFor(current)}`}
        tabIndex={0}
        aria-describedby={tipId}
      >
        {labelFor(current)}
      </span>
      <span id={tipId} className="job-info-tip-panel" role="tooltip">
        {title ? <span className="job-info-tip-title">{title}</span> : null}
        {options.map((option) => (
          <span
            key={option}
            className={`job-info-tip-row${option === current ? " is-current" : ""}`}
          >
            <span className="job-info-tip-mark" aria-hidden>
              {option === current ? "●" : "○"}
            </span>
            <span className={`job-info-tip-value ${classFor(option)}`}>
              {labelFor(option)}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}

export function JobPostingCard({
  state,
  dispatch,
  posting,
  assignment,
  onAssignmentChange,
  onEngageSuccess,
  showTower = false,
}: JobPostingCardProps) {
  const officeId = resolveOfficeLocation(state);
  const officeRoster = rosterAt(state, officeId);
  const engageLocked = isAllOfficesSelected(state.selectedOffice);
  const def = jobDefinitionForPosting(posting);
  const siteLabel = jobSiteLabelForPosting(posting, def);
  const siteRegion = jobSiteRegionForPosting(posting, def);
  const band = completionBand(posting.unitHoursCompleted, def.unitHoursTotal);
  const unitCount = totalAssigned(assignment);
  const expectedPerHour = returnPerHour(def, unitCount);
  const actualPerHour = actualShiftReturnPerHour(def, posting, unitCount);
  const blockReason = validateEngagementAssignment(
    state,
    posting.id,
    assignment,
  );
  const disabled = engageLocked || Boolean(blockReason);
  const expiresIn = formatTimerRemaining(
    state,
    posting.expiresAt,
    Date.now(),
  );

  const showPayNote =
    unitCount > 0 && actualPerHour + 0.05 < expectedPerHour;
  const engageNote = showPayNote
    ? `Below full $${formatNumber(expectedPerHour)}/hr — not enough work left for this whole crew/shift.`
    : null;

  return (
    <article className="project-card job-posting-card">
      <header>
        <strong>{def.title}</strong>
        <span>{BUSINESS_TYPE_LABELS[def.businessType]}</span>
        {showTower && (
          <span className="job-posting-tower muted">
            {siteLabel} · {REGION_LABELS[siteRegion]}
          </span>
        )}
      </header>
      <p className="structure-desc muted">{def.description}</p>
      <ul className="job-posting-facts">
        <li>
          <span className="job-posting-fact-label">Tier</span>
          <span>{def.tier}</span>
        </li>
        <li>
          <span className="job-posting-fact-label">Size</span>
          <MetaTip<JobSize>
            tipId={`job-size-tip-${posting.id}`}
            current={def.size}
            options={JOB_SIZES}
            labelFor={(size) => JOB_SIZE_LABELS[size]}
            classFor={(size) => `job-size-band job-size-band-${size}`}
          />
        </li>
        <li>
          <span className="job-posting-fact-label">Shift</span>
          <span>{formatJobDurationSec(def.durationSec)}</span>
        </li>
        <li>
          <span className="job-posting-fact-label">Payout</span>
          <span>${def.cashPerUnitHour}/unit-hour</span>
        </li>
        <li>
          <span className="job-posting-fact-label">Completion</span>
          <MetaTip<CompletionBand>
            tipId={`job-completion-tip-${posting.id}`}
            current={band}
            options={COMPLETION_BANDS}
            labelFor={completionBandLabel}
            classFor={(option) =>
              `job-completion-band job-completion-band-${option}`
            }
          />
        </li>
        <li>
          <span className="job-posting-fact-label">Expires</span>
          <span>{expiresIn}</span>
        </li>
        {def.tier > 1 ? (
          <li>
            <span className="job-posting-fact-label">Needs</span>
            <span>
              {def.requiredCategory} tier {def.minUnitTier}+
            </span>
          </li>
        ) : null}
      </ul>
      <MissionCrewPicker
        job={def}
        officeId={officeId}
        roster={officeRoster}
        assignment={assignment}
        dispatch={dispatch}
        onChange={onAssignmentChange}
      />
      <div className="job-posting-engage">
        <button
          type="button"
          className="btn primary job-posting-engage-btn"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            dispatch({
              type: "ENGAGE_JOB",
              postingId: posting.id,
              crewAssigned: assignment,
            });
            onEngageSuccess?.();
          }}
        >
          {blockReason ??
            (unitCount > 0
              ? `Engage · $${formatNumber(actualPerHour)}/hr`
              : "Engage")}
        </button>
        {engageNote ? (
          <p className="muted job-posting-engage-note">{engageNote}</p>
        ) : null}
      </div>
    </article>
  );
}

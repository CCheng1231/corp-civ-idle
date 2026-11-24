import { useState, type Dispatch } from "react";
import { formatNumber, rosterAt } from "../game/constants";
import { resolveOfficeLocation, isAllOfficesSelected } from "../game/officeSelection";
import {
  actualShiftReturnPerHour,
  JOB_ENGAGE_CAPPED_SHIFT_HINT,
  COMPLETION_BANDS,
  completionBand,
  completionBandLabel,
  jobDefinitionForPosting,
  JOB_SIZE_LABELS,
  JOB_SIZES,
  jobCompletionSupplyBonus,
  jobCompletionConnectionBonus,
  LOCATION_TYPE_LABELS,
  jobEngagementTravelSupplyCost,
  returnPerHour,
  validateEngagementAssignment,
} from "../game/jobs";
import { requiredMinUnitTierForJob } from "../game/jobUnitTier";
import { formatJobDurationSec } from "../game/jobBoard";
import { jobWorkDurationSec, teamLeadJobIncomeMult } from "../game/secretaryEffects";
import { secretaryById } from "../game/secretaryData";
import { availableTeamLeadSecretaries } from "../game/secretaryTeamLead";
import {
  REGION_LABELS,
  jobSiteCoordForPosting,
  jobSiteLabelForPosting,
  jobSiteRegionForPosting,
} from "../game/mapWorld";
import { jobTravelHexesToCoord } from "../game/mapTravel";
import { formatTimerRemaining } from "../game/timers";
import { totalAssigned } from "../game/unitEffects";
import type {
  CompletionBand,
  GameAction,
  GameState,
  JobPosting,
  JobSize,
  SecretaryId,
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
  coachEngageHighlight?: boolean;
  coachEngageFreshQtyHighlight?: boolean;
  coachEngageFactsHighlight?: boolean;
  /** Compact light card for World map dispatch modal */
  presentation?: "default" | "mapEngage";
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
  coachEngageHighlight = false,
  coachEngageFreshQtyHighlight = false,
  coachEngageFactsHighlight = false,
  presentation = "default",
}: JobPostingCardProps) {
  const mapEngage = presentation === "mapEngage";
  const [teamLeadId, setTeamLeadId] = useState<SecretaryId | "">("");
  const officeId = resolveOfficeLocation(state);
  const teamLeadOptions = availableTeamLeadSecretaries(state);
  const previewLead = teamLeadId || null;
  const officeRoster = rosterAt(state, officeId);
  const engageLocked = isAllOfficesSelected(state.selectedOffice);
  const def = jobDefinitionForPosting(posting);
  const minUnitTier = requiredMinUnitTierForJob(def);
  const siteLabel = jobSiteLabelForPosting(posting, def);
  const siteRegion = jobSiteRegionForPosting(posting, def);
  const band = completionBand(posting.unitHoursCompleted, def.unitHoursTotal);
  const unitCount = totalAssigned(assignment);
  const incomeMult = previewLead
    ? teamLeadJobIncomeMult(state, previewLead)
    : 1;
  const expectedPerHour = returnPerHour(def, unitCount) * incomeMult;
  const actualPerHour = actualShiftReturnPerHour(def, posting, unitCount) * incomeMult;
  const completionSupply = jobCompletionSupplyBonus(def);
  const completionConnection = jobCompletionConnectionBonus(def);
  const bonusPctLabel = Math.round(def.bonusPercent * 100);
  const travelHexes = jobTravelHexesToCoord(
    state,
    officeId,
    jobSiteCoordForPosting(posting, def, state.settings),
  );
  const tripSupply = jobEngagementTravelSupplyCost(
    state,
    posting.id,
    assignment,
    previewLead,
  );
  const blockReason = validateEngagementAssignment(
    state,
    posting.id,
    assignment,
    previewLead,
  );
  const disabled = engageLocked || Boolean(blockReason);
  const expiresIn = formatTimerRemaining(
    state,
    posting.expiresAt,
    Date.now(),
  );

  const showPayNote =
    unitCount > 0 && actualPerHour + 0.05 < expectedPerHour;
  const engageNote = showPayNote ? JOB_ENGAGE_CAPPED_SHIFT_HINT : null;

  const completionParts: string[] = [];
  if (completionSupply > 0) {
    completionParts.push(`${formatNumber(completionSupply)} SUP`);
  }
  if (completionConnection > 0) {
    completionParts.push(`${formatNumber(completionConnection)} CON`);
  }
  completionParts.push(`${bonusPctLabel}% cash`);
  const completionSummary = completionParts.join(" · ");

  return (
    <article
      className={`project-card job-posting-card${
        mapEngage ? " job-posting-card--map-engage" : ""
      }`}
    >
      <header>
        <strong>{def.title}</strong>
        {mapEngage ? (
          <span className="job-posting-tower muted">
            {siteLabel} · {REGION_LABELS[siteRegion]}
          </span>
        ) : (
          <>
            <span>
              {def.locationType ? LOCATION_TYPE_LABELS[def.locationType] : "Job"}
            </span>
            {showTower ? (
              <span className="job-posting-tower muted">
                {siteLabel} · {REGION_LABELS[siteRegion]}
              </span>
            ) : null}
          </>
        )}
      </header>
      {mapEngage ? null : (
        <p className="structure-desc muted">{def.description}</p>
      )}
      <ul
        className="job-posting-facts"
        id={
          coachEngageFactsHighlight
            ? "gov-coach-anchor-map-job-engage-facts"
            : undefined
        }
      >
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
          <span>
            {formatJobDurationSec(
              jobWorkDurationSec(state, def.durationSec, {
                teamLeadSecretaryId: previewLead,
                definitionId: def.id,
              }),
            )}
          </span>
        </li>
        <li>
          <span className="job-posting-fact-label">Payout</span>
          <span>${def.cashPerUnitHour}/unit-hour</span>
        </li>
        {mapEngage ? (
          <li>
            <span className="job-posting-fact-label">Completion</span>
            <span>{completionSummary}</span>
          </li>
        ) : (
          <>
            {completionSupply > 0 ? (
              <li>
                <span className="job-posting-fact-label">Bonus</span>
                <span>{formatNumber(completionSupply)} SUP on completion</span>
              </li>
            ) : null}
            {completionConnection > 0 ? (
              <li>
                <span className="job-posting-fact-label">Bonus</span>
                <span>
                  {formatNumber(completionConnection)} CON on completion
                </span>
              </li>
            ) : null}
            <li>
              <span className="job-posting-fact-label">Completion cash</span>
              <span>{bonusPctLabel}% of contract on finish</span>
            </li>
          </>
        )}
        <li>
          <span className="job-posting-fact-label">
            {mapEngage ? "Progress" : "Completion"}
          </span>
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
          <span className="job-posting-fact-label">Travel</span>
          <span>
            {unitCount > 0
              ? `${travelHexes} hex · ${tripSupply} SUP`
              : `${travelHexes} hex · 2 SUP/unit`}
          </span>
        </li>
        <li>
          <span className="job-posting-fact-label">Expires</span>
          <span>{expiresIn}</span>
        </li>
        {minUnitTier > 1 ? (
          <li>
            <span className="job-posting-fact-label">Needs</span>
            <span>Units tier {minUnitTier}+</span>
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
        compactLayout={mapEngage}
        coachQtyAnchorUnitId={
          coachEngageFreshQtyHighlight ? "fresh_graduate" : undefined
        }
      />
      {!mapEngage && teamLeadOptions.length > 0 ? (
        <label className="job-posting-team-lead">
          <span>Team lead (optional)</span>
          <select
            value={teamLeadId}
            onChange={(event) =>
              setTeamLeadId(event.target.value as SecretaryId | "")
            }
          >
            <option value="">No secretary attached</option>
            {teamLeadOptions.map((id) => (
              <option key={id} value={id}>
                {secretaryById(id).name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="job-posting-engage">
        <button
          type="button"
          id={coachEngageHighlight ? "gov-coach-anchor-job-engage" : undefined}
          className="btn primary job-posting-engage-btn"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            dispatch({
              type: "ENGAGE_JOB",
              postingId: posting.id,
              crewAssigned: assignment,
              teamLeadSecretaryId: teamLeadId || null,
            });
            onEngageSuccess?.();
          }}
        >
          {blockReason ??
            (mapEngage
              ? "Engage"
              : unitCount > 0
                ? `Engage · $${formatNumber(expectedPerHour)}/hr`
                : "Engage")}
        </button>
        {engageNote ? (
          <p className="muted job-posting-engage-note">{engageNote}</p>
        ) : null}
      </div>
    </article>
  );
}

import { useState, type Dispatch } from "react";
import {
  formatNumber,
  rosterAt,
} from "../game/constants";
import { OFFICE_TOWERS, REGION_LABELS, towerById } from "../game/mapWorld";
import {
  BUSINESS_TYPE_LABELS,
  JOB_SIZE_LABELS,
  activeEngagementCount,
  completionBand,
  completionBandLabel,
  COMPLETION_BAND_RANK,
  jobDefinitionForPosting,
  jobDefinitionById,
  maxJobEngagements,
  postingsForTower,
  returnPerHour,
  validateEngagementAssignment,
} from "../game/jobs";
import { totalAssigned } from "../game/unitEffects";
import { formatTimerRemaining } from "../game/timers";
import {
  MissionCrewPicker,
  emptyAssignmentForJob,
} from "./MissionCrewPicker";
import type { GameAction, GameState, UnitAssignment } from "../game/types";

interface ProjectPanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function formatDuration(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)} hr`;
  if (sec >= 60) return `${Math.round(sec / 60)} min`;
  return `${sec}s`;
}

export function ProjectPanel({ state, dispatch }: ProjectPanelProps) {
  const officeId = state.selectedOffice;
  const officeRoster = rosterAt(state, officeId);
  const towerId = state.selectedTowerId ?? "metro_central";
  const tower = towerById(towerId);
  const [crewByPosting, setCrewByPosting] = useState<
    Record<string, UnitAssignment>
  >({});

  const postings = postingsForTower(state, towerId);
  const engagements = state.jobEngagements;
  const cap = maxJobEngagements(state);
  const activeCount = activeEngagementCount(state);

  function assignmentFor(postingId: string, definitionId: string) {
    return emptyAssignmentForJob(
      definitionId,
      officeRoster,
      crewByPosting,
      postingId,
    );
  }

  return (
    <section className="project-panel job-hub-panel">
      <h2>Job Hub — {tower.name}</h2>
      <p className="muted">
        Tower postings are yes/no engagements — no bidding. Assign{" "}
        <strong>{officeId.toUpperCase()}</strong> units for a fixed shift (
        <strong>Duration</strong>); they return when the shift ends. Incomplete
        postings stay on the board until <strong>Expiration</strong>. Cancel
        early for <strong>50%</strong> of earned pay; a finished shift pays{" "}
        <strong>100%</strong>.
      </p>
      <p className="cost-line">
        Region: <strong>{REGION_LABELS[tower.region]}</strong> · Active
        engagements {activeCount}/{cap}
      </p>

      {engagements.length > 0 && (
        <div className="job-engagements-panel">
          <h3>Active engagements</h3>
          <ul className="job-engagement-list">
            {engagements.map((engagement) => {
              const def = jobDefinitionById(engagement.definitionId);
              return (
                <li key={engagement.id} className="job-engagement-row">
                  <div>
                    <strong>{def.title}</strong>
                    <span className="muted">
                      {" "}
                      · {totalAssigned(engagement.crewAssigned)} units · earned
                      ~${formatNumber(engagement.earnedSoFar)} · returns{" "}
                      {formatTimerRemaining(
                        state,
                        engagement.endsAt,
                        Date.now(),
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      dispatch({
                        type: "CANCEL_JOB_ENGAGEMENT",
                        engagementId: engagement.id,
                      })
                    }
                  >
                    Cancel (50%)
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="project-grid">
        {postings.map((posting) => {
          const def = jobDefinitionForPosting(posting);
          const assignment = assignmentFor(posting.id, def.id);
          const unitCount = totalAssigned(assignment);
          const band = completionBand(
            posting.unitHoursCompleted,
            def.unitHoursTotal,
          );
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
            <article key={posting.id} className="project-card job-posting-card">
              <header>
                <strong>{def.title}</strong>
                <span>{BUSINESS_TYPE_LABELS[def.businessType]}</span>
              </header>
              <p className="structure-desc muted">{def.description}</p>
              <ul>
                <li>Tier {def.tier} · Size {JOB_SIZE_LABELS[def.size]}</li>
                <li>
                  Duration: {formatDuration(def.durationSec)} (unit shift, then
                  return to office)
                </li>
                {def.tier === 1 && (
                  <li>Payout: ${def.cashPerUnitHour}/unit-hour</li>
                )}
                {def.tier === 2 && (
                  <li>Payout: ${def.cashPerUnitHour}/unit-hour (partial info)</li>
                )}
                <li>
                  Job size: {JOB_SIZE_LABELS[def.size]}
                </li>
                <li>
                  Completion:{" "}
                  <span
                    title={`Rank ${COMPLETION_BAND_RANK[band]} of 5 — ${completionBandLabel(band)}`}
                  >
                    {completionBandLabel(band)}
                  </span>
                </li>
                <li>Expiration: {expiresIn}</li>
                <li>
                  Requires {def.requiredCategory} tier {def.minUnitTier}+
                </li>
                {unitCount > 0 && (
                  <li>
                    Return preview: ~$
                    {formatNumber(returnPerHour(def, unitCount))}/hr
                  </li>
                )}
              </ul>
              <MissionCrewPicker
                job={def}
                officeId={officeId}
                roster={officeRoster}
                assignment={assignment}
                onChange={(next) =>
                  setCrewByPosting((prev) => ({
                    ...prev,
                    [posting.id]: next,
                  }))
                }
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
        })}
      </div>

      <p className="muted project-tower-picker">
        All towers:{" "}
        {OFFICE_TOWERS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="btn linkish"
            disabled={t.id === towerId}
            aria-current={t.id === towerId ? "true" : undefined}
            onClick={() =>
              dispatch({ type: "SELECT_TOWER", towerId: t.id })
            }
          >
            {t.name}
          </button>
        ))}
      </p>
    </section>
  );
}

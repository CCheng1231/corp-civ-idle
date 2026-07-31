import { useEffect, useState } from "react";
import {
  CONTRACTOR_TYPES,
  OFFICE_LABELS,
  RESEARCH,
  STRUCTURES,
  formatNumber,
  recruitmentJobsAtOffice,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { overviewOfficeOptions } from "../game/mapWorld";
import { formatTimerRemaining } from "../game/timers";
import type { GameState, OfficeLocationId } from "../game/types";
import { StructureBuildQueueList } from "./StructureBuildQueueList";

interface OverviewViewProps {
  state: GameState;
}

export function OverviewView({ state }: OverviewViewProps) {
  const officeOptions = overviewOfficeOptions(state);
  const [officeId, setOfficeId] = useState<OfficeLocationId>("hq");

  useEffect(() => {
    if (officeId === "branch" && !state.branchEstablished) {
      setOfficeId("hq");
    }
  }, [officeId, state.branchEstablished]);

  const officeLabel = OFFICE_LABELS[officeId];
  const now = Date.now();
  const structures = state.structureLevelsByLocation[officeId];
  const buildQueue = state.structureQueues[officeId];
  const hireQueue = recruitmentJobsAtOffice(state, officeId).sort(
    (a, b) => a.completesAt - b.completesAt,
  );
  const roster = rosterAt(state, officeId);
  const researchActive = RESEARCH.filter(
    (def) => state.researchLevels[def.id] > 0,
  );
  const selectedOption = officeOptions.find((o) => o.id === officeId);

  return (
    <div className="main-view-panel overview-view">
      <header className="main-view-header overview-header">
        <div className="overview-header-row">
          <div>
            <h2>Overview</h2>
            <p className="muted">
              Per-site snapshot — structures, builds, hiring, and staff.
              Research is firm-wide.
            </p>
          </div>
          <label className="overview-office-picker">
            <span className="overview-office-picker-label">Office</span>
            <select
              className="overview-office-select"
              value={officeId}
              onChange={(e) =>
                setOfficeId(e.target.value as OfficeLocationId)
              }
            >
              {officeOptions.map((option) => (
                <option
                  key={option.id}
                  value={option.id}
                  disabled={!option.available}
                >
                  {option.label}
                  {!option.available ? " (not open)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedOption?.hint && (
          <p className="muted overview-office-hint">{selectedOption.hint}</p>
        )}
      </header>

      <section className="overview-section">
        <h3>Structure levels — {officeLabel}</h3>
        <ul className="office-site-structure-levels overview-structure-levels">
          {STRUCTURES.map((def) => {
            const level = structures[def.id];
            if (level <= 0) return null;
            return (
              <li key={def.id}>
                <span>{def.name}</span>
                <strong>
                  Lv {level}/{def.maxLevel}
                </strong>
              </li>
            );
          })}
        </ul>
        {STRUCTURES.every((def) => structures[def.id] <= 0) && (
          <p className="muted">No structures built at this site yet.</p>
        )}
      </section>

      <section className="overview-section">
        <h3>Building in progress</h3>
        <StructureBuildQueueList
          state={state}
          jobs={buildQueue}
          now={now}
          emptyLabel={`No structure upgrades queued at ${officeLabel}.`}
        />
      </section>

      <section className="overview-section">
        <h3>Research</h3>
        {researchActive.length === 0 ? (
          <p className="muted">No research purchased yet.</p>
        ) : (
          <ul className="overview-research-list">
            {researchActive.map((def) => (
              <li key={def.id}>
                <span>{def.name}</span>
                <strong>
                  Lv {state.researchLevels[def.id]}/{def.maxLevel}
                </strong>
              </li>
            ))}
          </ul>
        )}
        <p className="muted overview-research-note">
          Research completes instantly when purchased from the Research tab.
        </p>
      </section>

      <section className="overview-section">
        <h3>Hiring in progress</h3>
        {hireQueue.length === 0 ? (
          <p className="muted">No contractors arriving at {officeLabel}.</p>
        ) : (
          <ul className="build-queue">
            {hireQueue.map((job) => {
              const typeDef = CONTRACTOR_TYPES.find(
                (t) => t.id === job.contractorType,
              );
              return (
                <li key={job.id}>
                  <span className="queue-role">Hiring</span>
                  <span className="queue-name">
                    {typeDef?.flavorTitle ?? typeDef?.role ?? job.contractorType}
                  </span>
                  <span className="queue-status">
                    {formatTimerRemaining(state, job.completesAt, now)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overview-section">
        <h3>Units at {officeLabel}</h3>
        <p className="muted overview-units-total">
          {formatNumber(totalWorkforce(roster))} on site
          {hireQueue.length > 0 && ` · ${hireQueue.length} arriving`}
        </p>
        <ul className="office-site-staff-list">
          {CONTRACTOR_TYPES.map((type) => (
            <li key={type.id}>
              <span className="office-site-staff-role">{type.flavorTitle}</span>
              <span className="office-site-staff-count muted">
                {type.role}
              </span>
              <strong>×{roster[type.id]}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

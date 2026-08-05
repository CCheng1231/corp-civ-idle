import { type Dispatch } from "react";
import {
  MAX_RESEARCH_QUEUE,
  MAX_RECRUIT_QUEUE,
  MAX_STRUCTURE_QUEUE,
  RESEARCH,
  STRUCTURES,
  formatNumber,
  projectedResearchLevels,
  recruitmentJobsAtOffice,
  researchJobsAtOffice,
  rosterAt,
  totalWorkforce,
} from "../game/constants";
import { officeDisplayName } from "../game/mapWorld";
import { RECRUITMENT_UNITS } from "../game/recruitmentData";
import type { GameAction, GameState } from "../game/types";
import { LocationViewHeader } from "./LocationViewHeader";
import {
  RecruitmentQueueList,
  ResearchQueueList,
  StructureBuildQueueList,
  QueueSection,
} from "./StructureBuildQueueList";

interface OverviewViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function OverviewView({ state, dispatch }: OverviewViewProps) {
  const officeId = state.selectedOffice;
  const officeLabel = officeDisplayName(state, officeId);
  const now = Date.now();
  const structures = state.structureLevelsByLocation[officeId];
  const buildQueue = state.structureQueues[officeId];
  const researchQueue = researchJobsAtOffice(state, officeId);
  const hireQueue = recruitmentJobsAtOffice(state, officeId);
  const roster = rosterAt(state, officeId);
  const projectedResearch = projectedResearchLevels(state);
  const researchActive = RESEARCH.filter(
    (def) => projectedResearch[def.id] > 0,
  );

  return (
    <div className="main-view-panel location-view-panel overview-view">
      <LocationViewHeader
        title="Overview"
        description="Per-site snapshot — structures, builds, hiring, and staff. Research levels are firm-wide; queues are per office."
        state={state}
        dispatch={dispatch}
      />

      <div className="location-view-body">
      <section className="overview-section location-view-section">
        <h3>Structure levels — {officeLabel}</h3>
        {STRUCTURES.every((def) => structures[def.id] <= 0) ? (
          <p className="muted overview-empty-note">
            No structures built at this site yet.
          </p>
        ) : (
          <ul className="overview-structure-levels">
            {STRUCTURES.map((def) => {
              const level = structures[def.id];
              if (level <= 0) return null;
              return (
                <li key={def.id} className="overview-structure-tile">
                  <span className="overview-structure-name">{def.name}</span>
                  <span className="overview-structure-level">
                    Lv {level}
                    <span className="overview-structure-level-max">
                      / {def.maxLevel}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overview-section location-view-section">
        <h3>Building in progress</h3>
        <QueueSection
          label="Build queue"
          count={buildQueue.length}
          max={MAX_STRUCTURE_QUEUE}
        >
          <StructureBuildQueueList
            state={state}
            jobs={buildQueue}
            locationId={officeId}
            dispatch={dispatch}
            now={now}
            emptyLabel={`No structure upgrades queued at ${officeLabel}.`}
          />
        </QueueSection>
      </section>

      <section className="overview-section location-view-section">
        <h3>Research — {officeLabel}</h3>
        <QueueSection
          label="Research queue"
          count={researchQueue.length}
          max={MAX_RESEARCH_QUEUE}
        >
          <ResearchQueueList
            state={state}
            jobs={researchQueue}
            officeId={officeId}
            dispatch={dispatch}
            now={now}
            emptyLabel={`No research queued at ${officeLabel}.`}
          />
        </QueueSection>
        {researchActive.length > 0 && (
          <>
            <h4 className="overview-subheading">Firm-wide levels</h4>
            <ul className="overview-research-list">
              {researchActive.map((def) => (
                <li key={def.id}>
                  <span>{def.name}</span>
                  <strong>
                    Lv {state.researchLevels[def.id]}/{def.maxLevel}
                    {projectedResearch[def.id] > state.researchLevels[def.id] && (
                      <span className="muted">
                        {" "}
                        (+{projectedResearch[def.id] - state.researchLevels[def.id]} queued)
                      </span>
                    )}
                  </strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="overview-section location-view-section">
        <h3>Hiring in progress</h3>
        <QueueSection
          label="Hiring queue"
          count={hireQueue.length}
          max={MAX_RECRUIT_QUEUE}
        >
          <RecruitmentQueueList
            state={state}
            jobs={hireQueue}
            officeId={officeId}
            dispatch={dispatch}
            now={now}
            emptyLabel={`No contractors arriving at ${officeLabel}.`}
          />
        </QueueSection>
      </section>

      <section className="overview-section location-view-section">
        <h3>Staff — {officeLabel}</h3>
        <ul className="office-site-staff-list">
          {RECRUITMENT_UNITS.filter((unit) => (roster[unit.id] ?? 0) > 0).map(
            (unit) => (
              <li key={unit.id}>
                <span className="office-site-staff-role">{unit.name}</span>
                <span className="office-site-staff-count">
                  ×{roster[unit.id] ?? 0}
                </span>
              </li>
            ),
          )}
        </ul>
        {RECRUITMENT_UNITS.every((unit) => (roster[unit.id] ?? 0) <= 0) && (
          <p className="muted">No units at this site.</p>
        )}
        <p className="muted overview-staff-total">
          Total on site: {formatNumber(totalWorkforce(roster))}
        </p>
      </section>
      </div>
    </div>
  );
}

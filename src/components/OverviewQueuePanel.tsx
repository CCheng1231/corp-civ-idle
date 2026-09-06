import { type Dispatch } from "react";
import {
  MAX_RESEARCH_QUEUE,
  MAX_RECRUIT_QUEUE,
  MAX_STRUCTURE_QUEUE,
  recruitmentJobsAtOffice,
  researchJobsAtOffice,
} from "../game/constants";
import { ownedOfficeIds } from "../game/mapWorld";
import {
  isAllOfficesSelected,
  recruitmentJobsForOffices,
  researchJobsForOffices,
  resolveOfficeLocation,
  structureJobsForOffices,
} from "../game/officeSelection";
import type { GameAction, GameState } from "../game/types";
import {
  RecruitmentQueueList,
  ResearchQueueList,
  StructureBuildQueueList,
} from "./StructureBuildQueueList";

interface OverviewQueuePanelProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  className?: string;
}

export function OverviewQueuePanel({
  state,
  dispatch,
  className,
}: OverviewQueuePanelProps) {
  const showAll = isAllOfficesSelected(state.selectedOffice);
  const officeId = resolveOfficeLocation(state);
  const officeIds = ownedOfficeIds(state);
  const now = Date.now();
  const buildQueueCount = showAll
    ? structureJobsForOffices(state).length
    : state.structureQueues[officeId].length;
  const researchQueueCount = showAll
    ? researchJobsForOffices(state).length
    : researchJobsAtOffice(state, officeId).length;
  const hireQueueCount = showAll
    ? recruitmentJobsForOffices(state).length
    : recruitmentJobsAtOffice(state, officeId).length;
  const mergedQueueMax = officeIds.length * MAX_STRUCTURE_QUEUE;

  return (
    <div className={className ? `tab-hero-queues ${className}` : "tab-hero-queues"}>
      <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
        <div className="tab-queue-heading">
          <h3>Structure in progress</h3>
          <span
            className="tab-queue-count muted"
            aria-label={`Structure queue ${buildQueueCount}`}
          >
            {buildQueueCount}
            {showAll ? "" : `/${MAX_STRUCTURE_QUEUE}`}
          </span>
        </div>
        <StructureBuildQueueList
          state={state}
          {...(showAll
            ? {
                entries: structureJobsForOffices(state),
                maxSlots: mergedQueueMax,
              }
            : {
                jobs: state.structureQueues[officeId],
                locationId: officeId,
              })}
          dispatch={dispatch}
          now={now}
          compact
          emptyLabel=""
        />
      </section>
      <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
        <div className="tab-queue-heading">
          <h3>Research in progress</h3>
          <span
            className="tab-queue-count muted"
            aria-label={`Research queue ${researchQueueCount}`}
          >
            {researchQueueCount}
            {showAll ? "" : `/${MAX_RESEARCH_QUEUE}`}
          </span>
        </div>
        <ResearchQueueList
          state={state}
          {...(showAll
            ? {
                entries: researchJobsForOffices(state),
                maxSlots: officeIds.length * MAX_RESEARCH_QUEUE,
              }
            : {
                jobs: researchJobsAtOffice(state, officeId),
                officeId,
              })}
          dispatch={dispatch}
          now={now}
          compact
          emptyLabel=""
        />
      </section>
      <section className="overview-section location-view-section tab-queue-section tab-compact-queue">
        <div className="tab-queue-heading">
          <h3>Hiring in progress</h3>
          <span
            className="tab-queue-count muted"
            aria-label={`Hiring queue ${hireQueueCount}`}
          >
            {hireQueueCount}
            {showAll ? "" : `/${MAX_RECRUIT_QUEUE}`}
          </span>
        </div>
        <RecruitmentQueueList
          state={state}
          {...(showAll
            ? {
                entries: recruitmentJobsForOffices(state),
                maxSlots: officeIds.length * MAX_RECRUIT_QUEUE,
              }
            : {
                jobs: recruitmentJobsAtOffice(state, officeId),
                officeId,
              })}
          dispatch={dispatch}
          now={now}
          compact
          emptyLabel=""
        />
      </section>
    </div>
  );
}

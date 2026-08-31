import { type Dispatch } from "react";
import { MAX_STRUCTURE_QUEUE, officeSiteLabel } from "../game/constants";
import { ownedOfficeIds } from "../game/mapWorld";
import type { GameAction, GameState } from "../game/types";
import { StructureBuildQueueList, QueueSection } from "./StructureBuildQueueList";

interface LocationStructureQueuesProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

export function LocationStructureQueues({
  state,
  dispatch,
}: LocationStructureQueuesProps) {
  const now = Date.now();

  return (
    <section className="location-build-queues">
      <h3>Structure upgrade queues</h3>
      <p className="muted">
        Build duration from the balance table (game hours = real time), up to{" "}
        {MAX_STRUCTURE_QUEUE} queued per site.
      </p>
      <div className="location-queue-grid">
        {ownedOfficeIds(state).map((officeId) => {
          const jobs = state.structureQueues[officeId];
          return (
            <div key={officeId} className="location-queue-card">
              <div className="location-queue-head">
                <strong>{officeSiteLabel(state, officeId)}</strong>
                <span className="muted">
                  {jobs.length}/{MAX_STRUCTURE_QUEUE}
                </span>
              </div>
              <QueueSection
                label="Queue"
                count={jobs.length}
                max={MAX_STRUCTURE_QUEUE}
              >
                <StructureBuildQueueList
                  state={state}
                  jobs={jobs}
                  locationId={officeId}
                  dispatch={dispatch}
                  now={now}
                />
              </QueueSection>
            </div>
          );
        })}
      </div>
    </section>
  );
}

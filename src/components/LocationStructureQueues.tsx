import {
  MAX_STRUCTURE_QUEUE,
  OFFICE_IDS,
  OFFICE_LABELS,
} from "../game/constants";
import type { GameState } from "../game/types";
import { StructureBuildQueueList } from "./StructureBuildQueueList";

interface LocationStructureQueuesProps {
  state: GameState;
}

export function LocationStructureQueues({ state }: LocationStructureQueuesProps) {
  const now = Date.now();

  return (
    <section className="location-build-queues">
      <h3>Structure upgrade queues</h3>
      <p className="muted">
        Build duration from the balance table (game hours = real time), up to{" "}
        {MAX_STRUCTURE_QUEUE} queued per site.
      </p>
      <div className="location-queue-grid">
        {OFFICE_IDS.map((officeId) => {
          const jobs = state.structureQueues[officeId];
          return (
            <div key={officeId} className="location-queue-card">
              <div className="location-queue-head">
                <strong>{OFFICE_LABELS[officeId]}</strong>
                <span className="muted">
                  {jobs.length}/{MAX_STRUCTURE_QUEUE}
                </span>
              </div>
              <StructureBuildQueueList state={state} jobs={jobs} now={now} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

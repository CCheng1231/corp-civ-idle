import { STRUCTURES } from "../game/constants";
import { formatTimerRemaining } from "../game/timers";
import type { GameState, StructureBuildJob } from "../game/types";

interface StructureBuildQueueListProps {
  state: GameState;
  jobs: StructureBuildJob[];
  now?: number;
  emptyLabel?: string;
}

export function StructureBuildQueueList({
  state,
  jobs,
  now = Date.now(),
  emptyLabel = "No builds queued.",
}: StructureBuildQueueListProps) {
  if (jobs.length === 0) {
    return <p className="muted queue-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="build-queue">
      {jobs.map((job, index) => {
        const name =
          STRUCTURES.find((s) => s.id === job.structureId)?.name ??
          job.structureId;
        const role = index === 0 ? "Building" : "Queued";
        return (
          <li key={`${job.structureId}-${index}`}>
            <span className="queue-role">{role}</span>
            <span className="queue-name">{name}</span>
            <span className="queue-status">
              {formatTimerRemaining(state, job.completesAt, now)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

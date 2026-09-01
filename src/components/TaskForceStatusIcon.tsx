import type { JobEngagementPhase } from "../game/types";

interface TaskForceStatusIconProps {
  phase: JobEngagementPhase;
}

function TaskForceIconDisc() {
  return <circle r={9} className="secretary-task-force-icon-disc" />;
}

function TaskForceIconTraveling() {
  return (
    <g transform="translate(0,1)">
      <circle cx={0} cy={-4.5} r={1.6} className="secretary-task-force-icon-figure" />
      <path
        className="secretary-task-force-icon-figure"
        d="M0 -2.5 L0 1 M0 -1 L-3 0.5 M0 -1 L3 -0.2 M0 1 L-2.5 5 M0 1 L2.8 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
      />
    </g>
  );
}

function TaskForceIconOnSite() {
  return (
    <g transform="translate(0,0.5)">
      <circle cx={0} cy={-4} r={1.6} className="secretary-task-force-icon-figure" />
      <path
        className="secretary-task-force-icon-figure"
        d="M0 -2.2 L0 1.5 M0 -0.5 L-2.5 1 M0 -0.5 L2.5 1 M0 1.5 L-1.8 5 M0 1.5 L1.8 5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <path
        className="secretary-task-force-icon-spark"
        d="M3.2 -3.2 L5.2 -5.2 M4.8 -2.6 L5.6 -2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Compact task-force state glyph — matches world-map running/working icons. */
export function TaskForceStatusIcon({ phase }: TaskForceStatusIconProps) {
  const traveling = phase === "outbound" || phase === "returning";

  return (
    <span
      className={`secretary-task-force-icon${traveling ? " is-traveling" : " is-onsite"}`}
      aria-hidden
    >
      <svg viewBox="-12 -12 24 24" className="secretary-task-force-icon-svg">
        <TaskForceIconDisc />
        {traveling ? <TaskForceIconTraveling /> : <TaskForceIconOnSite />}
      </svg>
    </span>
  );
}

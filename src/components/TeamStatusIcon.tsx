import type { JobEngagementPhase } from "../game/types";

interface TeamStatusIconProps {
  phase: JobEngagementPhase;
}

function TeamIconDisc() {
  return <circle r={9} className="secretary-team-icon-disc" />;
}

function TeamIconTraveling() {
  return (
    <g transform="translate(0,1)">
      <circle cx={0} cy={-4.5} r={1.6} className="secretary-team-icon-figure" />
      <path
        className="secretary-team-icon-figure"
        d="M0 -2.5 L0 1 M0 -1 L-3 0.5 M0 -1 L3 -0.2 M0 1 L-2.5 5 M0 1 L2.8 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
      />
    </g>
  );
}

function TeamIconOnSite() {
  return (
    <g transform="translate(0,0.5)">
      <circle cx={0} cy={-4} r={1.6} className="secretary-team-icon-figure" />
      <path
        className="secretary-team-icon-figure"
        d="M0 -2.2 L0 1.5 M0 -0.5 L-2.5 1 M0 -0.5 L2.5 1 M0 1.5 L-1.8 5 M0 1.5 L1.8 5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <path
        className="secretary-team-icon-spark"
        d="M3.2 -3.2 L5.2 -5.2 M4.8 -2.6 L5.6 -2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );
}

/** Compact field-team state glyph — matches world-map running/working icons. */
export function TeamStatusIcon({ phase }: TeamStatusIconProps) {
  const traveling = phase === "outbound" || phase === "returning";

  return (
    <span
      className={`secretary-team-icon${traveling ? " is-traveling" : " is-onsite"}`}
      aria-hidden
    >
      <svg viewBox="-12 -12 24 24" className="secretary-team-icon-svg">
        <TeamIconDisc />
        {traveling ? <TeamIconTraveling /> : <TeamIconOnSite />}
      </svg>
    </span>
  );
}

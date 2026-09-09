/** Map POI markers — Material-style pins for landmarks; schematic pins for player offices. */

export type MapLandmarkIconKind =
  | "gov"
  | "tower"
  | "commercial"
  | "active"
  | "hq"
  | "branch";

interface MapLandmarkIconProps {
  x: number;
  y: number;
  kind: MapLandmarkIconKind;
  highlighted?: boolean;
  dimmed?: boolean;
  flashing?: boolean;
}

const PIN_COLORS: Record<
  Exclude<MapLandmarkIconKind, "hq" | "branch">,
  { fill: string; glyph: string }
> = {
  gov: { fill: "#e37400", glyph: "#1a1a1a" },
  tower: { fill: "#1a73e8", glyph: "#ffffff" },
  commercial: { fill: "#f9ab00", glyph: "#1a1a1a" },
  active: { fill: "#34a853", glyph: "#ffffff" },
};

function MaterialPin({
  fill,
  glyph,
  iconPath,
}: {
  fill: string;
  glyph: string;
  iconPath: string;
}) {
  return (
    <g className="map-landmark-pin">
      <ellipse cx={0} cy={16} rx={9} ry={3.2} className="map-landmark-pin-shadow" />
      <path
        d="M0 -18 C-11.5 -8 -12.5 4 -7 12 C-3.5 17 0 22 0 22 C0 22 3.5 17 7 12 C12.5 4 11.5 -8 0 -18 Z"
        fill={fill}
        stroke="#1a1a1a"
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-2} r={9.5} fill="#ffffff" stroke="#1a1a1a" strokeWidth={0.7} />
      <g transform="translate(-9.6,-11.6) scale(0.8)" fill={glyph}>
        <path d={iconPath} />
      </g>
    </g>
  );
}

/** Material Symbols paths (24×24), simplified for map scale. */
const ICON_PATHS = {
  gov: "M6 20h12V10H6v10zm2-8h2v6H8v-6zm4 0h2v6h-2v-6zm6 4h2v4h-2v-4zM12 2L4 8v2h16V8L12 2z",
  tower:
    "M12 7V3H2v18h20V7H12zm-2 12H4v-2h6v2zm0-4H4v-2h6v2zm0-4H4V9h6v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V9h6v2z",
  commercial:
    "M4 4h16v2H4V4zm0 4h10v12H4V8zm12 0h4v12h-4V8zM8 11h2v2H8v-2zm0 4h2v2H8v-2zm4-4h2v2h-2v-2zm0 4h2v2h-2v-2z",
  active:
    "M22 11h-4.17l3.24-3.24-1.41-1.42L16 11h-2v-2l4.66-4.66-1.42-1.41L13.83 8H11V4.83l1.41-1.42L11 2 9.59 3.41 11 4.83V8H8.17L4.93 4.76 3.52 6.17 6.76 9.41 2 9.41v2h4.76L3.52 14.59l1.41 1.41L8.17 13H11v3.17l-1.41 1.42L11 19l1.41-1.41L13.83 16H16l3.24 3.24 1.41-1.41L16.66 13H22v-2z",
};

function PlayerOfficePin({ kind }: { kind: "hq" | "branch" }) {
  const fill = kind === "hq" ? "#0072b2" : "#56b4e9";
  return (
    <g className="map-office-pin">
      <ellipse cx={0} cy={14} rx={8} ry={2.8} className="map-landmark-pin-shadow" />
      <path
        d="M0 -16 L10 6 H-10 Z"
        fill={fill}
        stroke="#1a1a1a"
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <rect
        x={-5}
        y={-10}
        width={10}
        height={12}
        rx={1}
        fill="#ffffff"
        stroke="#1a1a1a"
        strokeWidth={0.8}
      />
      <rect x={-3} y={-6} width={6} height={2.5} rx={0.4} fill={fill} opacity={0.85} />
      <rect x={-3} y={-2} width={6} height={2.5} rx={0.4} fill={fill} opacity={0.65} />
    </g>
  );
}

export function MapLandmarkIcon({
  x,
  y,
  kind,
  highlighted,
  dimmed,
  flashing,
}: MapLandmarkIconProps) {
  const wrapClass = [
    "map-landmark-icon-wrap",
    highlighted ? "is-legend-hot" : "",
    dimmed ? "is-legend-dim" : "",
    flashing ? "is-hq-flash" : "",
    `map-landmark-icon-${kind}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <g
      transform={`translate(${x},${y - 6})`}
      pointerEvents="none"
      className={wrapClass}
    >
      {kind === "hq" || kind === "branch" ? (
        <PlayerOfficePin kind={kind} />
      ) : (
        <MaterialPin
          fill={PIN_COLORS[kind].fill}
          glyph={PIN_COLORS[kind].glyph}
          iconPath={ICON_PATHS[kind]}
        />
      )}
    </g>
  );
}

/** Isometric HQ marker — scales with map zoom so detail reads when zoomed in. */

interface MapPlayerHq3DMarkerProps {
  x: number;
  y: number;
  zoomRel: number;
  flashing?: boolean;
  /** Distinguish Chris playtest HQ from Tim default. */
  variant?: "tim" | "chris";
}

function hqMarkerScale(zoomRel: number): number {
  const z = Math.min(1.75, Math.max(0.2, zoomRel));
  return 0.62 + (z - 0.2) * 0.72;
}

export function MapPlayerHq3DMarker({
  x,
  y,
  zoomRel,
  flashing,
  variant = "tim",
}: MapPlayerHq3DMarkerProps) {
  const scale = hqMarkerScale(zoomRel);

  return (
    <g
      className={[
        "map-player-hq-3d",
        variant === "chris" ? "map-player-hq-3d-chris" : "",
        flashing ? "map-player-hq-3d-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      transform={`translate(${x},${y}) scale(${scale})`}
      pointerEvents="none"
      aria-hidden
    >
      <ellipse cx={0} cy={15} rx={13} ry={4.2} className="map-hq-3d-ground-shadow" />

      <path
        d="M -12 5 L 0 12 L 0 24 L -12 17 Z"
        className="map-hq-3d-face-left"
      />
      <path
        d="M 0 12 L 12 5 L 12 17 L 0 24 Z"
        className="map-hq-3d-face-right"
      />
      <path d="M 0 -10 L 12 5 L 0 12 L -12 5 Z" className="map-hq-3d-face-top" />

      <path
        d="M -4 -10 L 0 -18 L 4 -10 L 0 -6 Z"
        className="map-hq-3d-spire-top"
      />
      <path d="M -3 -6 L 0 0 L 3 -6 L 0 -10 Z" className="map-hq-3d-spire-left" />
      <path d="M 0 0 L 3 -6 L 3 2 L 0 6 Z" className="map-hq-3d-spire-right" />

      <rect
        x={-7}
        y={8}
        width={4}
        height={5}
        rx={0.6}
        className="map-hq-3d-window"
      />
      <rect
        x={-7}
        y={15}
        width={4}
        height={4}
        rx={0.6}
        className="map-hq-3d-window"
      />
      <rect
        x={3}
        y={9}
        width={4}
        height={5}
        rx={0.6}
        className="map-hq-3d-window"
      />
      <rect
        x={3}
        y={15}
        width={4}
        height={4}
        rx={0.6}
        className="map-hq-3d-window"
      />

      <circle cx={0} cy={-20} r={2.2} className="map-hq-3d-beacon" />
      <path
        d="M 0 -20 L 0 -28"
        className="map-hq-3d-beacon-stem"
        strokeWidth={1.4}
      />
    </g>
  );
}

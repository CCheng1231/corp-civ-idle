import type { MapZ1MajorHubMarker } from "../game/worldMapZ1Markers";

interface WorldMapZ1MajorHubMarkersProps {
  markers: MapZ1MajorHubMarker[];
  highlightIndex?: number | null;
  /** Dev placement UI — numbered slots. */
  showLabels?: boolean;
  /** Player view — softer rings over the bake. */
  subdued?: boolean;
}

/** Art-aligned hub targets (viewBox px); hex pins use nearest-cell binding. */
export function WorldMapZ1MajorHubMarkers({
  markers,
  highlightIndex = null,
  showLabels = true,
  subdued = false,
}: WorldMapZ1MajorHubMarkersProps) {
  if (markers.length === 0) return null;

  return (
    <g
      className={[
        "map-z1-major-hub-markers",
        subdued ? "map-z1-major-hub-markers-subdued" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      pointerEvents="none"
      aria-hidden
    >
      {markers.map((m, i) => (
        <g
          key={`z1-major-${i}-${m.x.toFixed(1)}-${m.y.toFixed(1)}`}
          className={
            highlightIndex === i ? "map-z1-major-hub-marker-glow" : undefined
          }
        >
          <circle
            cx={m.x}
            cy={m.y}
            r={22}
            className="map-z1-major-hub-marker-halo"
          />
          <circle
            cx={m.x}
            cy={m.y}
            r={14}
            className="map-z1-major-hub-marker-ring"
          />
          <circle
            cx={m.x}
            cy={m.y}
            r={6}
            className="map-z1-major-hub-marker-core"
          />
          {showLabels ? (
            <text
              x={m.x}
              y={m.y + 5}
              className="map-z1-major-hub-marker-label"
              textAnchor="middle"
            >
              {i + 1}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

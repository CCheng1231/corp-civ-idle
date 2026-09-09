import { useMemo } from "react";
import { buildWorldMapArt, type MapBounds, type MapRoad } from "../game/worldMapArt";

interface WorldMapBaseArtProps {
  bounds: MapBounds;
}

function RoadStroke({ road }: { road: MapRoad }) {
  return (
    <g className={`map-schematic-road map-schematic-road-${road.kind}`}>
      <path
        d={road.d}
        className="map-schematic-road-fill"
        fill="none"
        strokeWidth={road.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {road.kind === "arterial" || road.kind === "collector" ? (
        <path
          d={road.d}
          className="map-schematic-road-ink"
          fill="none"
          strokeWidth={0.75}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
}

/** Illustrated city map — organic roads & water, reference style. */
export function WorldMapBaseArt({ bounds }: WorldMapBaseArtProps) {
  const art = useMemo(
    () => buildWorldMapArt(bounds),
    [bounds.minX, bounds.minY, bounds.width, bounds.height],
  );

  return (
    <g className="map-base-art" pointerEvents="none">
      <path className="map-schematic-land" d={art.land} />

      {art.parks.map((park, i) => (
        <path key={`park-${i}`} className="map-schematic-park" d={park} />
      ))}

      {art.roads.map((road, i) => (
        <RoadStroke key={`road-${i}`} road={road} />
      ))}

      {art.water.map((body, i) => (
        <path key={`water-${i}`} className="map-schematic-water" d={body} />
      ))}

      {art.shorelines.map((line, i) => (
        <path key={`shore-${i}`} className="map-schematic-shore" d={line} />
      ))}

      {art.bridges.map((bridge, i) => (
        <line
          key={`bridge-${i}`}
          className="map-schematic-bridge"
          x1={bridge.x1}
          y1={bridge.y1}
          x2={bridge.x2}
          y2={bridge.y2}
        />
      ))}
    </g>
  );
}

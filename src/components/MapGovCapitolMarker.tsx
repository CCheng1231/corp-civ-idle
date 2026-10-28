import govCapitolBake from "../assets/map/gov-capitol-isometric-bake.png";
import { mapGovCapitolArtSizeFromHexRadius } from "../game/mapViewport";

interface MapGovCapitolMarkerProps {
  x: number;
  y: number;
  hexRadius: number;
}

/** Baked isometric capitol (PBR-style art) at MAP_GOV — see scripts/key-gov-capitol-bake.mjs */
export function MapGovCapitolMarker({ x, y, hexRadius }: MapGovCapitolMarkerProps) {
  const { width, height } = mapGovCapitolArtSizeFromHexRadius(hexRadius);
  const svgX = x - width / 2;
  /** xMidYMax: box bottom ≈ hex center so the plinth reads on-tile */
  const svgY = y - height * 0.96;

  return (
    <image
      href={govCapitolBake}
      x={svgX}
      y={svgY}
      width={width}
      height={height}
      className="map-gov-capitol-bake"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    />
  );
}

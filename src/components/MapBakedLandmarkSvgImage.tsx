import type { MapBakedLandmarkPreset } from "../game/mapBakedLandmark";
import { mapBakedLandmarkSvgImageLayout } from "../game/mapBakedLandmark";

export interface MapBakedLandmarkSvgImageProps {
  /** Hex center in map viewBox coordinates. */
  x: number;
  y: number;
  hexRadius: number;
  preset: MapBakedLandmarkPreset;
  href: string;
  className?: string;
}

/** Baked art inside the world map SVG — locks to hex scale at every zoom. */
export function MapBakedLandmarkSvgImage({
  x,
  y,
  hexRadius,
  preset,
  href,
  className,
}: MapBakedLandmarkSvgImageProps) {
  const { x: svgX, y: svgY, width, height } = mapBakedLandmarkSvgImageLayout(
    x,
    y,
    hexRadius,
    preset,
  );

  return (
    <image
      href={href}
      x={svgX}
      y={svgY}
      width={width}
      height={height}
      className={["map-baked-landmark-svg-image", className].filter(Boolean).join(" ")}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    />
  );
}

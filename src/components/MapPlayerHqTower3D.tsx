import { mapHqTowerPresentationTiltDeg } from "../game/mapViewport";

/** Player HQ — solarpunk canopy (A): glass core + garden pods; mine=green, peer=blue. */

interface MapPlayerHqTower3DProps {
  anchorX: number;
  anchorY: number;
  widthPx: number;
  depthPx: number;
  heightPx: number;
  hexSpanPx: number;
  flashing?: boolean;
  /** Own HQ vs another player's HQ (player color prefs later). */
  variant?: "mine" | "peer";
}

export function MapPlayerHqTower3D({
  anchorX,
  anchorY,
  widthPx,
  depthPx,
  heightPx,
  hexSpanPx,
  flashing,
  variant = "mine",
}: MapPlayerHqTower3DProps) {
  const halfW = widthPx / 2;
  const halfD = depthPx / 2;
  const shadowW = Math.max(12, hexSpanPx * 0.42);
  const tiltDeg = mapHqTowerPresentationTiltDeg(heightPx);

  return (
    <div
      className={[
        "map-hq-tower-3d-anchor",
        "map-hq-tower-3d-style-canopy",
        variant === "peer" ? "map-hq-tower-3d-peer" : "map-hq-tower-3d-mine",
        flashing ? "map-hq-tower-3d-flash" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${anchorX}px`,
        top: `${anchorY}px`,
        ["--hq-height" as string]: `${heightPx}px`,
        ["--hq-width" as string]: `${widthPx}px`,
        ["--hq-depth" as string]: `${depthPx}px`,
        ["--hq-half-w" as string]: `${halfW}px`,
        ["--hq-half-d" as string]: `${halfD}px`,
        ["--hq-shadow-w" as string]: `${shadowW}px`,
        ["--hq-tilt-x" as string]: `${tiltDeg}deg`,
        ["--hq-pod-tilt-x" as string]: `${-tiltDeg}deg`,
        ["--hq-perspective" as string]: `${heightPx * 4.2}px`,
      }}
      aria-hidden
    >
      <div className="map-hq-tower-3d-ground-shadow" />
      <div className="map-hq-tower-3d-rig">
        <div className="map-hq-tower-3d-body">
          <div className="map-hq-tower-3d-face map-hq-tower-3d-core-front" />
          <div className="map-hq-tower-3d-face map-hq-tower-3d-core-back" />
          <div className="map-hq-tower-3d-face map-hq-tower-3d-core-left" />
          <div className="map-hq-tower-3d-face map-hq-tower-3d-core-right" />
          <div className="map-hq-tower-3d-pod map-hq-tower-3d-pod-1" />
          <div className="map-hq-tower-3d-pod map-hq-tower-3d-pod-2" />
          <div className="map-hq-tower-3d-pod map-hq-tower-3d-pod-3" />
        </div>
      </div>
    </div>
  );
}

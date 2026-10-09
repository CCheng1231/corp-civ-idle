import { mapHqTowerPresentationTiltDeg } from "../game/mapViewport";

/**
 * Office tower landmarks — Crossroads (rural) sandstone sketch for all sites.
 * Metro / suburban / hillside alternates: hq-tower-solarpunk-demos.html
 */

interface MapOfficeTower3DProps {
  anchorX: number;
  anchorY: number;
  widthPx: number;
  depthPx: number;
  heightPx: number;
  hexSpanPx: number;
}

export function MapOfficeTower3D({
  anchorX,
  anchorY,
  widthPx,
  depthPx,
  heightPx,
  hexSpanPx,
}: MapOfficeTower3DProps) {
  const halfW = widthPx / 2;
  const halfD = depthPx / 2;
  const shadowW = Math.max(12, hexSpanPx * 0.42);
  const tiltDeg = mapHqTowerPresentationTiltDeg(heightPx);

  return (
    <div
      className="map-hq-tower-3d-anchor map-office-tower-3d map-office-tower-3d-rural"
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
        ["--hq-perspective" as string]: `${heightPx * 4.2}px`,
      }}
      aria-hidden
    >
      <div className="map-hq-tower-3d-ground-shadow" />
      <div className="map-hq-tower-3d-rig">
        <div className="map-hq-tower-3d-body">
          <div className="map-hq-tower-3d-face map-office-tower-3d-front">
            <span className="map-office-tower-3d-crown" />
            <span className="map-office-tower-3d-slot map-office-tower-3d-slot-1" />
            <span className="map-office-tower-3d-slot map-office-tower-3d-slot-2" />
            <span className="map-office-tower-3d-slot map-office-tower-3d-slot-3" />
          </div>
          <div className="map-hq-tower-3d-face map-office-tower-3d-back" />
          <div className="map-hq-tower-3d-face map-office-tower-3d-left" />
          <div className="map-hq-tower-3d-face map-office-tower-3d-right" />
        </div>
      </div>
    </div>
  );
}

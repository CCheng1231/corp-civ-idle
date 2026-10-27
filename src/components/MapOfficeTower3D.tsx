import { mapHqTowerPresentationTiltDeg } from "../game/mapViewport";
import {
  officeTowerVisualStyle,
  type OfficeTowerVisualStyle,
} from "../game/mapWorld";
import type { TowerId } from "../game/types";

interface MapOfficeTower3DProps {
  towerId: TowerId;
  anchorX: number;
  anchorY: number;
  widthPx: number;
  depthPx: number;
  heightPx: number;
  hexSpanPx: number;
  /** Parent `.map-zoom-scale-layer` scale — counter-scaled for crisp CSS 3D */
  mapContentScale: number;
}

function OfficeTowerFrontDetail({ style }: { style: OfficeTowerVisualStyle }) {
  switch (style) {
    case "metro":
      return (
        <>
          <span className="map-office-tower-3d-crown map-office-tower-3d-metro-crown" />
          <span className="map-office-tower-3d-slab map-office-tower-3d-slab-1" />
          <span className="map-office-tower-3d-rim map-office-tower-3d-rim-1" />
          <span className="map-office-tower-3d-slab map-office-tower-3d-slab-2" />
          <span className="map-office-tower-3d-rim map-office-tower-3d-rim-2" />
          <span className="map-office-tower-3d-slab map-office-tower-3d-slab-3" />
        </>
      );
    case "suburban":
      return (
        <>
          <span className="map-office-tower-3d-ribbon map-office-tower-3d-ribbon-1" />
          <span className="map-office-tower-3d-garden map-office-tower-3d-garden-1" />
          <span className="map-office-tower-3d-ribbon map-office-tower-3d-ribbon-2" />
          <span className="map-office-tower-3d-garden map-office-tower-3d-garden-2" />
        </>
      );
    case "rural":
      return (
        <>
          <span className="map-office-tower-3d-crown map-office-tower-3d-rural-crown" />
          <span className="map-office-tower-3d-slot map-office-tower-3d-slot-1" />
          <span className="map-office-tower-3d-slot map-office-tower-3d-slot-2" />
          <span className="map-office-tower-3d-slot map-office-tower-3d-slot-3" />
        </>
      );
    case "countryside":
      return (
        <>
          <span className="map-office-tower-3d-garden-wall" />
          <span className="map-office-tower-3d-lattice" />
          <span className="map-office-tower-3d-glass-edge" />
        </>
      );
  }
}

export function MapOfficeTower3D({
  towerId,
  anchorX,
  anchorY,
  widthPx,
  depthPx,
  heightPx,
  hexSpanPx,
  mapContentScale,
}: MapOfficeTower3DProps) {
  const zoomInv = 1 / Math.max(mapContentScale, 0.05);
  const style = officeTowerVisualStyle(towerId);
  const halfW = widthPx / 2;
  const halfD = depthPx / 2;
  const shadowW = Math.max(12, hexSpanPx * 0.42);
  const tiltDeg = mapHqTowerPresentationTiltDeg(heightPx);

  return (
    <div
      className={`map-hq-tower-3d-anchor map-office-tower-3d map-office-tower-3d-${style}`}
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
        ["--hq-map-zoom-inv" as string]: String(zoomInv),
      }}
      aria-hidden
    >
      <div className="map-hq-tower-3d-ground-shadow" />
      <div className="map-hq-tower-3d-rig">
        <div className="map-hq-tower-3d-body">
          <div className="map-hq-tower-3d-face map-office-tower-3d-front">
            <OfficeTowerFrontDetail style={style} />
          </div>
          <div className="map-hq-tower-3d-face map-office-tower-3d-back" />
          <div className="map-hq-tower-3d-face map-office-tower-3d-left" />
          <div className="map-hq-tower-3d-face map-office-tower-3d-right" />
        </div>
      </div>
    </div>
  );
}

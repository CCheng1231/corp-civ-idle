import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { MapBounds } from "../game/worldMapV01";
import {
  type Z1RasterAlignment,
  z1RasterGroupTransform,
} from "../game/worldMapZ1Align";

import z1BakedArt from "../assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass1-v5.png";
import z1AlignGuideArt from "../assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass2-guide.png";

function mapV01ClipId(bounds: MapBounds): string {
  return `map-v01-clip-${bounds.minX}-${bounds.minY}-${bounds.width}`;
}

function svgPointFromClient(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const mapped = pt.matrixTransform(ctm.inverse());
  return { x: mapped.x, y: mapped.y };
}

interface WorldMapZ1AlignDragLayerProps {
  bounds: MapBounds;
  alignment: Z1RasterAlignment;
  onAlignmentChange?: (next: Z1RasterAlignment) => void;
  showAlignGuide?: boolean;
  showBakedBase?: boolean;
  interactive?: boolean;
}

/**
 * Dev-only: draggable Z1 bake (and optional pass-2 guide) in map content space.
 */
export function WorldMapZ1AlignDragLayer({
  bounds,
  alignment,
  onAlignmentChange,
  showAlignGuide,
  showBakedBase = true,
  interactive = true,
}: WorldMapZ1AlignDragLayerProps) {
  const clipId = mapV01ClipId(bounds);
  const dragRef = useRef<{
    pointerId: number;
    startSvgX: number;
    startSvgY: number;
    originAlign: Z1RasterAlignment;
  } | null>(null);

  const transform = z1RasterGroupTransform(bounds, alignment);

  function onPointerDown(event: ReactPointerEvent<SVGGElement>) {
    if (!interactive || !onAlignmentChange) return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const p = svgPointFromClient(svg, event.clientX, event.clientY);
    if (!p) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startSvgX: p.x,
      startSvgY: p.y,
      originAlign: alignment,
    };
  }

  function onPointerMove(event: ReactPointerEvent<SVGGElement>) {
    if (!interactive || !onAlignmentChange) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    if (!svg) return;
    const p = svgPointFromClient(svg, event.clientX, event.clientY);
    if (!p) return;
    const dx = p.x - drag.startSvgX;
    const dy = p.y - drag.startSvgY;
    onAlignmentChange({
      ...drag.originAlign,
      offsetX: drag.originAlign.offsetX + dx,
      offsetY: drag.originAlign.offsetY + dy,
    });
  }

  function endDrag(event: ReactPointerEvent<SVGGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.stopPropagation();
  }

  return (
    <g
      className={`map-z1-align-drag-layer${interactive ? "" : " map-z1-align-drag-layer-preview"}`}
      clipPath={`url(#${clipId})`}
      transform={transform}
      pointerEvents={interactive ? "auto" : "none"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {showBakedBase ? (
        <image
          className="map-v01-raster-base map-z1-baked-pass1 map-z1-bake-draggable"
          href={z1BakedArt}
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
      {showAlignGuide ? (
        <image
          className="map-z1-align-guide map-z1-bake-draggable"
          href={z1AlignGuideArt}
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.55}
        />
      ) : null}
      {interactive ? (
        <rect
          className="map-z1-align-drag-hit"
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
        />
      ) : null}
    </g>
  );
}

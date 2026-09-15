import { useMemo } from "react";
import type { MapBounds, WorldMapV01ZoomBand } from "../game/worldMapV01";
import { worldMapV01ZoomBand } from "../game/worldMapV01";
import {
  MAP_Z1_LAYER_DEFAULTS,
  mapArtHubPixel,
  mapArtHubSites,
  type MapZ1FilterGroup,
} from "../game/worldMapLayout";
import { buildWorldMapZ1LayerStack } from "../game/worldMapZ1Layers";
import {
  type Z1RasterAlignment,
  resolveZ1RasterAlignment,
  z1RasterGroupTransform,
} from "../game/worldMapZ1Align";

import z1BakedArt from "../assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass1-v5.png";
import z1AlignGuideArt from "../assets/reference/zoom-levels/world-map-z1-hybrid-soft-pass2-guide.png";
import z2Art from "../assets/reference/zoom-levels/world-map-z2-hybrid-soft.png";
import z3Art from "../assets/reference/zoom-levels/world-map-z3-hybrid-soft.png";
import z4Art from "../assets/reference/zoom-levels/world-map-z4-hybrid-soft.png";

const RASTER_BY_BAND: Record<Exclude<WorldMapV01ZoomBand, 1>, string> = {
  2: z2Art,
  3: z3Art,
  4: z4Art,
};

export type MapZ1LayerVisibility = Record<MapZ1FilterGroup, boolean>;

interface WorldMapBaseArtProps {
  bounds: MapBounds;
  zoomRel: number;
  z1LayerVisibility?: Partial<MapZ1LayerVisibility>;
  z1RasterAlign?: Partial<Z1RasterAlignment> | null;
  /** Dev drag mode: bake drawn in overlay layer instead. */
  z1OmitBakedLayer?: boolean;
  /** Dev: pass-2 dots + road centerlines over the bake. */
  z1ShowAlignGuide?: boolean;
  /** Dev: engine landmark pixels (hex hubs). */
  z1ShowEngineHubDots?: boolean;
}

function resolveZ1Visibility(
  partial?: Partial<MapZ1LayerVisibility>,
): MapZ1LayerVisibility {
  return { ...MAP_Z1_LAYER_DEFAULTS, ...partial };
}

function mapV01ClipId(bounds: MapBounds): string {
  return `map-v01-clip-${bounds.minX}-${bounds.minY}-${bounds.width}`;
}

function Z1ClipDefs({ bounds }: { bounds: MapBounds }) {
  const clipId = mapV01ClipId(bounds);
  return (
    <defs>
      <clipPath id={clipId}>
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
        />
      </clipPath>
    </defs>
  );
}

function Z1BakedRaster({
  bounds,
  href,
  className,
  alignment,
  opacity = 1,
}: {
  bounds: MapBounds;
  href: string;
  className: string;
  alignment: Z1RasterAlignment;
  opacity?: number;
}) {
  const clipId = mapV01ClipId(bounds);
  const transform = z1RasterGroupTransform(bounds, alignment);

  return (
    <g
      className={className}
      clipPath={`url(#${clipId})`}
      transform={transform}
      opacity={opacity}
    >
      <image
        href={href}
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        preserveAspectRatio="xMidYMid slice"
      />
    </g>
  );
}

export function WorldMapZ1EngineHubDots() {
  const sites = useMemo(() => mapArtHubSites(), []);

  return (
    <g className="map-z1-engine-hub-dots" pointerEvents="none" aria-hidden>
      {sites.map((site) => {
        const { x, y } = mapArtHubPixel(site);
        return (
          <circle
            key={site.id}
            cx={x}
            cy={y}
            r={6}
            className="map-z1-engine-hub-dot"
            data-hub-id={site.id}
            data-hub-role={site.role}
          />
        );
      })}
    </g>
  );
}

/** Procedural overlays (filters); baked pass-1 v3 covers base terrain when `base` is on. */
function WorldMapZ1ProceduralOverlays({
  bounds,
  visibility,
}: {
  bounds: MapBounds;
  visibility: MapZ1LayerVisibility;
}) {
  const stack = useMemo(() => buildWorldMapZ1LayerStack(bounds), [
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
  ]);

  const procOn =
    visibility.geography ||
    visibility.hubs ||
    visibility.roads ||
    visibility.flavor;
  if (!procOn) return null;

  const clipId = mapV01ClipId(bounds);
  const { govCenter, landGradientRadius, hubGradients } = stack;

  function hubGradientUrl(siteId: string): string {
    const id = `map-z1-hub-grad-${siteId.replace(/[^a-z0-9-]/gi, "-")}`;
    return `url(#${id})`;
  }

  return (
    <g
      className="map-base-art map-v01-z1-proc"
      pointerEvents="none"
      aria-hidden
    >
      <defs>
        <radialGradient
          id="map-z1-land-radial"
          gradientUnits="userSpaceOnUse"
          cx={govCenter.x}
          cy={govCenter.y}
          r={landGradientRadius}
        >
          <stop offset="0%" stopColor="#8fa888" />
          <stop offset="38%" stopColor="#6f8268" />
          <stop offset="72%" stopColor="#5a6b52" />
          <stop offset="100%" stopColor="#465042" />
        </radialGradient>
        {hubGradients.map((g) => (
          <radialGradient
            key={g.id}
            id={g.id}
            gradientUnits="userSpaceOnUse"
            cx={g.cx}
            cy={g.cy}
            r={g.r}
          >
            <stop offset="0%" stopColor={g.innerColor} stopOpacity={0.75} />
            <stop offset="55%" stopColor={g.innerColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={g.outerColor} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>

      {stack.layers.map((layer) => {
        if (!visibility[layer.filterGroup]) return null;
        if (layer.id === "base-land" && visibility.base) return null;
        return (
          <g
            key={layer.id}
            className="map-z1-layer"
            data-filter-group={layer.filterGroup}
            data-layer-id={layer.id}
          >
            {layer.paths.map((path, i) => (
              <path
                key={`${layer.id}-p-${i}`}
                d={path.d}
                className={path.className}
                fill={
                  path.className === "map-z1-land"
                    ? "url(#map-z1-land-radial)"
                    : undefined
                }
                clipPath={`url(#${clipId})`}
              />
            ))}
            {layer.hubs.map((hub) => (
              <path
                key={`${layer.id}-h-${hub.siteId}`}
                d={hub.d}
                className={hub.className}
                fill={hubGradientUrl(hub.siteId)}
                data-hub-id={hub.siteId}
                data-hub-role={hub.role}
                clipPath={`url(#${clipId})`}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function WorldMapZ1Player({
  bounds,
  visibility,
  alignment,
  z1OmitBakedLayer,
  z1ShowAlignGuide,
  z1ShowEngineHubDots,
}: {
  bounds: MapBounds;
  visibility: MapZ1LayerVisibility;
  alignment: Z1RasterAlignment;
  z1OmitBakedLayer?: boolean;
  z1ShowAlignGuide?: boolean;
  z1ShowEngineHubDots?: boolean;
}) {
  return (
    <g className="map-base-art map-v01-z1-baked" pointerEvents="none" aria-hidden>
      <Z1ClipDefs bounds={bounds} />
      {visibility.base && !z1OmitBakedLayer ? (
        <Z1BakedRaster
          bounds={bounds}
          href={z1BakedArt}
          className="map-v01-raster-base map-z1-baked-pass1"
          alignment={alignment}
        />
      ) : null}
      {z1ShowAlignGuide && !z1OmitBakedLayer ? (
        <Z1BakedRaster
          bounds={bounds}
          href={z1AlignGuideArt}
          className="map-z1-align-guide"
          alignment={alignment}
          opacity={0.55}
        />
      ) : null}
      {z1ShowEngineHubDots ? <WorldMapZ1EngineHubDots /> : null}
      <WorldMapZ1ProceduralOverlays bounds={bounds} visibility={visibility} />
    </g>
  );
}

function WorldMapRasterBand({
  bounds,
  band,
}: {
  bounds: MapBounds;
  band: Exclude<WorldMapV01ZoomBand, 1>;
}) {
  const href = RASTER_BY_BAND[band];
  const clipId = mapV01ClipId(bounds);

  return (
    <g className="map-base-art map-v01-raster" pointerEvents="none" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect
            x={bounds.minX}
            y={bounds.minY}
            width={bounds.width}
            height={bounds.height}
          />
        </clipPath>
      </defs>
      <image
        className="map-v01-raster-base"
        href={href}
        data-zoom-band={band}
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clipId})`}
      />
    </g>
  );
}

export function WorldMapBaseArt({
  bounds,
  zoomRel,
  z1LayerVisibility,
  z1RasterAlign,
  z1OmitBakedLayer,
  z1ShowAlignGuide,
  z1ShowEngineHubDots,
}: WorldMapBaseArtProps) {
  const band = worldMapV01ZoomBand(zoomRel);
  const visibility = resolveZ1Visibility(z1LayerVisibility);
  const alignment = resolveZ1RasterAlignment(z1RasterAlign);

  if (band === 1) {
    return (
      <WorldMapZ1Player
        bounds={bounds}
        visibility={visibility}
        alignment={alignment}
        z1OmitBakedLayer={z1OmitBakedLayer}
        z1ShowAlignGuide={z1ShowAlignGuide}
        z1ShowEngineHubDots={z1ShowEngineHubDots}
      />
    );
  }

  return <WorldMapRasterBand bounds={bounds} band={band} />;
}

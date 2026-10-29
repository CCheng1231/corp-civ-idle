import { useMemo } from "react";
import type { GameSettings } from "../game/types";
import { mapZ1FilterGroupVisible } from "../game/mapZ1PlayerFilters";
import type { MapBounds } from "../game/worldMapV01";
import { buildWorldMapZ1LayerStack } from "../game/worldMapZ1Layers";

interface WorldMapZ1ProceduralOverlayProps {
  bounds: MapBounds;
  settings: GameSettings;
}

/** Optional Z1 vector overlays (hub glows, roads, geography) — gated by player filters. */
export function WorldMapZ1ProceduralOverlay({
  bounds,
  settings,
}: WorldMapZ1ProceduralOverlayProps) {
  const stack = useMemo(
    () => buildWorldMapZ1LayerStack(bounds),
    [bounds.minX, bounds.minY, bounds.width, bounds.height],
  );

  const visibleLayers = useMemo(
    () =>
      stack.layers.filter((layer) =>
        mapZ1FilterGroupVisible(settings, layer.filterGroup),
      ),
    [stack.layers, settings.mapZ1LayerFilters],
  );

  const visibleHubSiteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const layer of visibleLayers) {
      for (const hub of layer.hubs) ids.add(hub.siteId);
    }
    return ids;
  }, [visibleLayers]);

  const hubGradients = useMemo(
    () =>
      stack.hubGradients.filter((g) => {
        const siteId = g.id.replace(/^map-z1-hub-grad-/, "");
        return visibleHubSiteIds.has(siteId);
      }),
    [stack.hubGradients, visibleHubSiteIds],
  );

  if (visibleLayers.length === 0) return null;

  const { govCenter, landGradientRadius } = stack;

  return (
    <g className="map-z1-layer-overlay" pointerEvents="none">
      <defs>
        <radialGradient
          id="map-z1-land-radial"
          gradientUnits="userSpaceOnUse"
          cx={govCenter.x}
          cy={govCenter.y}
          r={landGradientRadius}
        >
          <stop offset="0%" stopColor="#a8b89a" />
          <stop offset="52%" stopColor="#7a9068" />
          <stop offset="100%" stopColor="#465240" />
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
            <stop offset="0%" stopColor={g.innerColor} stopOpacity={0.92} />
            <stop offset="100%" stopColor={g.outerColor} stopOpacity={0.15} />
          </radialGradient>
        ))}
      </defs>
      {visibleLayers.map((layer) => (
        <g
          key={layer.id}
          className={`map-z1-layer map-z1-layer-${layer.filterGroup}`}
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
            />
          ))}
          {layer.hubs.map((hub) => {
            const gradId = `map-z1-hub-grad-${hub.siteId.replace(/[^a-z0-9-]/gi, "-")}`;
            return (
              <path
                key={`${layer.id}-h-${hub.siteId}`}
                d={hub.d}
                className={hub.className}
                fill={`url(#${gradId})`}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

import type { GameSettings } from "../game/types";
import { getMapLandmarkArt } from "../game/mapLandmarkArtRegistry";
import {
  resolvePlayerMapLandmarkArtInstances,
  type MapLandmarkArtInstance,
} from "../game/mapLandmarkInstances";
import { mapLandmarkViewBoxAnchor } from "../game/mapLandmarkPresentation";
import { MapBakedLandmarkSvgImageLazy } from "./MapBakedLandmarkSvgImageLazy";
import { MapMajorHubSupertallMarker } from "./MapMajorHubSupertallMarker";

interface MapLandmarkArtLayerProps {
  settings: GameSettings;
  instances?: MapLandmarkArtInstance[];
}

/** All SVG-plane landmark art for the player map (single render pass). */
export function MapLandmarkArtLayer({
  settings,
  instances: instancesProp,
}: MapLandmarkArtLayerProps) {
  const instances =
    instancesProp ?? resolvePlayerMapLandmarkArtInstances(settings);

  return (
    <>
      {instances.map((inst) => {
        const art = getMapLandmarkArt(String(inst.artId));
        if (!art || art.plane !== "svg") return null;

        const anchor = mapLandmarkViewBoxAnchor(inst.footprint, settings);
        const layoutRadius = anchor.layoutSpan / 2;

        if (art.kind === "baked-raster") {
          return (
            <MapBakedLandmarkSvgImageLazy
              key={inst.instanceKey}
              x={anchor.x}
              y={anchor.y}
              hexRadius={layoutRadius}
              preset={art.preset}
              loadHref={art.loadHref}
              className={art.className}
            />
          );
        }

        if (art.kind === "vector-inline" && art.template === "major-hub-supertall") {
          return (
            <MapMajorHubSupertallMarker
              key={inst.instanceKey}
              hubId={inst.variant ?? inst.siteId}
              x={anchor.x}
              y={anchor.y}
              hexRadius={layoutRadius}
            />
          );
        }

        return null;
      })}
    </>
  );
}

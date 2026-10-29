import type { MapSvgAspectFit } from "../game/mapViewport";
import {
  viewBoxToContentPixelScale,
  viewBoxPointToContentPixelWithAspect,
  type MapContentSize,
  type MapViewBounds,
} from "../game/mapViewport";
import type { GameSettings } from "../game/types";
import { getMapLandmarkArt } from "../game/mapLandmarkArtRegistry";
import {
  resolvePlayerMapLandmarkArtInstances,
  type MapLandmarkArtInstance,
} from "../game/mapLandmarkInstances";
import { mapLandmarkViewBoxAnchor } from "../game/mapLandmarkPresentation";
import { mapBakedLandmarkOverlayLayout } from "../game/mapBakedLandmark";
import { MapBakedLandmarkOverlayImageLazy } from "./MapBakedLandmarkOverlayImageLazy";

interface MapBakedLandmarkOverlayLayerProps {
  settings: GameSettings;
  mapViewBounds: MapViewBounds;
  mapContentSize: MapContentSize;
  mapSvgAspect: MapSvgAspectFit;
  mapContentScale: number;
  instances?: MapLandmarkArtInstance[];
}

/** Baked landmark rasters — HTML overlay for full @2x sharpness on the zoom stack. */
export function MapBakedLandmarkOverlayLayer({
  settings,
  mapViewBounds,
  mapContentSize,
  mapSvgAspect,
  mapContentScale,
  instances: instancesProp,
}: MapBakedLandmarkOverlayLayerProps) {
  const instances =
    instancesProp ?? resolvePlayerMapLandmarkArtInstances(settings);
  const vbScale = viewBoxToContentPixelScale(
    mapViewBounds,
    mapContentSize,
    mapSvgAspect,
  );

  return (
    <>
      {instances.map((inst) => {
        const art = getMapLandmarkArt(String(inst.artId));
        if (!art || art.kind !== "baked-raster") return null;

        const anchor = mapLandmarkViewBoxAnchor(inst.footprint, settings);
        const viewAnchor = { x: anchor.x, y: anchor.y };
        const { x: hexCenterXContent, y: hexCenterContentY } =
          viewBoxPointToContentPixelWithAspect(
            viewAnchor,
            mapViewBounds,
            mapContentSize,
            mapSvgAspect,
          );
        const layout = mapBakedLandmarkOverlayLayout(
          hexCenterXContent,
          hexCenterContentY,
          anchor.hexRadius,
          vbScale,
          art.preset,
        );

        return (
          <MapBakedLandmarkOverlayImageLazy
            key={inst.instanceKey}
            {...layout}
            mapContentScale={mapContentScale}
            preset={art.preset}
            loadHref={art.loadHref}
            className={art.className}
          />
        );
      })}
    </>
  );
}

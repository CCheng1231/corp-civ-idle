import type { GameSettings } from "../game/types";
import { getMapLandmarkArt } from "../game/mapLandmarkArtRegistry";
import {
  resolvePlayerMapLandmarkArtInstances,
  type MapLandmarkArtInstance,
} from "../game/mapLandmarkInstances";

interface MapLandmarkArtLayerProps {
  settings: GameSettings;
  instances?: MapLandmarkArtInstance[];
}

/** Reserved for future inline SVG landmarks (major hubs are baked overlay now). */
export function MapLandmarkArtLayer(_props: MapLandmarkArtLayerProps) {
  return null;
}

export function resolveMapLandmarkOverlayInstances(
  settings: GameSettings,
  extra?: MapLandmarkArtInstance[],
): MapLandmarkArtInstance[] {
  return [
    ...resolvePlayerMapLandmarkArtInstances(settings),
    ...(extra ?? []),
  ];
}

export function overlayArtForInstance(
  inst: MapLandmarkArtInstance,
): ReturnType<typeof getMapLandmarkArt> {
  return getMapLandmarkArt(String(inst.artId));
}

import { useEffect, useState } from "react";
import type { MapBakedLandmarkPreset } from "../game/mapBakedLandmark";
import { MapBakedLandmarkOverlayImage } from "./MapBakedLandmarkOverlayImage";

export interface MapBakedLandmarkOverlayImageLazyProps {
  footCenterXContent: number;
  footYContent: number;
  widthContent: number;
  heightContent: number;
  mapContentScale: number;
  preset: MapBakedLandmarkPreset;
  loadHref: () => Promise<string>;
  className?: string;
}

export function MapBakedLandmarkOverlayImageLazy({
  loadHref,
  preset: _preset,
  ...layout
}: MapBakedLandmarkOverlayImageLazyProps) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadHref().then((url) => {
      if (!cancelled) setHref(url);
    });
    return () => {
      cancelled = true;
    };
  }, [loadHref]);

  if (!href) return null;

  return <MapBakedLandmarkOverlayImage {...layout} href={href} />;
}

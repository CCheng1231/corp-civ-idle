import { useEffect, useState } from "react";
import type { MapBakedLandmarkPreset } from "../game/mapBakedLandmark";
import { MapBakedLandmarkSvgImage } from "./MapBakedLandmarkSvgImage";

export interface MapBakedLandmarkSvgImageLazyProps {
  x: number;
  y: number;
  hexRadius: number;
  preset: MapBakedLandmarkPreset;
  loadHref: () => Promise<string>;
  className?: string;
}

export function MapBakedLandmarkSvgImageLazy({
  loadHref,
  ...layout
}: MapBakedLandmarkSvgImageLazyProps) {
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

  return <MapBakedLandmarkSvgImage {...layout} href={href} />;
}

export interface MapBakedLandmarkOverlayImageProps {
  footCenterXContent: number;
  footYContent: number;
  widthContent: number;
  heightContent: number;
  mapContentScale: number;
  href: string;
  className?: string;
}

/** Crisp @2x bake on the player map — counter-scales parent map zoom like HQ towers. */
export function MapBakedLandmarkOverlayImage({
  footCenterXContent,
  footYContent,
  widthContent,
  heightContent,
  mapContentScale,
  href,
  className,
}: MapBakedLandmarkOverlayImageProps) {
  const zoom = Math.max(mapContentScale, 0.05);
  const zoomInv = 1 / zoom;
  const widthScreen = widthContent * zoom;
  const heightScreen = heightContent * zoom;

  return (
    <div
      className="map-baked-landmark-overlay-anchor"
      style={{
        left: `${footCenterXContent}px`,
        top: `${footYContent}px`,
        ["--map-baked-zoom-inv" as string]: String(zoomInv),
      }}
      aria-hidden
    >
      <img
        className={["map-baked-landmark-overlay-img", className]
          .filter(Boolean)
          .join(" ")}
        src={href}
        alt=""
        width={Math.round(widthScreen)}
        height={Math.round(heightScreen)}
        draggable={false}
      />
    </div>
  );
}

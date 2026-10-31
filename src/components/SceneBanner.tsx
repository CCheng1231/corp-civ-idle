import { DraggableTabPortraitFrame } from "./DraggableTabPortraitFrame";

interface SceneBannerProps {
  src: string;
  /** Required when pannable (default). */
  storageKey?: string;
  panZoomFactor?: number;
  focalYPercent?: number;
  focalXPercent?: number;
  /** Draggable category strip; false = fixed crop (legacy category art). */
  pannable?: boolean;
}

/** Short scene strip for Home / Build category headers. */
export function SceneBanner({
  src,
  storageKey,
  panZoomFactor,
  focalYPercent = 42,
  focalXPercent = 50,
  pannable = true,
}: SceneBannerProps) {
  if (!pannable) {
    return (
      <div className="scene-banner scene-banner--static">
        <img
          src={src}
          alt=""
          draggable={false}
          className="scene-banner-static-img"
          style={{
            objectPosition: `${focalXPercent}% ${focalYPercent}%`,
          }}
          aria-hidden
        />
      </div>
    );
  }

  if (!storageKey) {
    throw new Error("SceneBanner: storageKey required when pannable");
  }

  return (
    <div className="scene-banner">
      <DraggableTabPortraitFrame
        src={src}
        panStorageKey={storageKey}
        focalYPercent={focalYPercent}
        focalXPercent={focalXPercent}
        panZoomFactor={panZoomFactor}
      />
    </div>
  );
}

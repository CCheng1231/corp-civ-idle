import { DraggableTabPortraitFrame } from "./DraggableTabPortraitFrame";

interface SceneBannerProps {
  src: string;
  storageKey: string;
}

/** Short full-width pannable scene strip (Home / Office category art). */
export function SceneBanner({ src, storageKey }: SceneBannerProps) {
  return (
    <div className="scene-banner">
      <DraggableTabPortraitFrame
        src={src}
        panStorageKey={storageKey}
        focalYPercent={42}
      />
    </div>
  );
}

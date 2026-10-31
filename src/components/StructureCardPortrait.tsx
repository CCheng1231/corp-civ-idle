import {
  structureCardPortraitStripZoom,
  type StructureArtCrop,
} from "../game/structureEssentialsArt";

interface StructureCardPortraitProps {
  src: string;
  crop: StructureArtCrop;
}

/** Fixed crop on Build cards (not draggable — tune in review JSON). Strip size: `--progression-compact-portrait-*` in CSS (office desk reference). */
export function StructureCardPortrait({ src, crop }: StructureCardPortraitProps) {
  const { focalXPercent, focalYPercent } = crop;
  const stripZoom = structureCardPortraitStripZoom(crop);
  return (
    <div
      className="recruitment-card-portrait structure-card-portrait--scene"
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        draggable={false}
        style={{
          objectPosition: `${focalXPercent}% ${focalYPercent}%`,
          transform: `scale(${stripZoom})`,
          transformOrigin: `${focalXPercent}% ${focalYPercent}%`,
        }}
      />
    </div>
  );
}

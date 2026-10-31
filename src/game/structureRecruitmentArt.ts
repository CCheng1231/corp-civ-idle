import type { StructureId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: keep in sync with docs/structure-category-review/recruitment-wire-defaults.js
import recruitmentCategoryBanner from "../assets/structure-art/recruitment-category-banner.jpg";
import recruitmentDesk from "../assets/structure-art/recruitment-desk.jpg";
import recruitmentMitRoom from "../assets/structure-art/recruitment-mit-room.jpg";

/** Recruitment category header (draggable pan). Pass 2 v1 finals. */
export const RECRUITMENT_CATEGORY_BANNER = {
  src: recruitmentCategoryBanner,
  storageKey: "corp-civ-idle-office-recruitment-art-pan",
  crop: {
    panZoomFactor: 1.48,
    focalYPercent: 63,
    focalXPercent: 100,
  } satisfies StructureArtCrop,
} as const;

const RECRUITMENT_PORTRAITS: Partial<
  Record<
    StructureId,
    {
      src: string;
      crop: StructureArtCrop;
    }
  >
> = {
  recruitment_desk: {
    src: recruitmentDesk,
    crop: { panZoomFactor: 2.38, focalYPercent: 28, focalXPercent: 42 },
  },
  mit_room: {
    src: recruitmentMitRoom,
    crop: { panZoomFactor: 1.14, focalYPercent: 61, focalXPercent: 19 },
  },
};

export function structureRecruitmentPortrait(
  structureId: StructureId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = RECRUITMENT_PORTRAITS[structureId];
  if (!entry) return null;
  return entry;
}

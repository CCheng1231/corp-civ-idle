import type { StructureId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: keep in sync with docs/structure-category-review/departments-wire-defaults.js
import departmentsCategoryBanner from "../assets/structure-art/departments-category-banner.jpg";
import departmentsDeptB2b from "../assets/structure-art/departments-dept-b2b.jpg";
import departmentsBreakRoom from "../assets/structure-art/departments-break-room.jpg";
import departmentsSocialMedia from "../assets/structure-art/departments-social-media.jpg";
import departmentsVideoProductionStudio from "../assets/structure-art/departments-video-production-studio.jpg";
import departmentsPressRoom from "../assets/structure-art/departments-press-room.jpg";

/** Departments category header (draggable pan). Pass 2 v4 finals. */
export const DEPARTMENTS_CATEGORY_BANNER = {
  src: departmentsCategoryBanner,
  storageKey: "corp-civ-idle-office-departments-art-pan",
  crop: {
    panZoomFactor: 1.48,
    focalYPercent: 47,
    focalXPercent: 21,
  } satisfies StructureArtCrop,
} as const;

const DEPARTMENTS_PORTRAITS: Partial<
  Record<
    StructureId,
    {
      src: string;
      crop: StructureArtCrop;
    }
  >
> = {
  dept_b2b: {
    src: departmentsDeptB2b,
    crop: { panZoomFactor: 1.38, focalYPercent: 32, focalXPercent: 48 },
  },
  break_room: {
    src: departmentsBreakRoom,
    crop: { panZoomFactor: 1.38, focalYPercent: 84, focalXPercent: 33 },
  },
  social_media: {
    src: departmentsSocialMedia,
    crop: { panZoomFactor: 1.48, focalYPercent: 34, focalXPercent: 57 },
  },
  video_production_studio: {
    src: departmentsVideoProductionStudio,
    crop: { panZoomFactor: 1.92, focalYPercent: 30, focalXPercent: 41 },
  },
  press_room: {
    src: departmentsPressRoom,
    crop: { panZoomFactor: 1.92, focalYPercent: 37, focalXPercent: 54 },
  },
};

export function structureDepartmentsPortrait(
  structureId: StructureId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = DEPARTMENTS_PORTRAITS[structureId];
  if (!entry) return null;
  return entry;
}

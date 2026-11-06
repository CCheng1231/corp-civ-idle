import type { StructureId } from "./types";
// Crop defaults: keep in sync with docs/structure-category-review/essentials-wire-defaults.js
import essentialsCategoryBanner from "../assets/structure-art/essentials-category-banner.png";
import essentialsOfficeDesk from "../assets/structure-art/essentials-office-desk.jpg";
import essentialsOfficeSupply from "../assets/structure-art/essentials-office-supply.jpg";
import departmentsDeptB2b from "../assets/structure-art/departments-dept-b2b.jpg";
import departmentsBreakRoom from "../assets/structure-art/departments-break-room.jpg";
import departmentsSocialMedia from "../assets/structure-art/departments-social-media.jpg";
import departmentsVideoProductionStudio from "../assets/structure-art/departments-video-production-studio.jpg";
import departmentsPressRoom from "../assets/structure-art/departments-press-room.jpg";

export interface StructureArtCrop {
  panZoomFactor: number;
  focalYPercent: number;
  focalXPercent: number;
}

/** Essentials category header (draggable pan). */
export const ESSENTIALS_CATEGORY_BANNER = {
  src: essentialsCategoryBanner,
  storageKey: "corp-civ-idle-office-essentials-art-pan",
  crop: {
    panZoomFactor: 1.48,
    focalYPercent: 47,
    focalXPercent: 21,
  } satisfies StructureArtCrop,
} as const;

const ESSENTIALS_PORTRAITS: Partial<
  Record<
    StructureId,
    {
      src: string;
      crop: StructureArtCrop;
    }
  >
> = {
  office_desk: {
    src: essentialsOfficeDesk,
    crop: { panZoomFactor: 1.92, focalYPercent: 58, focalXPercent: 55 },
  },
  office_supply: {
    src: essentialsOfficeSupply,
    crop: { panZoomFactor: 2.18, focalYPercent: 47, focalXPercent: 47 },
  },
  outreach_program: {
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

/** office_desk panZoom — target vertical fill for scene thumbs in the card strip. */
export const STRUCTURE_CARD_PORTRAIT_DESK_ZOOM =
  ESSENTIALS_PORTRAITS.office_desk!.crop.panZoomFactor;

/** Boost low zoom crops (e.g. company statue) so strip fill matches office desk. */
export function structureCardPortraitStripZoom(crop: StructureArtCrop): number {
  const deskZoom = STRUCTURE_CARD_PORTRAIT_DESK_ZOOM;
  if (crop.panZoomFactor >= deskZoom - 0.04) return crop.panZoomFactor;
  if (crop.panZoomFactor >= 1.62) return crop.panZoomFactor;
  return deskZoom;
}

export function structureEssentialsPortrait(
  structureId: StructureId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = ESSENTIALS_PORTRAITS[structureId];
  if (!entry) return null;
  return entry;
}

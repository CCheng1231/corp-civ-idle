import type { StructureId } from "./types";
// Crop defaults: keep in sync with docs/structure-category-review/essentials-wire-defaults.js
import essentialsCategoryBanner from "../assets/structure-art/essentials-category-banner.png";
import essentialsOfficeDesk from "../assets/structure-art/essentials-office-desk.jpg";
import essentialsBankAccount from "../assets/structure-art/essentials-bank-account.jpg";
import essentialsOfficeSupply from "../assets/structure-art/essentials-office-supply.jpg";
import essentialsStorageRoom from "../assets/structure-art/essentials-storage-room.jpg";
import essentialsCompanyStatue from "../assets/structure-art/essentials-company-statue.jpg";

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
  bank_account: {
    src: essentialsBankAccount,
    crop: { panZoomFactor: 1.7, focalYPercent: 67, focalXPercent: 50 },
  },
  office_supply: {
    src: essentialsOfficeSupply,
    crop: { panZoomFactor: 2.18, focalYPercent: 47, focalXPercent: 47 },
  },
  storage_room: {
    src: essentialsStorageRoom,
    crop: { panZoomFactor: 2, focalYPercent: 44, focalXPercent: 29 },
  },
  company_statue: {
    src: essentialsCompanyStatue,
    crop: { panZoomFactor: 1.82, focalYPercent: 25, focalXPercent: 50 },
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

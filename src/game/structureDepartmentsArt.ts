import type { StructureId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
import essentialsBankAccount from "../assets/structure-art/essentials-bank-account.jpg";
import essentialsStorageRoom from "../assets/structure-art/essentials-storage-room.jpg";
import essentialsCompanyStatue from "../assets/structure-art/essentials-company-statue.jpg";
import departmentsCategoryBanner from "../assets/structure-art/departments-category-banner.jpg";
import departmentsOfficeExpansion from "../assets/structure-art/departments-office-expansion.jpg";

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
  office_expansion: {
    src: departmentsOfficeExpansion,
    crop: { panZoomFactor: 1.92, focalYPercent: 53, focalXPercent: 76 },
  },
  dept_finance: {
    src: essentialsBankAccount,
    crop: { panZoomFactor: 1.7, focalYPercent: 67, focalXPercent: 50 },
  },
  dept_logistics: {
    src: essentialsStorageRoom,
    crop: { panZoomFactor: 2, focalYPercent: 44, focalXPercent: 29 },
  },
  company_statue: {
    src: essentialsCompanyStatue,
    crop: { panZoomFactor: 1.82, focalYPercent: 25, focalXPercent: 50 },
  },
};

export function structureDepartmentsPortrait(
  structureId: StructureId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = DEPARTMENTS_PORTRAITS[structureId];
  if (!entry) return null;
  return entry;
}

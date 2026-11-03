import type { ContractorCategoryId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: keep in sync with docs/unit-portrait-review/recruit-contractor-wire-defaults.js
import recruitFarmingArt from "../assets/Recruit_resource.png";
import recruitDefenseArt from "../assets/Recruit_defend.jpg";
import recruitIntelArt from "../assets/Recruit_Intel.png";
import recruitSupportArt from "../assets/Recruit_Support.png";
import recruitSpecialArt from "../assets/Recruit_Special.webp";

export interface RecruitContractorCategoryBanner {
  src: string;
  storageKey: string;
  crop: StructureArtCrop;
}

/** Recruit tab category headers (9.5×2.82rem strip). Legacy hero art until Pass 2 banner JPGs land. */
export const RECRUIT_CONTRACTOR_CATEGORY_BANNERS: Record<
  ContractorCategoryId,
  RecruitContractorCategoryBanner
> = {
  farming: {
    src: recruitFarmingArt,
    storageKey: "corp-civ-idle-recruit-farming-art-pan",
    crop: { panZoomFactor: 1.78, focalYPercent: 38, focalXPercent: 48 },
  },
  defense: {
    src: recruitDefenseArt,
    storageKey: "corp-civ-idle-recruit-defense-art-pan",
    crop: { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 52 },
  },
  intel: {
    src: recruitIntelArt,
    storageKey: "corp-civ-idle-recruit-intel-art-pan",
    crop: { panZoomFactor: 1.78, focalYPercent: 40, focalXPercent: 50 },
  },
  support: {
    src: recruitSupportArt,
    storageKey: "corp-civ-idle-recruit-support-art-pan",
    crop: { panZoomFactor: 1.78, focalYPercent: 41, focalXPercent: 50 },
  },
  special: {
    src: recruitSpecialArt,
    storageKey: "corp-civ-idle-recruit-special-art-pan",
    crop: { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 50 },
  },
};

export function recruitContractorCategoryBanner(
  category: ContractorCategoryId,
): RecruitContractorCategoryBanner {
  return RECRUIT_CONTRACTOR_CATEGORY_BANNERS[category];
}

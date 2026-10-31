import type { ResearchId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: docs/research-category-review/operations-wire-defaults.js
import researchOperationsCategoryBanner from "../assets/research-art/research-operations-category-banner.jpg";
import researchOperationsBranchManagement from "../assets/research-art/research-operations-branch-management.jpg";
import researchOperationsPortfolioManagement from "../assets/research-art/research-operations-portfolio-management.jpg";
import researchOperationsMassiveExpansion from "../assets/research-art/research-operations-massive-expansion.jpg";

/** Operations category — Pass 2 v1 finals. */
export const RESEARCH_OPERATIONS_CATEGORY_BANNER = {
  src: researchOperationsCategoryBanner,
  storageKey: "corp-civ-idle-research-unlock-art-pan",
  crop: {
    panZoomFactor: 1.58,
    focalYPercent: 52,
    focalXPercent: 50,
  } satisfies StructureArtCrop,
} as const;

const RESEARCH_OPERATIONS_PORTRAITS: Partial<
  Record<ResearchId, { src: string; crop: StructureArtCrop }>
> = {
  branch_management: {
    src: researchOperationsBranchManagement,
    crop: { panZoomFactor: 2.6, focalYPercent: 49, focalXPercent: 33 },
  },
  portfolio_management: {
    src: researchOperationsPortfolioManagement,
    crop: { panZoomFactor: 1.82, focalYPercent: 43, focalXPercent: 47 },
  },
  massive_expansion: {
    src: researchOperationsMassiveExpansion,
    crop: { panZoomFactor: 1.78, focalYPercent: 47, focalXPercent: 46 },
  },
};

export function researchOperationsPortrait(
  researchId: ResearchId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = RESEARCH_OPERATIONS_PORTRAITS[researchId];
  if (!entry) return null;
  return entry;
}

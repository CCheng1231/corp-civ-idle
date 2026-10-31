import type { ResearchId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: docs/research-category-review/payouts-wire-defaults.js
import researchPayoutsCategoryBanner from "../assets/research-art/research-payouts-category-banner.jpg";
import researchBidModeling from "../assets/research-art/research-bid-modeling.jpg";

/** Project payouts category — Pass 2 v4 finals. */
export const RESEARCH_PAYOUTS_CATEGORY_BANNER = {
  src: researchPayoutsCategoryBanner,
  storageKey: "corp-civ-idle-research-mult-art-pan",
  crop: {
    panZoomFactor: 1.62,
    focalYPercent: 30,
    focalXPercent: 50,
  } satisfies StructureArtCrop,
} as const;

const RESEARCH_PAYOUTS_PORTRAITS: Partial<
  Record<ResearchId, { src: string; crop: StructureArtCrop }>
> = {
  bid_modeling: {
    src: researchBidModeling,
    crop: { panZoomFactor: 2.34, focalYPercent: 26, focalXPercent: 62 },
  },
};

export function researchPayoutsPortrait(
  researchId: ResearchId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = RESEARCH_PAYOUTS_PORTRAITS[researchId];
  if (!entry) return null;
  return entry;
}

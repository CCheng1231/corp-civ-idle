import type { ResearchId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: docs/research-category-review/resources-wire-defaults.js
import researchResourcesCategoryBanner from "../assets/research-art/research-resources-category-banner.jpg";
import researchEffManualsCash from "../assets/research-art/research-eff-manuals-cash.jpg";
import researchEffManualsSup from "../assets/research-art/research-eff-manuals-sup.jpg";
import researchEffManualsCon from "../assets/research-art/research-eff-manuals-con.jpg";
import researchEffManualsMood from "../assets/research-art/research-eff-manuals-mood.jpg";
import researchEffManualsRep from "../assets/research-art/research-eff-manuals-rep.jpg";
import researchEffManualsGrep from "../assets/research-art/research-eff-manuals-grep.jpg";
import researchPlanningAhead from "../assets/research-art/research-planning-ahead.jpg";

/** Resource efficiency category — Pass 2 v2 finals. */
export const RESEARCH_RESOURCES_CATEGORY_BANNER = {
  src: researchResourcesCategoryBanner,
  storageKey: "corp-civ-idle-research-resources-art-pan",
  crop: {
    panZoomFactor: 1.78,
    focalYPercent: 42,
    focalXPercent: 21,
  } satisfies StructureArtCrop,
} as const;

const RESEARCH_RESOURCES_PORTRAITS: Partial<
  Record<ResearchId, { src: string; crop: StructureArtCrop }>
> = {
  eff_manuals_cash: {
    src: researchEffManualsCash,
    crop: { panZoomFactor: 1.8, focalYPercent: 25, focalXPercent: 40 },
  },
  eff_manuals_sup: {
    src: researchEffManualsSup,
    crop: { panZoomFactor: 1.92, focalYPercent: 25, focalXPercent: 56 },
  },
  eff_manuals_con: {
    src: researchEffManualsCon,
    crop: { panZoomFactor: 1.76, focalYPercent: 35, focalXPercent: 37 },
  },
  eff_manuals_mood: {
    src: researchEffManualsMood,
    crop: { panZoomFactor: 1.66, focalYPercent: 26, focalXPercent: 27 },
  },
  eff_manuals_rep: {
    src: researchEffManualsRep,
    crop: { panZoomFactor: 1.56, focalYPercent: 32, focalXPercent: 44 },
  },
  eff_manuals_grep: {
    src: researchEffManualsGrep,
    crop: { panZoomFactor: 1.92, focalYPercent: 27, focalXPercent: 54 },
  },
  planning_ahead: {
    src: researchPlanningAhead,
    crop: { panZoomFactor: 1.68, focalYPercent: 9, focalXPercent: 66 },
  },
};

export function researchResourcesPortrait(
  researchId: ResearchId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = RESEARCH_RESOURCES_PORTRAITS[researchId];
  if (!entry) return null;
  return entry;
}

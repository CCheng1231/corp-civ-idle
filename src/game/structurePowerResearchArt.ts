import type { StructureId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: keep in sync with docs/structure-category-review/power-research-wire-defaults.js
import powerResearchCategoryBanner from "../assets/structure-art/power-research-category-banner.jpg";
import powerResearchPowerPanel from "../assets/structure-art/power-research-power-panel.jpg";
import powerResearchElectricityGenerator from "../assets/structure-art/power-research-electricity-generator.jpg";
import powerResearchDeptRnd from "../assets/structure-art/power-research-dept-rnd.jpg";

/** Power & research category header (draggable pan). Pass 2 v4 finals. */
export const POWER_RESEARCH_CATEGORY_BANNER = {
  src: powerResearchCategoryBanner,
  storageKey: "corp-civ-idle-office-power-research-art-pan",
  crop: {
    panZoomFactor: 1.48,
    focalYPercent: 47,
    focalXPercent: 21,
  } satisfies StructureArtCrop,
} as const;

const POWER_RESEARCH_PORTRAITS: Partial<
  Record<
    StructureId,
    {
      src: string;
      crop: StructureArtCrop;
    }
  >
> = {
  power_panel: {
    src: powerResearchPowerPanel,
    crop: { panZoomFactor: 1.24, focalYPercent: 54, focalXPercent: 56 },
  },
  electricity_generator: {
    src: powerResearchElectricityGenerator,
    crop: { panZoomFactor: 1.78, focalYPercent: 28, focalXPercent: 77 },
  },
  dept_rnd: {
    src: powerResearchDeptRnd,
    crop: { panZoomFactor: 1.88, focalYPercent: 22, focalXPercent: 58 },
  },
};

export function structurePowerResearchPortrait(
  structureId: StructureId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = POWER_RESEARCH_PORTRAITS[structureId];
  if (!entry) return null;
  return entry;
}

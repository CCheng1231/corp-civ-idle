import type { ResearchId } from "./types";
import type { StructureArtCrop } from "./structureEssentialsArt";
// Crop defaults: docs/research-category-review/discover-wire-defaults.js
import researchDiscoverCategoryBanner from "../assets/research-art/research-discover-category-banner.jpg";
import researchDiscoverVideoStudio from "../assets/research-art/research-discover-video-studio.jpg";
import researchDiscoverPressRoom from "../assets/research-art/research-discover-press-room.jpg";
import researchDiscoverCompanyStatue from "../assets/research-art/research-discover-company-statue.jpg";
import researchDiscoverElectricityGenerator from "../assets/research-art/research-discover-electricity-generator.jpg";
import researchDiscoverMitRoom from "../assets/research-art/research-discover-mit-room.jpg";

/** Discover structures category — Pass 2 v1 finals. */
export const RESEARCH_DISCOVER_CATEGORY_BANNER = {
  src: researchDiscoverCategoryBanner,
  storageKey: "corp-civ-idle-research-discover-art-pan",
  crop: {
    panZoomFactor: 1.56,
    focalYPercent: 42,
    focalXPercent: 50,
  } satisfies StructureArtCrop,
} as const;

const RESEARCH_DISCOVER_PORTRAITS: Partial<
  Record<ResearchId, { src: string; crop: StructureArtCrop }>
> = {
  discover_video_studio: {
    src: researchDiscoverVideoStudio,
    crop: { panZoomFactor: 1.5, focalYPercent: 37, focalXPercent: 60 },
  },
  discover_press_room: {
    src: researchDiscoverPressRoom,
    crop: { panZoomFactor: 2.6, focalYPercent: 31, focalXPercent: 67 },
  },
  discover_company_statue: {
    src: researchDiscoverCompanyStatue,
    crop: { panZoomFactor: 1.68, focalYPercent: 32, focalXPercent: 51 },
  },
  discover_electricity_generator: {
    src: researchDiscoverElectricityGenerator,
    crop: { panZoomFactor: 1.92, focalYPercent: 51, focalXPercent: 56 },
  },
  discover_mit_room: {
    src: researchDiscoverMitRoom,
    crop: { panZoomFactor: 1.92, focalYPercent: 58, focalXPercent: 55 },
  },
};

export function researchDiscoverPortrait(
  researchId: ResearchId,
): { src: string; crop: StructureArtCrop } | null {
  const entry = RESEARCH_DISCOVER_PORTRAITS[researchId];
  if (!entry) return null;
  return entry;
}

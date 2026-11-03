/**
 * Recruit tab contractor category banners (5 sections).
 * Keep in sync with `src/game/recruitContractorCategoryArt.ts`.
 * Pass 2: replace `src` with cropped JPGs in `src/assets/recruit-art/` when ready.
 */
(function (root) {
  const BANNER_STRIP = { widthRem: 9.5, heightRem: 2.82 };

  const DEFAULTS = {
    panZoomFactor: 1.78,
    focalYPercent: 42,
    focalXPercent: 50,
  };

  const FINALS = {
    farming: { panZoomFactor: 1.78, focalYPercent: 38, focalXPercent: 48 },
    defense: { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 52 },
    intel: { panZoomFactor: 1.78, focalYPercent: 40, focalXPercent: 50 },
    support: { panZoomFactor: 1.78, focalYPercent: 41, focalXPercent: 50 },
    special: { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 50 },
  };

  root.RecruitContractorWireDefaults = {
    BANNER_STRIP,
    DEFAULTS,
    FINALS,
  };
})(typeof window !== "undefined" ? window : globalThis);

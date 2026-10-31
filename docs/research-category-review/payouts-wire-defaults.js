(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };
  const BANNER = { panZoomFactor: 1.62, focalYPercent: 30, focalXPercent: 50 };
  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 2.34,
    focalYPercent: 26,
    focalXPercent: 62,
  };
  const FINALS_PROJECTS = { bid_modeling: { ...OFFICE_DESK_REFERENCE } };
  const DESK_ZOOM = OFFICE_DESK_REFERENCE.panZoomFactor;
  const initDefaultsByCropId = {};

  function structureCardPortraitStripZoom(crop) {
    if (crop.panZoomFactor >= DESK_ZOOM - 0.04) return crop.panZoomFactor;
    if (crop.panZoomFactor >= 1.62) return crop.panZoomFactor;
    return DESK_ZOOM;
  }

  function rememberInitDefaults(cropId, defaults) {
    initDefaultsByCropId[cropId] = { ...defaults };
  }
  function getInitDefaults(cropId) {
    if (initDefaultsByCropId[cropId]) return { ...initDefaultsByCropId[cropId] };
    return getReviewCropDefaults(cropId);
  }
  function getReviewCropDefaults(cropId) {
    if (cropId === "finals-banner" || cropId.startsWith("pass2-banner:")) {
      return { ...BANNER };
    }
    const finals = cropId.match(/^finals-(.+)$/);
    if (finals && FINALS_PROJECTS[finals[1]]) return { ...FINALS_PROJECTS[finals[1]] };
    if (/^pass2-v\d+:research-bid-modeling/.test(cropId)) {
      return { ...OFFICE_DESK_REFERENCE };
    }
    return { ...BANNER };
  }
  function isStructureCardCropId(cropId) {
    return /^finals-(?!banner)/.test(cropId) || /^pass2-v\d+:research-bid-modeling/.test(cropId);
  }
  function formatFinalsTypeScript(cropsById) {
    return [
      "// RESEARCH_PAYOUTS_BANNER.crop:",
      JSON.stringify(cropsById["finals-banner"] || BANNER, null, 2),
      "// bid_modeling:",
      JSON.stringify(cropsById["finals-bid_modeling"] || OFFICE_DESK_REFERENCE, null, 2),
    ].join("\n");
  }

  root.RESEARCH_PAYOUTS_WIRE = {
    STRIP,
    BANNER,
    OFFICE_DESK_REFERENCE,
    FINALS_PROJECTS,
    structureCardPortraitStripZoom,
    getReviewCropDefaults,
    getInitDefaults,
    rememberInitDefaults,
    isStructureCardCropId,
    formatFinalsTypeScript,
  };
})(window);

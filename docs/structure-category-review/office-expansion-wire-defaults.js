/**
 * Office Expansion card strip — review crops (5.4×8.5rem).
 * Paste winner into `structureDepartmentsArt.ts` → `office_expansion`.
 */
(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };

  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };

  const VERSION_DEFAULTS = {
    1: { panZoomFactor: 1.48, focalYPercent: 38, focalXPercent: 52 },
    2: { panZoomFactor: 1.52, focalYPercent: 42, focalXPercent: 48 },
    3: { panZoomFactor: 1.58, focalYPercent: 36, focalXPercent: 55 },
    4: { panZoomFactor: 1.55, focalYPercent: 40, focalXPercent: 50 },
  };

  const FINALS_OFFICE_EXPANSION = {
    panZoomFactor: 1.92,
    focalYPercent: 53,
    focalXPercent: 76,
  };

  const initDefaultsByCropId = {};
  const DESK_ZOOM = OFFICE_DESK_REFERENCE.panZoomFactor;

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
    const versionMatch = cropId.match(/^oe-v(\d):/);
    if (versionMatch && VERSION_DEFAULTS[versionMatch[1]]) {
      return { ...VERSION_DEFAULTS[versionMatch[1]] };
    }
    if (cropId === "finals-office_expansion") {
      return { ...FINALS_OFFICE_EXPANSION };
    }
    return { ...OFFICE_DESK_REFERENCE };
  }

  function isStructureCardCropId(cropId) {
    return /^oe-v\d:/.test(cropId) || cropId === "finals-office_expansion";
  }

  function formatFinalsTypeScript(cropsById) {
    const crop = cropsById["finals-office_expansion"] || FINALS_OFFICE_EXPANSION;
    return [
      "// Paste into structureDepartmentsArt.ts → DEPARTMENTS_PORTRAITS.office_expansion",
      "office_expansion: {",
      `  src: departmentsOfficeExpansion, // rename import to match baked file`,
      `  crop: { panZoomFactor: ${crop.panZoomFactor}, focalYPercent: ${crop.focalYPercent}, focalXPercent: ${crop.focalXPercent} },`,
      "},",
    ].join("\n");
  }

  root.OFFICE_EXPANSION_WIRE = {
    STRIP,
    OFFICE_DESK_REFERENCE,
    VERSION_DEFAULTS,
    FINALS_OFFICE_EXPANSION,
    structureCardPortraitStripZoom,
    getReviewCropDefaults,
    getInitDefaults,
    rememberInitDefaults,
    isStructureCardCropId,
    formatFinalsTypeScript,
  };
})(window);

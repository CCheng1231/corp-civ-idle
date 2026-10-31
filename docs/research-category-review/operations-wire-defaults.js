(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };
  const BANNER = { panZoomFactor: 1.58, focalYPercent: 52, focalXPercent: 50 };
  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };
  const FINALS_PROJECTS = {
    branch_management: {
      panZoomFactor: 2.6,
      focalYPercent: 49,
      focalXPercent: 33,
    },
    portfolio_management: {
      panZoomFactor: 1.82,
      focalYPercent: 43,
      focalXPercent: 47,
    },
    massive_expansion: {
      panZoomFactor: 1.78,
      focalYPercent: 47,
      focalXPercent: 46,
    },
  };
  const PROJECT_IDS = Object.keys(FINALS_PROJECTS);
  const SLUG_TO_ID = {
    "operations-branch-management": "branch_management",
    "operations-portfolio-management": "portfolio_management",
    "operations-massive-expansion": "massive_expansion",
  };
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
    const pass2 = cropId.match(/^pass2-v\d+:research-(.+)-pass2-v\d+\.jpg$/);
    if (pass2) {
      const id = SLUG_TO_ID[pass2[1]];
      if (id && FINALS_PROJECTS[id]) return { ...FINALS_PROJECTS[id] };
    }
    if (/^pass2-v\d+:research-operations-/.test(cropId)) {
      return { ...OFFICE_DESK_REFERENCE };
    }
    return { ...BANNER };
  }
  function isStructureCardCropId(cropId) {
    return (
      /^finals-(?!banner)/.test(cropId) ||
      /^pass2-v\d+:research-operations-/.test(cropId)
    );
  }
  function formatFinalsTypeScript(cropsById) {
    const lines = [
      "// RESEARCH_OPERATIONS_BANNER.crop:",
      JSON.stringify(cropsById["finals-banner"] || BANNER, null, 2),
      "",
    ];
    for (const id of PROJECT_IDS) {
      lines.push(`// ${id}:`);
      lines.push(JSON.stringify(cropsById[`finals-${id}`] || FINALS_PROJECTS[id], null, 2));
    }
    return lines.join("\n");
  }

  root.RESEARCH_OPERATIONS_WIRE = {
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

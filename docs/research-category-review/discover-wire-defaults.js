(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };
  const BANNER = { panZoomFactor: 1.56, focalYPercent: 42, focalXPercent: 50 };
  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };
  const FINALS_PROJECTS = {
    discover_video_studio: {
      panZoomFactor: 1.5,
      focalYPercent: 37,
      focalXPercent: 60,
    },
    discover_press_room: {
      panZoomFactor: 2.6,
      focalYPercent: 31,
      focalXPercent: 67,
    },
    discover_company_statue: {
      panZoomFactor: 1.68,
      focalYPercent: 32,
      focalXPercent: 51,
    },
    discover_electricity_generator: {
      panZoomFactor: 1.92,
      focalYPercent: 51,
      focalXPercent: 56,
    },
    discover_mit_room: { ...OFFICE_DESK_REFERENCE },
  };
  const PROJECT_IDS = Object.keys(FINALS_PROJECTS);
  const SLUG_TO_ID = {
    "discover-video-studio": "discover_video_studio",
    "discover-press-room": "discover_press_room",
    "discover-company-statue": "discover_company_statue",
    "discover-electricity-generator": "discover_electricity_generator",
    "discover-mit-room": "discover_mit_room",
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
    if (/^pass2-v\d+:research-discover-/.test(cropId)) {
      return { ...OFFICE_DESK_REFERENCE };
    }
    return { ...BANNER };
  }
  function isStructureCardCropId(cropId) {
    return (
      /^finals-(?!banner)/.test(cropId) ||
      /^pass2-v\d+:research-discover-/.test(cropId)
    );
  }
  function formatFinalsTypeScript(cropsById) {
    const lines = [
      "// RESEARCH_DISCOVER_BANNER.crop:",
      JSON.stringify(cropsById["finals-banner"] || BANNER, null, 2),
      "",
    ];
    for (const id of PROJECT_IDS) {
      lines.push(`// ${id}:`);
      lines.push(JSON.stringify(cropsById[`finals-${id}`] || FINALS_PROJECTS[id], null, 2));
    }
    return lines.join("\n");
  }

  root.RESEARCH_DISCOVER_WIRE = {
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

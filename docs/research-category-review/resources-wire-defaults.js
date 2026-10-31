/**
 * Sync with future researchResourcesArt.ts.
 */
(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };
  const SCENE_STRIP = { widthRem: 9.5, heightRem: 2.35 };

  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };

  const BANNER = {
    panZoomFactor: 1.78,
    focalYPercent: 42,
    focalXPercent: 21,
  };

  const FINALS_PROJECTS = {
    eff_manuals_cash: {
      panZoomFactor: 1.8,
      focalYPercent: 25,
      focalXPercent: 40,
    },
    eff_manuals_sup: {
      panZoomFactor: 1.92,
      focalYPercent: 25,
      focalXPercent: 56,
    },
    eff_manuals_con: {
      panZoomFactor: 1.76,
      focalYPercent: 35,
      focalXPercent: 37,
    },
    eff_manuals_mood: {
      panZoomFactor: 1.66,
      focalYPercent: 26,
      focalXPercent: 27,
    },
    eff_manuals_rep: {
      panZoomFactor: 1.56,
      focalYPercent: 32,
      focalXPercent: 44,
    },
    eff_manuals_grep: {
      panZoomFactor: 1.92,
      focalYPercent: 27,
      focalXPercent: 54,
    },
    planning_ahead: {
      panZoomFactor: 1.68,
      focalYPercent: 9,
      focalXPercent: 66,
    },
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
    if (cropId === "finals-banner") return { ...BANNER };
    if (cropId.startsWith("pass2-banner:")) return { ...BANNER };

    const finals = cropId.match(/^finals-(.+)$/);
    if (finals && finals[1] !== "banner" && FINALS_PROJECTS[finals[1]]) {
      return { ...FINALS_PROJECTS[finals[1]] };
    }

    if (/^pass2-v\d+:research-.+-pass2-v\d+\.jpg$/.test(cropId)) {
      const m = cropId.match(/^pass2-v\d+:research-(.+)-pass2-v\d+\.jpg$/);
      const slug = m?.[1];
      const idBySlug = {
        "eff-manuals-cash": "eff_manuals_cash",
        "eff-manuals-sup": "eff_manuals_sup",
        "eff-manuals-con": "eff_manuals_con",
        "eff-manuals-mood": "eff_manuals_mood",
        "eff-manuals-rep": "eff_manuals_rep",
        "eff-manuals-grep": "eff_manuals_grep",
        "planning-ahead": "planning_ahead",
      };
      const id = slug ? idBySlug[slug] : undefined;
      if (id && FINALS_PROJECTS[id]) return { ...FINALS_PROJECTS[id] };
      return { ...OFFICE_DESK_REFERENCE };
    }

    return { ...BANNER };
  }

  function isStructureCardCropId(cropId) {
    return (
      /^finals-(?!banner)/.test(cropId) ||
      /^pass2-v\d+:research-(?!resources-banner)/.test(cropId)
    );
  }

  function formatFinalsTypeScript(cropsById) {
    const lines = [
      "// RESEARCH_RESOURCES_BANNER.crop:",
      formatCrop(cropsById["finals-banner"] || BANNER, 2),
      "",
    ];
    for (const id of Object.keys(FINALS_PROJECTS)) {
      lines.push(`// ${id}`);
      lines.push(formatCrop(cropsById[`finals-${id}`] || FINALS_PROJECTS[id], 0));
    }
    return lines.join("\n");
  }

  function formatCrop(crop, indent) {
    const pad = " ".repeat(indent);
    return `${pad}{ panZoomFactor: ${crop.panZoomFactor}, focalYPercent: ${crop.focalYPercent}, focalXPercent: ${crop.focalXPercent} },`;
  }

  root.RESEARCH_RESOURCES_WIRE = {
    STRIP,
    SCENE_STRIP,
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

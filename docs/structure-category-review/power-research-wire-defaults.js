/**
 * Keep in sync with `src/game/structurePowerResearchArt.ts`.
 * Wired finals: Pass 2 v4 (Oct 2026).
 */
(function (root) {
  const STRIP = { widthRem: 5.4, minHeightRem: 8.5 };

  const OFFICE_DESK_REFERENCE = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };

  const BANNER = {
    panZoomFactor: 1.48,
    focalYPercent: 47,
    focalXPercent: 21,
  };

  const FINALS_STRUCTURES = {
    power_panel: {
      panZoomFactor: 1.24,
      focalYPercent: 54,
      focalXPercent: 56,
    },
    electricity_generator: {
      panZoomFactor: 1.78,
      focalYPercent: 28,
      focalXPercent: 77,
    },
    dept_rnd: {
      panZoomFactor: 1.88,
      focalYPercent: 22,
      focalXPercent: 58,
    },
  };

  const SLUG_TO_ID = {
    "power-panel": "power_panel",
    "electricity-generator": "electricity_generator",
    "dept-rnd": "dept_rnd",
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
    if (cropId.startsWith("pass2-banner:") || cropId.startsWith("banner:")) {
      return { ...BANNER };
    }

    const pass2Card = cropId.match(/^pass2-v(\d+):power-research-(.+)-pass2-v\d+\.jpg$/);
    if (pass2Card && pass2Card[1] === "4") {
      const id = SLUG_TO_ID[pass2Card[2]];
      if (id && FINALS_STRUCTURES[id]) return { ...FINALS_STRUCTURES[id] };
    }

    const finals = cropId.match(/^finals-(.+)$/);
    if (finals && finals[1] !== "banner" && FINALS_STRUCTURES[finals[1]]) {
      return { ...FINALS_STRUCTURES[finals[1]] };
    }

    if (cropId.includes("banner")) {
      return { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 50 };
    }
    if (
      cropId.startsWith("structure:") ||
      cropId.startsWith("pass2-v") ||
      cropId.startsWith("finals-")
    ) {
      return { ...OFFICE_DESK_REFERENCE };
    }
    return { panZoomFactor: 1.78, focalYPercent: 42, focalXPercent: 50 };
  }

  function isStructureCardCropId(cropId) {
    return (
      /^finals-(?!banner)/.test(cropId) ||
      cropId.startsWith("structure:") ||
      /^pass2-v\d+:/.test(cropId)
    );
  }

  function formatFinalsTypeScript(cropsById) {
    const lines = [
      "// Paste into structurePowerResearchArt.ts",
      "// POWER_RESEARCH_CATEGORY_BANNER.crop:",
      formatCropObject(cropsById["finals-banner"] || BANNER, 2),
      "",
    ];
    for (const id of Object.keys(FINALS_STRUCTURES)) {
      lines.push(`// ${id}`);
      lines.push(formatCropObject(cropsById[`finals-${id}`] || FINALS_STRUCTURES[id], 0));
    }
    return lines.join("\n");
  }

  function formatCropObject(crop, indent) {
    const pad = " ".repeat(indent);
    return `${pad}{ panZoomFactor: ${crop.panZoomFactor}, focalYPercent: ${crop.focalYPercent}, focalXPercent: ${crop.focalXPercent} },`;
  }

  root.POWER_RESEARCH_WIRE = {
    STRIP,
    BANNER,
    OFFICE_DESK_REFERENCE,
    FINALS_STRUCTURES,
    structureCardPortraitStripZoom,
    getReviewCropDefaults,
    getInitDefaults,
    rememberInitDefaults,
    isStructureCardCropId,
    formatFinalsTypeScript,
  };
})(window);

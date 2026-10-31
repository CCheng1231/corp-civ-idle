/**
 * Keep in sync with `src/game/structureDepartmentsArt.ts` + Essentials strip CSS.
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

  const BANNER_PASS2_V3 = {
    panZoomFactor: 1.2,
    focalYPercent: 75,
    focalXPercent: 38,
  };

  const FINALS_STRUCTURES = {
    dept_b2b: {
      panZoomFactor: 1.38,
      focalYPercent: 32,
      focalXPercent: 48,
    },
    break_room: {
      panZoomFactor: 1.38,
      focalYPercent: 84,
      focalXPercent: 33,
    },
    social_media: {
      panZoomFactor: 1.48,
      focalYPercent: 34,
      focalXPercent: 57,
    },
    video_production_studio: {
      panZoomFactor: 1.92,
      focalYPercent: 30,
      focalXPercent: 41,
    },
    press_room: {
      panZoomFactor: 1.92,
      focalYPercent: 37,
      focalXPercent: 54,
    },
  };

  const SLUG_TO_ID = {
    "dept-b2b": "dept_b2b",
    "break-room": "break_room",
    "social-media": "social_media",
    "video-production-studio": "video_production_studio",
    "press-room": "press_room",
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

    const pass2Banner = cropId.match(/^pass2-banner:departments-banner-pass2-v(\d+)\.jpg$/);
    if (pass2Banner) {
      if (pass2Banner[1] === "3") return { ...BANNER_PASS2_V3 };
      return { ...BANNER };
    }

    const pass2Card = cropId.match(/^pass2-v(\d+):departments-(.+)-pass2-v\d+\.jpg$/);
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
      "// Paste into structureDepartmentsArt.ts",
      "// DEPARTMENTS_CATEGORY_BANNER.crop:",
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

  root.DEPARTMENTS_WIRE = {
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

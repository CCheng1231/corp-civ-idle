/**
 * Keep in sync with `src/game/structureRecruitmentArt.ts`.
 * Wired finals: Pass 2 v1 (Oct 2026).
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
    focalYPercent: 63,
    focalXPercent: 100,
  };

  const FINALS_STRUCTURES = {
    recruitment_desk: {
      panZoomFactor: 2.38,
      focalYPercent: 28,
      focalXPercent: 42,
    },
    mit_room: {
      panZoomFactor: 1.14,
      focalYPercent: 61,
      focalXPercent: 19,
    },
  };

  const SLUG_TO_ID = {
    desk: "recruitment_desk",
    "mit-room": "mit_room",
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

    const pass2Banner = cropId.match(/^pass2-banner:recruitment-banner-pass2-v(\d+)\.jpg$/);
    if (pass2Banner && pass2Banner[1] === "1") return { ...BANNER };
    if (pass2Banner) {
      return { panZoomFactor: 1.48, focalYPercent: 47, focalXPercent: 21 };
    }

    const pass2Card = cropId.match(/^pass2-v(\d+):recruitment-(.+)-pass2-v\d+\.jpg$/);
    if (pass2Card && pass2Card[1] === "1") {
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
      "// Paste into structureRecruitmentArt.ts",
      "// RECRUITMENT_CATEGORY_BANNER.crop:",
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

  root.RECRUITMENT_WIRE = {
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

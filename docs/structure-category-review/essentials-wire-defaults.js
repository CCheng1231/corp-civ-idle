/**
 * Keep in sync with `src/game/structureEssentialsArt.ts` + `--progression-compact-portrait-*`
 * in `src/styles/06-job-board.css` (office desk = card strip reference).
 */
(function (root) {
  /** In-game Build Essentials + Recruit compact portrait strip. */
  const STRIP = {
    widthRem: 5.4,
    minHeightRem: 8.5,
  };

  /** Category banner strip (SceneBanner), not the card portrait. */
  const BANNER = {
    panZoomFactor: 1.48,
    focalYPercent: 47,
    focalXPercent: 21,
  };

  /** Card strip reference — match wired office_desk crop. */
  const OFFICE_DESK = {
    panZoomFactor: 1.92,
    focalYPercent: 58,
    focalXPercent: 55,
  };

  const DESK_ZOOM = OFFICE_DESK.panZoomFactor;
  const STRIP_ZOOM_FLOOR = 1.62;

  /** Same logic as `structureCardPortraitStripZoom()` in game code. */
  function structureCardPortraitStripZoom(crop) {
    if (crop.panZoomFactor >= DESK_ZOOM - 0.04) return crop.panZoomFactor;
    if (crop.panZoomFactor >= STRIP_ZOOM_FLOOR) return crop.panZoomFactor;
    return DESK_ZOOM;
  }

  /** Wired Essentials finals — update here when pasting review JSON back into TS. */
  const FINALS_STRUCTURES = {
    office_desk: { ...OFFICE_DESK },
    bank_account: {
      panZoomFactor: 1.7,
      focalYPercent: 67,
      focalXPercent: 50,
    },
    office_supply: {
      panZoomFactor: 2.18,
      focalYPercent: 47,
      focalXPercent: 47,
    },
    storage_room: {
      panZoomFactor: 2,
      focalYPercent: 44,
      focalXPercent: 29,
    },
    company_statue: {
      panZoomFactor: 1.82,
      focalYPercent: 25,
      focalXPercent: 50,
    },
  };

  const initDefaultsByCropId = {};

  function rememberInitDefaults(cropId, defaults) {
    initDefaultsByCropId[cropId] = { ...defaults };
  }

  function getInitDefaults(cropId) {
    if (initDefaultsByCropId[cropId]) return { ...initDefaultsByCropId[cropId] };
    return getReviewCropDefaults(cropId);
  }

  function getReviewCropDefaults(cropId) {
    if (cropId === "finals-banner") return { ...BANNER };
    const finals = cropId.match(/^finals-(.+)$/);
    if (finals && FINALS_STRUCTURES[finals[1]]) {
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
      return { ...OFFICE_DESK };
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

  /** Paste into `structureEssentialsArt.ts` after tuning on essentials-finals.html */
  function formatFinalsTypeScript(cropsById) {
    const lines = [
      "// Generated from essentials-finals.html — verify paths, then copy into structureEssentialsArt.ts",
      "ESSENTIALS_CATEGORY_BANNER.crop:",
      formatCropObject(cropsById["finals-banner"] || BANNER, 2),
      "",
      "// ESSENTIALS_PORTRAITS crops:",
    ];
    for (const [id, label] of [
      ["office_desk", "office_desk"],
      ["bank_account", "bank_account"],
      ["office_supply", "office_supply"],
      ["storage_room", "storage_room"],
      ["company_statue", "company_statue"],
    ]) {
      const key = `finals-${id}`;
      const crop = cropsById[key] || FINALS_STRUCTURES[id];
      lines.push(`// ${label}`);
      lines.push(formatCropObject(crop, 0));
    }
    return lines.join("\n");
  }

  function formatCropObject(crop, indent) {
    const pad = " ".repeat(indent);
    return `${pad}{ panZoomFactor: ${crop.panZoomFactor}, focalYPercent: ${crop.focalYPercent}, focalXPercent: ${crop.focalXPercent} },`;
  }

  root.ESSENTIALS_WIRE = {
    STRIP,
    BANNER,
    OFFICE_DESK,
    FINALS_STRUCTURES,
    structureCardPortraitStripZoom,
    getReviewCropDefaults,
    getInitDefaults,
    rememberInitDefaults,
    isStructureCardCropId,
    formatFinalsTypeScript,
  };
})(window);

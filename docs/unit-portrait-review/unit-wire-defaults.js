/**
 * Keep in sync with `src/game/unitPortraitCardFraming.ts` + `--progression-compact-portrait-*`
 * in `src/styles/06-job-board.css` (same strip as Build Essentials office desk).
 */
(function (root) {
  const STRIP = {
    widthRem: 5.4,
    minHeightRem: 8.5,
  };

  const DEFAULT_FRAMING = {
    imgHeightPercent: 152,
    imgScale: 1.1,
  };

  const UNIT_FRAMING = {
    mall_cop: { imgHeightPercent: 158, imgScale: 1.14 },
    call_center_veteran: { imgScale: 1.06 },
    ex_bouncer: { imgScale: 1.12 },
    data_entry_snoop: { imgHeightPercent: 148, imgScale: 1.05 },
    janitor: { imgHeightPercent: 156 },
    branch_manager: { imgScale: 1.08 },
  };

  const SKIN_FRAMING = {
    part_timer: { "p2-v4": { imgHeightPercent: 148, imgScale: 1.15 } },
    office_clerk: { "p2-v4": { imgHeightPercent: 148, imgScale: 1.15 } },
  };

  function getUnitPortraitCardFraming(unitId, skinId) {
    const merged = {
      ...DEFAULT_FRAMING,
      ...(UNIT_FRAMING[unitId] || {}),
    };
    if (skinId && SKIN_FRAMING[unitId]?.[skinId]) {
      return { ...merged, ...SKIN_FRAMING[unitId][skinId] };
    }
    return merged;
  }

  function applyFramingToPortraitImg(imgEl, framing) {
    if (!imgEl) return;
    imgEl.style.height = `${framing.imgHeightPercent}%`;
    imgEl.style.transform = `translateX(-50%) scale(${framing.imgScale})`;
    imgEl.style.transformOrigin = "50% 100%";
  }

  root.UnitPortraitWireDefaults = {
    STRIP,
    DEFAULT_FRAMING,
    UNIT_FRAMING,
    SKIN_FRAMING,
    getUnitPortraitCardFraming,
    applyFramingToPortraitImg,
  };
})(typeof window !== "undefined" ? window : globalThis);

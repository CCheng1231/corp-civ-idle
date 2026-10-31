/** Review-page crop mock — tune to match in-game SceneBanner + StructureCardPortrait. */
(function () {
  const STORAGE_PREFIX = "corp-civ-idle-review-crop:";

  function readCrop(id, defaults) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      return {
        panZoomFactor: Number(parsed.panZoomFactor) || defaults.panZoomFactor,
        focalYPercent: Number(parsed.focalYPercent) || defaults.focalYPercent,
        focalXPercent: Number(parsed.focalXPercent) ?? defaults.focalXPercent,
      };
    } catch {
      return { ...defaults };
    }
  }

  function writeCrop(id, crop) {
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(crop));
  }

  function reviewWire() {
    return (
      window.ESSENTIALS_WIRE ||
      window.DEPARTMENTS_WIRE ||
      window.POWER_RESEARCH_WIRE ||
      window.RECRUITMENT_WIRE ||
      window.RESEARCH_RESOURCES_WIRE ||
      window.RESEARCH_PAYOUTS_WIRE ||
      window.RESEARCH_DISCOVER_WIRE ||
      window.RESEARCH_OPERATIONS_WIRE
    );
  }

  function resolveDefaults(cropId, defaults) {
    if (defaults && defaults.panZoomFactor != null) return { ...defaults };
    const wire = reviewWire();
    if (wire?.getReviewCropDefaults) {
      return { ...wire.getReviewCropDefaults(cropId) };
    }
    return {
      panZoomFactor: 1.78,
      focalYPercent: 42,
      focalXPercent: 50,
    };
  }

  function isStructureCardPortrait(cropId, portraitWrap) {
    if (portraitWrap?.classList?.contains("structure-card-mock-portrait")) {
      return true;
    }
    return reviewWire()?.isStructureCardCropId?.(cropId) ?? false;
  }

  function displayZoom(crop, structureCard) {
    const wire = reviewWire();
    if (structureCard && wire?.structureCardPortraitStripZoom) {
      return wire.structureCardPortraitStripZoom(crop);
    }
    return crop.panZoomFactor;
  }

  function applyToImg(img, crop, structureCard) {
    img.style.objectPosition = `${crop.focalXPercent}% ${crop.focalYPercent}%`;
    const zoom = displayZoom(crop, structureCard);
    img.style.transform = `scale(${zoom})`;
    img.style.transformOrigin = `${crop.focalXPercent}% ${crop.focalYPercent}%`;
  }

  window.initCropTuner = function initCropTuner(container, cropId, defaults) {
    defaults = resolveDefaults(cropId, defaults);
    const wire = reviewWire();
    if (wire?.rememberInitDefaults) {
      wire.rememberInitDefaults(cropId, defaults);
    }

    let crop = readCrop(cropId, defaults);
    const portraitWrap = container.querySelector(
      `[data-crop-id="${cropId}"]`,
    );
    const img =
      portraitWrap?.querySelector(".crop-tuner-target") ||
      container.querySelector(".crop-tuner-target");
    if (!img) return;

    const structureCard = isStructureCardPortrait(cropId, portraitWrap);
    const isCategoryBanner =
      portraitWrap?.classList?.contains("header-strip") ||
      cropId.includes("banner") ||
      cropId.startsWith("finals-banner");
    if (structureCard) {
      img.classList.add("crop-tuner-target--structure-card");
    }

    const controls = document.createElement("div");
    controls.className = "crop-tuner";
    const bannerNote = isCategoryBanner
      ? `<p class="crop-tuner-note">Category strip mock (9.5×2.35rem): tune <strong>Zoom · Focal X · Focal Y</strong> like in-game SceneBanner (Essentials draggable pan is separate after wire).</p>`
      : "";
    controls.innerHTML = `
      <div class="crop-tuner-row">
        <label>Zoom <span class="crop-val" data-k="panZoomFactor"></span></label>
        <input type="range" min="1" max="2.6" step="0.02" data-k="panZoomFactor" />
      </div>
      <div class="crop-tuner-row">
        <label>Focal Y <span class="crop-val" data-k="focalYPercent"></span></label>
        <input type="range" min="0" max="100" step="1" data-k="focalYPercent" />
      </div>
      <div class="crop-tuner-row">
        <label>Focal X <span class="crop-val" data-k="focalXPercent"></span></label>
        <input type="range" min="0" max="100" step="1" data-k="focalXPercent" />
      </div>
      ${
        structureCard
          ? (() => {
              const w = reviewWire();
              const desk =
                w?.OFFICE_DESK?.panZoomFactor ??
                w?.OFFICE_DESK_REFERENCE?.panZoomFactor ??
                1.92;
              return `<p class="crop-tuner-note">Build card mock: ${w?.STRIP?.widthRem ?? 5.4}×${w?.STRIP?.minHeightRem ?? 8.5}rem strip · desk reference ${desk}×. Exported JSON = values to wire.</p>`;
            })()
          : bannerNote
      }
      <button type="button" class="crop-reset">Reset</button>
    `;
    container.appendChild(controls);

    function syncUi() {
      controls.querySelectorAll("input[data-k]").forEach((input) => {
        const k = input.getAttribute("data-k");
        input.value = String(crop[k]);
        const span = controls.querySelector(`.crop-val[data-k="${k}"]`);
        if (span) {
          span.textContent =
            k === "panZoomFactor" ? crop[k].toFixed(2) : String(crop[k]);
        }
      });
      applyToImg(img, crop, structureCard);
    }

    controls.querySelectorAll("input[data-k]").forEach((input) => {
      input.addEventListener("input", () => {
        const k = input.getAttribute("data-k");
        crop = { ...crop, [k]: Number(input.value) };
        writeCrop(cropId, crop);
        syncUi();
        document.dispatchEvent(
          new CustomEvent("review-crop-change", { detail: { cropId, crop } }),
        );
      });
    });

    controls.querySelector(".crop-reset").addEventListener("click", () => {
      crop = { ...defaults };
      writeCrop(cropId, crop);
      syncUi();
    });

    syncUi();
    return cropId;
  };

  window.exportReviewCrops = function exportReviewCrops(ids) {
    const out = {};
    for (const id of ids) {
      const defaults = reviewWire()?.getInitDefaults
        ? reviewWire().getInitDefaults(id)
        : resolveDefaults(id, null);
      out[id] = readCrop(id, defaults);
    }
    return out;
  };

  window.allReviewCropIds = function allReviewCropIds() {
    return [
      ...document.querySelectorAll(".crop-tuner-wrap[data-crop-id]"),
    ]
      .map((el) => el.getAttribute("data-crop-id"))
      .filter(Boolean);
  };

  window.exportReviewCropsByPrefix = function exportReviewCropsByPrefix(prefix) {
    return exportReviewCrops(
      allReviewCropIds().filter((id) => id.startsWith(prefix)),
    );
  };

  window.copyReviewCropsJson = function copyReviewCropsJson(ids) {
    const json = JSON.stringify(window.exportReviewCrops(ids), null, 2);
    return navigator.clipboard.writeText(json).then(() => json);
  };

  window.copyReviewCropsTypeScript = function copyReviewCropsTypeScript(ids) {
    const crops = window.exportReviewCrops(ids);
    const wire = reviewWire();
    const text = wire?.formatFinalsTypeScript
      ? wire.formatFinalsTypeScript(crops)
      : JSON.stringify(crops, null, 2);
    return navigator.clipboard.writeText(text).then(() => text);
  };
})();

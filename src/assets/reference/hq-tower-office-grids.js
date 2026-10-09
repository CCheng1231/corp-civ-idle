/**
 * Fills .variant-grid placeholders with 6 high-res tower studies per family.
 * Requires markup/CSS in hq-tower-solarpunk-demos.html + hq-tower-office-detail.css
 */
(() => {
  const VARIANT_LABELS = [
    "I · Canon",
    "II · Accent",
    "III · Crown",
    "IV · Massing",
    "V · Solar",
    "VI · Night",
  ];

  const FAMILIES = [
    {
      gridId: "grid-o-metro",
      anchor: "o-metro",
      front: `
        <div class="face o-front t-detail-rim">
          <span class="o-crown"></span>
          <span class="o-slab o-slab-1"></span>
          <span class="o-rim o-rim-1"></span>
          <span class="o-slab o-slab-2"></span>
          <span class="o-rim o-rim-2"></span>
          <span class="o-slab o-slab-3"></span>
        </div>
        <div class="face o-back"></div>
        <div class="face o-left"></div>
        <div class="face o-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-o-suburban",
      anchor: "o-suburban",
      front: `
        <div class="face p-front t-detail-rim">
          <span class="p-ribbon p-ribbon-1"></span>
          <span class="p-garden p-garden-1"></span>
          <span class="p-ribbon p-ribbon-2"></span>
          <span class="p-garden p-garden-2"></span>
        </div>
        <div class="face p-back"></div>
        <div class="face p-left"></div>
        <div class="face p-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-o-rural",
      anchor: "o-rural",
      front: `
        <div class="face r-front t-detail-rim">
          <span class="r-crown"></span>
          <span class="r-slot r-slot-1"></span>
          <span class="r-slot r-slot-2"></span>
          <span class="r-slot r-slot-3"></span>
        </div>
        <div class="face r-back"></div>
        <div class="face r-left"></div>
        <div class="face r-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-o-country",
      anchor: "o-country",
      front: `
        <div class="face h-front t-detail-rim">
          <span class="h-garden"></span>
          <span class="h-lattice"></span>
          <span class="h-glass"></span>
        </div>
        <div class="face h-back"></div>
        <div class="face h-left"></div>
        <div class="face h-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-g-metro",
      anchor: "mat-tower g-metro",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="mat-win"></span>
          <span class="m-crown"></span>
          <span class="m-floor m-floor-1"></span>
          <span class="m-floor m-floor-2"></span>
          <span class="m-floor m-floor-3"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-g-suburban",
      anchor: "mat-tower g-suburban",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="mat-win"></span>
          <span class="m-terrace m-terrace-1"></span>
          <span class="m-terrace-g m-terrace-g-1"></span>
          <span class="m-terrace m-terrace-2"></span>
          <span class="m-terrace-g m-terrace-g-2"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-g-rural",
      anchor: "mat-tower g-rural",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-mullion m-mullion-1"></span>
          <span class="m-pane m-pane-1"></span>
          <span class="m-mullion m-mullion-2"></span>
          <span class="m-pane m-pane-2"></span>
          <span class="m-mullion m-mullion-3"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-g-country",
      anchor: "mat-tower g-country",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-frame"></span>
          <span class="mat-win"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-concrete",
      anchor: "mat-tower mat-concrete",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-moss m-moss-1"></span>
          <span class="m-moss m-moss-2"></span>
          <span class="m-floor m-floor-1"></span>
          <span class="m-floor m-floor-2"></span>
          <span class="m-floor m-floor-3"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-grass",
      anchor: "mat-tower mat-grass",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-tuft m-tuft-1"></span>
          <span class="m-tuft m-tuft-2"></span>
          <span class="m-tuft m-tuft-3"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-wood",
      anchor: "mat-tower mat-wood",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-balcony m-balcony-1"></span>
          <span class="m-balcony m-balcony-2"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-ceramic",
      anchor: "mat-tower mat-ceramic",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-arch"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-bronze",
      anchor: "mat-tower mat-bronze",
      front: `
        <div class="face m-front t-detail-rim"></div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
    {
      gridId: "grid-mat-stone",
      anchor: "mat-tower mat-stone",
      front: `
        <div class="face m-front t-detail-rim">
          <span class="m-slot m-slot-1"></span>
          <span class="m-slot m-slot-2"></span>
          <span class="m-slot m-slot-3"></span>
        </div>
        <div class="face m-back"></div>
        <div class="face m-left"></div>
        <div class="face m-right"></div>`,
      flat: true,
    },
  ];

  function anchorClass(cfg, variantIndex) {
    if (cfg.anchorForVariant) {
      return cfg.anchorForVariant(variantIndex);
    }
    return cfg.anchor;
  }

  function towerCell(cfg, variantIndex) {
    const vClass = `var-${variantIndex + 1}`;
    const label = VARIANT_LABELS[variantIndex];
    const bodyInner = cfg.front.trim();
    const anchor = anchorClass(cfg, variantIndex);

    return `
      <div class="variant-cell">
        <div class="variant-caption">${label}</div>
        <div class="variant-stage-inner">
          <div class="hex-foot hex-foot-cell" aria-hidden="true"></div>
          <div class="tower-anchor ${anchor} ${vClass}">
            <div class="tower-shadow"></div>
            <div class="tower-rig">
              <div class="tower-body">
                ${bodyInner}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }

  function fillGrid(cfg) {
    const el = document.getElementById(cfg.gridId);
    if (!el) return;
    el.innerHTML = VARIANT_LABELS.map((_, i) => towerCell(cfg, i)).join("");
  }

  for (const cfg of FAMILIES) {
    fillGrid(cfg);
  }

  /* Row 1 (I–III) sits above the tower mass — put it after IV–VI so clipping is less likely */
  document.querySelectorAll(".variant-grid").forEach((grid) => {
    const cells = [...grid.children];
    if (cells.length !== 6) return;
    const secondRow = cells.slice(0, 3);
    const firstRow = cells.slice(3);
    grid.innerHTML = "";
    firstRow.forEach((c) => grid.appendChild(c));
    secondRow.forEach((c) => grid.appendChild(c));
  });
})();

import { generateHexagonMap, MAP_RADIUS } from "../src/game/hexLayout.ts";
import { worldMapHexBounds } from "../src/game/mapWorld.ts";
import {
  MAP_ZOOM_REL_MIN,
  MAP_FIT_BLEED,
  MAP_PAN_OVERSCROLL_RATIO,
  mapContentLayout,
  computeFitZoom,
  clampMapPan,
  contentPointAtViewportPixel,
} from "../src/game/mapViewport.ts";

const bounds = worldMapHexBounds(generateHexagonMap(MAP_RADIUS));
const viewports = [
  { w: 360, h: 640, name: "phone-portrait" },
  { w: 393, h: 852, name: "iphone-15" },
  { w: 800, h: 600, name: "desktop-4-3" },
  { w: 1200, h: 700, name: "wide-pc" },
];

function viewBoxFromContent(cx, cy, b, content) {
  return {
    x: b.minX + (cx / content.width) * b.width,
    y: b.minY + (cy / content.height) * b.height,
  };
}

let worst = { extra: 0, name: "", detail: null };

for (const vp of viewports) {
  const content = mapContentLayout(vp.w, bounds);
  const fitZoom = computeFitZoom(vp.w, vp.h, bounds);
  const zoom = fitZoom * MAP_ZOOM_REL_MIN;
  const maxPan = clampMapPan(
    { x: 1e6, y: 1e6 },
    zoom,
    vp.w,
    vp.h,
    content,
    MAP_PAN_OVERSCROLL_RATIO,
  );
  const pans = [
    { x: 0, y: 0 },
    { x: maxPan.x, y: maxPan.y },
    { x: -maxPan.x, y: -maxPan.y },
    { x: maxPan.x, y: -maxPan.y },
    { x: -maxPan.x, y: maxPan.y },
  ];
  for (const pan of pans) {
    let minVx = Infinity;
    let minVy = Infinity;
    let maxVx = -Infinity;
    let maxVy = -Infinity;
    for (const [vx, vy] of [
      [0, 0],
      [vp.w, 0],
      [0, vp.h],
      [vp.w, vp.h],
    ]) {
      const c = contentPointAtViewportPixel(
        vx,
        vy,
        pan,
        zoom,
        content,
        vp.w,
        vp.h,
      );
      const v = viewBoxFromContent(c.x, c.y, bounds, content);
      minVx = Math.min(minVx, v.x);
      minVy = Math.min(minVy, v.y);
      maxVx = Math.max(maxVx, v.x);
      maxVy = Math.max(maxVy, v.y);
    }
    const extraL = bounds.minX - minVx;
    const extraR = maxVx - (bounds.minX + bounds.width);
    const extraT = bounds.minY - minVy;
    const extraB = maxVy - (bounds.minY + bounds.height);
    const extra = Math.max(extraL, extraR, extraT, extraB, 0);
    if (extra > worst.extra) {
      worst = {
        extra,
        name: vp.name,
        detail: { extraL, extraR, extraT, extraB, pan, zoom, fitZoom },
      };
    }
  }
}

const pad = Math.ceil(worst.extra / 50) * 50 + 100;
const extended = {
  minX: bounds.minX - pad,
  minY: bounds.minY - pad,
  width: bounds.width + pad * 2,
  height: bounds.height + pad * 2,
};

console.log(
  JSON.stringify(
    {
      currentBounds: bounds,
      worstCase: worst,
      recommendedPadPerSidePx: pad,
      extendedViewBox: extended,
      scaleVsCurrent: {
        width: extended.width / bounds.width,
        height: extended.height / bounds.height,
      },
    },
    null,
    2,
  ),
);

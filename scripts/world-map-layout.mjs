/** Shared world-map bounds + photo frame (uniform scale, no stretch). */

export const HEX_RADIUS = 42;
export const MAP_GOV = { q: 0, r: 0 };
export const MAP_RADIUS = 7;
export const VIEWBOX_PAD = HEX_RADIUS * 0.95;

export const REGION_SCALE = {
  metropolis: 1.25,
  suburban: 1.5,
  rural: 2,
  countryside: 2,
};

export function axialToPixel(q, r, size = HEX_RADIUS) {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * 1.5 * r };
}

export function axialDistance(a, b) {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function regionAtCoord(coord) {
  const d = axialDistance(coord, MAP_GOV);
  if (d <= 2) return "metropolis";
  if (d <= 4) return "suburban";
  if (d <= 6) return "rural";
  return "countryside";
}

export function worldMapAxialToPixel(coord) {
  const scale = REGION_SCALE[regionAtCoord(coord)];
  const base = axialToPixel(coord.q, coord.r);
  const g = axialToPixel(MAP_GOV.q, MAP_GOV.r);
  return { x: g.x + (base.x - g.x) * scale, y: g.y + (base.y - g.y) * scale };
}

export function computeMapBounds() {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let q = -MAP_RADIUS; q <= MAP_RADIUS; q += 1) {
    for (let r = -MAP_RADIUS; r <= MAP_RADIUS; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > MAP_RADIUS) continue;
      const { x, y } = worldMapAxialToPixel({ q, r });
      minX = Math.min(minX, x - HEX_RADIUS);
      minY = Math.min(minY, y - HEX_RADIUS);
      maxX = Math.max(maxX, x + HEX_RADIUS);
      maxY = Math.max(maxY, y + HEX_RADIUS);
    }
  }
  minX -= VIEWBOX_PAD;
  minY -= VIEWBOX_PAD;
  maxX += VIEWBOX_PAD;
  maxY += VIEWBOX_PAD;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Fit photo inside bounds at uniform scale; anchor pixel maps to Gov. */
export function computePhotoFrame(imgW, imgH, bounds, gov, anchorIx, anchorIy, fit = 0.9) {
  const pixelScale = Math.min(bounds.width / imgW, bounds.height / imgH) * fit;
  const width = imgW * pixelScale;
  const height = imgH * pixelScale;
  return {
    x: gov.x - anchorIx * pixelScale,
    y: gov.y - anchorIy * pixelScale,
    width,
    height,
    pixelScale,
    imgW,
    imgH,
    anchorIx,
    anchorIy,
  };
}

export function getLandmarkAnchors() {
  const gov = worldMapAxialToPixel({ q: 0, r: 0 });
  const metro = worldMapAxialToPixel({ q: -1, r: 1 });
  const suburban = worldMapAxialToPixel({ q: 4, r: -5 });
  const estate = worldMapAxialToPixel({ q: 3, r: 4 });
  return {
    gov,
    metro,
    suburban,
    estate,
    stadium: { cx: suburban.x + 36, cy: suburban.y - 28, rx: 96, ry: 64 },
    convention: { cx: metro.x - 48, cy: metro.y + 55, w: 120, h: 82 },
    terminal: { cx: estate.x + 18, cy: estate.y - 8, w: 100, h: 58 },
    PLAZA_R: 88,
  };
}

/**
 * Illustrated world map — cream ink / reference style.
 * Organic roads, meandering river + bay; no square grid or building parcels (for now).
 */
import { MAP_GOV, MAP_HQ } from "./hexLayout";
import {
  COMMERCIAL_REAL_ESTATE,
  OFFICE_TOWERS,
  worldMapAxialToPixel,
} from "./mapWorld";

export interface MapBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapRoad {
  d: string;
  width: number;
  kind: "arterial" | "collector" | "local" | "rural";
}

export interface WorldMapArt {
  land: string;
  water: string[];
  parks: string[];
  roads: MapRoad[];
  bridges: { x1: number; y1: number; x2: number; y2: number }[];
  shorelines: string[];
}

const GOV = worldMapAxialToPixel(MAP_GOV);
const HQ = worldMapAxialToPixel(MAP_HQ);
const TOWERS = OFFICE_TOWERS.map((t) => ({
  id: t.id,
  ...worldMapAxialToPixel(t.coord),
}));
const LOTS = COMMERCIAL_REAL_ESTATE.map((lot) => ({
  id: lot.id,
  ...worldMapAxialToPixel(lot.coord),
}));

function pt(x: number, y: number): MapPoint {
  return { x, y };
}

function fmt(p: MapPoint): string {
  return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
}

/** Smooth curve between landmarks — reads like hand-drawn arterials. */
function curvePath(from: MapPoint, to: MapPoint, bend = 0.2): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * len * bend;
  const cy = my + (dx / len) * len * bend;
  return `M ${fmt(from)} Q ${fmt(pt(cx, cy))} ${fmt(to)}`;
}

function cubicPath(
  from: MapPoint,
  c1: MapPoint,
  c2: MapPoint,
  to: MapPoint,
): string {
  return `M ${fmt(from)} C ${fmt(c1)} ${fmt(c2)} ${fmt(to)}`;
}

/** Meandering river centerline, then offset into a natural channel polygon. */
function riverChannel(bounds: MapBounds): string {
  const { minX, minY, width, height } = bounds;
  const center: MapPoint[] = [];
  const steps = 42;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const wave =
      Math.sin(t * Math.PI * 2.4) * width * 0.045 +
      Math.sin(t * Math.PI * 5.1 + 0.8) * width * 0.018;
    center.push(
      pt(
        minX + width * (0.06 + t * 0.42) + wave,
        minY + height * (0.04 + t * 0.78 + Math.sin(t * 3.2) * 0.05),
      ),
    );
  }

  const left: MapPoint[] = [];
  const right: MapPoint[] = [];
  for (let i = 0; i < center.length; i += 1) {
    const p = center[i];
    const prev = center[Math.max(0, i - 1)];
    const next = center[Math.min(center.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = i / (center.length - 1);
    const half =
      10 +
      Math.sin(t * Math.PI) * 16 +
      (t > 0.82 ? (t - 0.82) * 120 : 0);
    left.push(pt(p.x + nx * half, p.y + ny * half));
    right.push(pt(p.x - nx * half, p.y - ny * half));
  }

  const fwd = left.map((p) => fmt(p)).join(" L ");
  const back = [...right].reverse().map((p) => fmt(p)).join(" L ");
  return `M ${fwd} L ${back} Z`;
}

/** Inland lake where the river widens before the estuary. */
function lakeAndEstuary(bounds: MapBounds): string {
  const { minX, minY, width, height } = bounds;
  return [
    `M ${fmt(pt(minX + width * 0.34, minY + height * 0.2))}`,
    `C ${fmt(pt(minX + width * 0.4, minY + height * 0.1))} ${fmt(pt(minX + width * 0.52, minY + height * 0.12))} ${fmt(pt(minX + width * 0.5, minY + height * 0.24))}`,
    `C ${fmt(pt(minX + width * 0.48, minY + height * 0.34))} ${fmt(pt(minX + width * 0.36, minY + height * 0.32))} ${fmt(pt(minX + width * 0.34, minY + height * 0.2))}`,
    "Z",
  ].join(" ");
}

/** East-side bay with coves and peninsulas — not a rectangle. */
function coastalBay(bounds: MapBounds): string {
  const { minX, minY, width, height } = bounds;
  return [
    `M ${fmt(pt(minX + width * 0.46, minY))}`,
    `L ${fmt(pt(minX + width, minY))}`,
    `L ${fmt(pt(minX + width, minY + height))}`,
    `L ${fmt(pt(minX + width * 0.38, minY + height))}`,
    `C ${fmt(pt(minX + width * 0.44, minY + height * 0.86))} ${fmt(pt(minX + width * 0.52, minY + height * 0.72))} ${fmt(pt(minX + width * 0.48, minY + height * 0.58))}`,
    `C ${fmt(pt(minX + width * 0.58, minY + height * 0.48))} ${fmt(pt(minX + width * 0.62, minY + height * 0.32))} ${fmt(pt(minX + width * 0.54, minY + height * 0.2))}`,
    `C ${fmt(pt(minX + width * 0.6, minY + height * 0.1))} ${fmt(pt(minX + width * 0.52, minY + height * 0.02))} ${fmt(pt(minX + width * 0.46, minY))}`,
    "Z",
  ].join(" ");
}

function irregularRing(cx: number, cy: number, r: number, wobble: number): string {
  const parts: string[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const a = (i / 48) * Math.PI * 2;
    const rr = r + Math.sin(a * 3.1) * wobble + Math.cos(a * 5.7) * wobble * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    parts.push(i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${parts.join(" ")} Z`;
}

function parkBlob(cx: number, cy: number, rx: number, ry: number, rot = 0): string {
  return irregularRing(cx, cy, (rx + ry) / 2, (rx - ry) * 0.35 + rot * 8);
}

function pointAlong(from: MapPoint, to: MapPoint, t: number): MapPoint {
  return pt(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
}

function branchRoad(
  roads: MapRoad[],
  from: MapPoint,
  to: MapPoint,
  width: number,
  kind: MapRoad["kind"],
  bend = 0.15,
): void {
  roads.push({ d: curvePath(from, to, bend), width, kind });
}

export function buildWorldMapArt(bounds: MapBounds): WorldMapArt {
  const { minX, minY, width, height } = bounds;
  const roads: MapRoad[] = [];

  const ringOuter = irregularRing(GOV.x, GOV.y, 118, 14);
  const ringMid = irregularRing(GOV.x, GOV.y, 72, 9);
  const ringInner = irregularRing(GOV.x, GOV.y, 38, 5);
  roads.push(
    { d: ringOuter, width: 14, kind: "arterial" },
    { d: ringMid, width: 10, kind: "collector" },
    { d: ringInner, width: 7, kind: "local" },
  );

  for (const tower of TOWERS) {
    branchRoad(roads, GOV, tower, 13, "arterial", 0.16 + tower.x * 0.0001);
    const mid = pointAlong(GOV, tower, 0.55);
    const side = pt(
      mid.x + (tower.y - GOV.y) * 0.08,
      mid.y - (tower.x - GOV.x) * 0.08,
    );
    branchRoad(roads, mid, side, 7, "collector", 0.1);
  }

  branchRoad(roads, GOV, HQ, 11, "arterial", 0.28);
  branchRoad(roads, HQ, pointAlong(HQ, GOV, -0.35), 6, "rural", 0.12);

  for (const lot of LOTS) {
    branchRoad(roads, GOV, lot, 8, "collector", 0.14);
  }

  const northSpine = cubicPath(
    pt(GOV.x - 40, GOV.y - 200),
    pt(GOV.x + 60, GOV.y - 280),
    pt(GOV.x + 180, GOV.y - 220),
    pt(GOV.x + 240, GOV.y - 80),
  );
  roads.push({ d: northSpine, width: 12, kind: "arterial" });

  const riverRoad = cubicPath(
    pt(minX + width * 0.12, minY + height * 0.22),
    pt(minX + width * 0.22, minY + height * 0.38),
    pt(minX + width * 0.28, minY + height * 0.55),
    pt(minX + width * 0.34, minY + height * 0.72),
  );
  roads.push({ d: riverRoad, width: 9, kind: "collector" });

  const coastRoad = cubicPath(
    pt(minX + width * 0.5, minY + height * 0.12),
    pt(minX + width * 0.62, minY + height * 0.28),
    pt(minX + width * 0.58, minY + height * 0.52),
    pt(minX + width * 0.48, minY + height * 0.68),
  );
  roads.push({ d: coastRoad, width: 10, kind: "arterial" });

  const crossSuburb = cubicPath(
    pt(TOWERS[1].x - 80, TOWERS[1].y + 40),
    pt(GOV.x + 200, GOV.y - 40),
    pt(TOWERS[0].x + 60, TOWERS[0].y + 80),
    pt(minX + width * 0.2, minY + height * 0.45),
  );
  roads.push({ d: crossSuburb, width: 8, kind: "collector" });

  const ruralLoop = cubicPath(
    pt(HQ.x + 30, HQ.y - 60),
    pt(HQ.x + 140, HQ.y - 20),
    pt(HQ.x + 90, HQ.y + 80),
    pt(HQ.x - 40, HQ.y + 40),
  );
  roads.push({ d: ruralLoop, width: 5, kind: "rural" });

  const water = [coastalBay(bounds), riverChannel(bounds), lakeAndEstuary(bounds)];

  const parks = [
    parkBlob(GOV.x - 130, GOV.y + 110, 95, 68, 0.2),
    parkBlob(TOWERS[1].x - 55, TOWERS[1].y + 65, 78, 52, 0.5),
    parkBlob(minX + width * 0.18, minY + height * 0.62, 120, 85, 1.1),
  ];

  const bridges = [
    {
      x1: minX + width * 0.3,
      y1: minY + height * 0.34,
      x2: minX + width * 0.38,
      y2: minY + height * 0.36,
    },
    {
      x1: minX + width * 0.32,
      y1: minY + height * 0.52,
      x2: minX + width * 0.4,
      y2: minY + height * 0.5,
    },
    {
      x1: minX + width * 0.44,
      y1: minY + height * 0.62,
      x2: minX + width * 0.5,
      y2: minY + height * 0.58,
    },
  ];

  const shorelines = water.map((body) => body);

  const land = [
    `M ${fmt(pt(minX, minY))}`,
    `L ${fmt(pt(minX + width, minY))}`,
    `L ${fmt(pt(minX + width, minY + height))}`,
    `L ${fmt(pt(minX, minY + height))}`,
    "Z",
  ].join(" ");

  return { land, water, parks, roads, bridges, shorelines };
}

import {
  axialKey,
  axialToPixel,
  HEX_RADIUS,
  type AxialCoord,
} from "./hexLayout";
import { regionAtCoord } from "./mapWorld";
import type { MapRegion } from "./types";

/** Pointy-top hex — edge i faces neighbor i (clockwise from NE). */
const AXIAL_NEIGHBORS: AxialCoord[] = [
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
];

export const MAP_REGION_ORDER: MapRegion[] = [
  "countryside",
  "rural",
  "suburban",
  "metropolis",
];

export type RegionOutline = {
  region: MapRegion;
  key: string;
  d: string;
};

export type RegionLabelAnchor = {
  region: MapRegion;
  x: number;
  y: number;
};

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function vertexKey(x: number, y: number): string {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function hexVertexCoords(
  cx: number,
  cy: number,
  size: number = HEX_RADIUS,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push({
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    });
  }
  return pts;
}

function chaikinClosed(
  points: { x: number; y: number }[],
  iterations: number,
): { x: number; y: number }[] {
  let pts = points;
  for (let iter = 0; iter < iterations; iter += 1) {
    const next: { x: number; y: number }[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % pts.length];
      next.push({
        x: p0.x * 0.75 + p1.x * 0.25,
        y: p0.y * 0.75 + p1.y * 0.25,
      });
      next.push({
        x: p0.x * 0.25 + p1.x * 0.75,
        y: p0.y * 0.25 + p1.y * 0.75,
      });
    }
    pts = next;
  }
  return pts;
}

function organicOffset(
  points: { x: number; y: number }[],
  seed: number,
  amplitude: number,
): { x: number; y: number }[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const wobble = (hash01(seed + i * 17) - 0.5) * 2 * amplitude;
    return { x: p.x + nx * wobble, y: p.y + ny * wobble };
  });
}

function closedSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 3) return "";
  const n = points.length;
  let d = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

function traceBoundaryLoops(segments: [string, string][]): string[][] {
  const adj = new Map<string, { to: string; edgeId: number }[]>();
  for (let edgeId = 0; edgeId < segments.length; edgeId += 1) {
    const [a, b] = segments[edgeId];
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, edgeId });
    adj.get(b)!.push({ to: a, edgeId });
  }

  const used = new Set<number>();
  const loops: string[][] = [];

  for (let edgeId = 0; edgeId < segments.length; edgeId += 1) {
    if (used.has(edgeId)) continue;
    const [start, next] = segments[edgeId];
    used.add(edgeId);
    const loop = [start, next];
    let current = next;

    while (current !== start && loop.length <= segments.length + 2) {
      const options = (adj.get(current) ?? []).filter((e) => !used.has(e.edgeId));
      if (options.length === 0) break;
      const step = options[0];
      used.add(step.edgeId);
      current = step.to;
      if (current !== start) loop.push(current);
    }

    if (current === start && loop.length >= 3) {
      loops.push(loop);
    }
  }

  return loops;
}

function connectedComponentsForRegion(
  cells: AxialCoord[],
  region: MapRegion,
  cellsByKey: Map<string, AxialCoord>,
): Set<string>[] {
  const components: Set<string>[] = [];
  const visited = new Set<string>();

  for (const coord of cells) {
    if (regionAtCoord(coord) !== region) continue;
    const startKey = axialKey(coord);
    if (visited.has(startKey)) continue;

    const component = new Set<string>();
    const stack: AxialCoord[] = [coord];
    visited.add(startKey);

    while (stack.length > 0) {
      const current = stack.pop()!;
      component.add(axialKey(current));

      for (const offset of AXIAL_NEIGHBORS) {
        const neighbor = {
          q: current.q + offset.q,
          r: current.r + offset.r,
        };
        const neighborKey = axialKey(neighbor);
        if (!cellsByKey.has(neighborKey)) continue;
        if (regionAtCoord(neighbor) !== region) continue;
        if (visited.has(neighborKey)) continue;
        visited.add(neighborKey);
        stack.push(neighbor);
      }
    }

    components.push(component);
  }

  return components;
}

function largestComponent(components: Set<string>[]): Set<string> | null {
  if (components.length === 0) return null;
  return components.reduce((best, current) =>
    current.size > best.size ? current : best,
  );
}

export function getLargestComponentKeysByRegion(
  cells: AxialCoord[],
): Record<MapRegion, Set<string>> {
  const cellsByKey = new Map(cells.map((coord) => [axialKey(coord), coord]));
  const result: Record<MapRegion, Set<string>> = {
    metropolis: new Set(),
    suburban: new Set(),
    rural: new Set(),
    countryside: new Set(),
  };

  for (const region of MAP_REGION_ORDER) {
    const component = largestComponent(
      connectedComponentsForRegion(cells, region, cellsByKey),
    );
    result[region] = component ?? new Set();
  }

  return result;
}

function boundarySegmentsForComponent(
  cells: AxialCoord[],
  cellsByKey: Map<string, AxialCoord>,
  component: Set<string>,
  region: MapRegion,
  vertexPoints: Map<string, { x: number; y: number }>,
): [string, string][] {
  const segments: [string, string][] = [];

  for (const coord of cells) {
    const key = axialKey(coord);
    if (!component.has(key) || regionAtCoord(coord) !== region) continue;

    const { x, y } = axialToPixel(coord.q, coord.r);
    const verts = hexVertexCoords(x, y);

    for (let edge = 0; edge < 6; edge += 1) {
      const offset = AXIAL_NEIGHBORS[edge];
      const neighborKey = axialKey({
        q: coord.q + offset.q,
        r: coord.r + offset.r,
      });
      const neighbor = cellsByKey.get(neighborKey);
      if (
        neighbor &&
        regionAtCoord(neighbor) === region &&
        component.has(neighborKey)
      ) {
        continue;
      }

      const v0 = verts[edge];
      const v1 = verts[(edge + 1) % 6];
      const k0 = vertexKey(v0.x, v0.y);
      const k1 = vertexKey(v1.x, v1.y);
      vertexPoints.set(k0, v0);
      vertexPoints.set(k1, v1);
      segments.push([k0, k1]);
    }
  }

  return segments;
}

function outlinesForLargestComponent(
  cells: AxialCoord[],
  region: MapRegion,
  cellsByKey: Map<string, AxialCoord>,
): RegionOutline[] {
  const components = connectedComponentsForRegion(cells, region, cellsByKey);
  const component = largestComponent(components);
  if (!component) return [];

  const vertexPoints = new Map<string, { x: number; y: number }>();
  const segments = boundarySegmentsForComponent(
    cells,
    cellsByKey,
    component,
    region,
    vertexPoints,
  );
  const loops = traceBoundaryLoops(segments);
  const outlines: RegionOutline[] = [];

  loops.forEach((loop, loopIndex) => {
    const raw = loop
      .map((key) => vertexPoints.get(key))
      .filter((p): p is { x: number; y: number } => Boolean(p));
    if (raw.length < 3) return;

    const seed = loopIndex * 997 + region.charCodeAt(0) * 13;
    const cx = raw.reduce((sum, p) => sum + p.x, 0) / raw.length;
    const cy = raw.reduce((sum, p) => sum + p.y, 0) / raw.length;
    const fudged = raw.map((p, i) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const push = HEX_RADIUS * (0.05 + 0.04 * hash01(seed + i * 23));
      return {
        x: p.x + (dx / len) * push,
        y: p.y + (dy / len) * push,
      };
    });
    const smoothed = organicOffset(
      chaikinClosed(fudged, 4),
      seed,
      HEX_RADIUS * 0.11,
    );
    const d = closedSmoothPath(smoothed);
    if (!d) return;

    outlines.push({
      region,
      key: `outline-${region}-${loopIndex}`,
      d,
    });
  });

  return outlines;
}

export type RegionLabelObstacle = {
  x: number;
  y: number;
  radius: number;
};

const LABEL_CLEARANCE = 34;

function clearanceAt(
  x: number,
  y: number,
  obstacles: RegionLabelObstacle[],
): number {
  let min = Infinity;
  for (const obstacle of obstacles) {
    const dist = Math.hypot(x - obstacle.x, y - obstacle.y) - obstacle.radius;
    min = Math.min(min, dist);
  }
  return min;
}

function pickLabelAnchor(
  component: Set<string>,
  cellsByKey: Map<string, AxialCoord>,
  obstacles: RegionLabelObstacle[],
): { x: number; y: number } {
  const candidates: { x: number; y: number }[] = [];
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const key of component) {
    const coord = cellsByKey.get(key);
    if (!coord) continue;
    const { x, y } = axialToPixel(coord.q, coord.r);
    sumX += x;
    sumY += y;
    count += 1;
    candidates.push({ x, y });
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI / 3) * i;
      candidates.push({
        x: x + Math.cos(angle) * HEX_RADIUS * 0.38,
        y: y + Math.sin(angle) * HEX_RADIUS * 0.38,
      });
    }
  }

  if (count === 0) return { x: 0, y: 0 };

  const cx = sumX / count;
  const cy = sumY / count;
  candidates.push({ x: cx, y: cy });

  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i;
    candidates.push({
      x: cx + Math.cos(angle) * HEX_RADIUS * 0.72,
      y: cy + Math.sin(angle) * HEX_RADIUS * 0.72,
    });
    candidates.push({
      x: cx + Math.cos(angle) * HEX_RADIUS * 1.15,
      y: cy + Math.sin(angle) * HEX_RADIUS * 1.15,
    });
  }

  let best = { x: cx, y: cy };
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const clear = clearanceAt(candidate.x, candidate.y, obstacles);
    const centrality =
      -Math.hypot(candidate.x - cx, candidate.y - cy) / HEX_RADIUS;
    const score = clear + centrality * 8;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (clearanceAt(best.x, best.y, obstacles) >= LABEL_CLEARANCE) {
    return best;
  }

  for (let ring = 1.4; ring <= 3.2; ring += 0.45) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI / 6) * i;
      const candidate = {
        x: cx + Math.cos(angle) * HEX_RADIUS * ring,
        y: cy + Math.sin(angle) * HEX_RADIUS * ring,
      };
      const clear = clearanceAt(candidate.x, candidate.y, obstacles);
      const centrality =
        -Math.hypot(candidate.x - cx, candidate.y - cy) / HEX_RADIUS;
      const score = clear + centrality * 5;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }

  return best;
}

/** Label anchor on each region's largest blob, clear of props and landmarks. */
export function getRegionLabelCentroids(
  cells: AxialCoord[],
  obstacles: RegionLabelObstacle[] = [],
): RegionLabelAnchor[] {
  const cellsByKey = new Map(cells.map((coord) => [axialKey(coord), coord]));
  const anchors: RegionLabelAnchor[] = [];

  for (const region of MAP_REGION_ORDER) {
    const component = largestComponent(
      connectedComponentsForRegion(cells, region, cellsByKey),
    );
    if (!component || component.size === 0) continue;

    const anchor = pickLabelAnchor(component, cellsByKey, obstacles);
    anchors.push({
      region,
      x: anchor.x,
      y: anchor.y,
    });
  }

  return anchors;
}

/** Smooth closed paths for the largest visible blob of each region (or one region). */
export function buildRegionOutlinePaths(
  cells: AxialCoord[],
  targetRegion?: MapRegion,
): RegionOutline[] {
  const cellsByKey = new Map(cells.map((coord) => [axialKey(coord), coord]));
  const regions = targetRegion ? [targetRegion] : MAP_REGION_ORDER;
  const outlines: RegionOutline[] = [];

  for (const region of regions) {
    outlines.push(
      ...outlinesForLargestComponent(cells, region, cellsByKey),
    );
  }

  return outlines;
}

/** Outlines keyed by region for legend hover. */
export function buildRegionOutlinesByRegion(
  cells: AxialCoord[],
): Record<MapRegion, RegionOutline[]> {
  const byRegion: Record<MapRegion, RegionOutline[]> = {
    metropolis: [],
    suburban: [],
    rural: [],
    countryside: [],
  };

  for (const region of MAP_REGION_ORDER) {
    byRegion[region] = buildRegionOutlinePaths(cells, region);
  }

  return byRegion;
}

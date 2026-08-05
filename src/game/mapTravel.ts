import {
  axialDistance,
  axialToPixel,
  HEX_RADIUS,
  officeCoordFor,
} from "./hexLayout";
import { towerById } from "./mapWorld";
import type {
  AxialCoord,
  GameState,
  OfficeLocationId,
  TowerId,
} from "./types";

/** Shared map travel rate (staff transfers + job task forces). */
export const TRAVEL_SEC_PER_HEX = 30;

export function travelDurationMs(hexes: number): number {
  return Math.max(0, Math.floor(hexes)) * TRAVEL_SEC_PER_HEX * 1000;
}

/** Cube-lerp hex line from a to b (inclusive). */
export function hexPath(a: AxialCoord, b: AxialCoord): AxialCoord[] {
  const n = axialDistance(a, b);
  if (n === 0) return [{ ...a }];

  const results: AxialCoord[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    results.push(cubeRound(cubeLerp(axialToCube(a), axialToCube(b), t)));
  }
  return results;
}

export function jobTravelHexes(
  state: GameState,
  officeId: OfficeLocationId,
  towerId: TowerId,
): number {
  const from = officeCoordFor(officeId, state.branchCoord);
  const to = towerById(towerId).coord;
  return Math.max(1, axialDistance(from, to));
}

export function jobTravelDurationMs(
  state: GameState,
  officeId: OfficeLocationId,
  towerId: TowerId,
): number {
  return travelDurationMs(jobTravelHexes(state, officeId, towerId));
}

export function officeTowerCoords(
  state: GameState,
  officeId: OfficeLocationId,
  towerId: TowerId,
): { from: AxialCoord; to: AxialCoord } {
  return {
    from: officeCoordFor(officeId, state.branchCoord),
    to: { ...towerById(towerId).coord },
  };
}

/** Pixel centers along a hex path (dev dotted route). */
export function hexPathPixels(
  path: AxialCoord[],
  size: number = HEX_RADIUS,
): { x: number; y: number }[] {
  return path.map((c) => axialToPixel(c.q, c.r, size));
}

/** Lerp a point along polyline by progress 0..1. */
export function pointAlongPolyline(
  points: { x: number; y: number }[],
  progress: number,
): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { ...points[0] };
  const t = Math.min(1, Math.max(0, progress));
  const total = polylineLength(points);
  if (total <= 0) return { ...points[0] };
  let remaining = total * t;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg || i === points.length - 2) {
      const u = seg <= 0 ? 0 : remaining / seg;
      return {
        x: a.x + (b.x - a.x) * u,
        y: a.y + (b.y - a.y) * u,
      };
    }
    remaining -= seg;
  }
  return { ...points[points.length - 1] };
}

function polylineLength(points: { x: number; y: number }[]): number {
  let sum = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    sum += Math.hypot(
      points[i + 1].x - points[i].x,
      points[i + 1].y - points[i].y,
    );
  }
  return sum;
}

type Cube = { x: number; y: number; z: number };

function axialToCube(c: AxialCoord): Cube {
  return { x: c.q, z: c.r, y: -c.q - c.r };
}

function cubeLerp(a: Cube, b: Cube, t: number): Cube {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function cubeRound(c: Cube): AxialCoord {
  let rx = Math.round(c.x);
  let ry = Math.round(c.y);
  let rz = Math.round(c.z);
  const xDiff = Math.abs(rx - c.x);
  const yDiff = Math.abs(ry - c.y);
  const zDiff = Math.abs(rz - c.z);
  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }
  return { q: rx, r: rz };
}

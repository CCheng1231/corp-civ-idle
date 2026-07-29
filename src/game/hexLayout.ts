/** Pointy-top hex layout (Civilization-style tessellation). */

import type { OfficeLocationId } from "./types";
import type { AxialCoord } from "./types";

/** Hex circumradius in px — 50% larger than original 26. */
export const HEX_RADIUS = 39;

/** Axial hexagon patch radius (includes tiles up to 5 steps from center). */
export const MAP_RADIUS = 6;

export type { AxialCoord } from "./types";

export const MAP_GOV: AxialCoord = { q: 0, r: 0 };
/** Five hex steps from Gov along the same axis. */
export const MAP_HQ: AxialCoord = { q: 0, r: -5 };
/** On the Gov → HQ line, between the two. */
export const MAP_BRANCH: AxialCoord = { q: 0, r: -3 };

export function axialKey({ q, r }: AxialCoord): string {
  return `${q},${r}`;
}

export function axialToPixel(
  q: number,
  r: number,
  size: number = HEX_RADIUS,
): { x: number; y: number } {
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * 1.5 * r;
  return { x, y };
}

export function hexPolygonPoints(
  cx: number,
  cy: number,
  size: number = HEX_RADIUS,
): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(
      `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`,
    );
  }
  return points.join(" ");
}

export function generateHexagonMap(radius: number = MAP_RADIUS): AxialCoord[] {
  const cells: AxialCoord[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius) {
        cells.push({ q, r });
      }
    }
  }
  return cells;
}

export function hexBounds(cells: AxialCoord[], size: number = HEX_RADIUS) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { q, r } of cells) {
    const { x, y } = axialToPixel(q, r, size);
    minX = Math.min(minX, x - size);
    minY = Math.min(minY, y - size);
    maxX = Math.max(maxX, x + size);
    maxY = Math.max(maxY, y + size);
  }

  const pad = 6;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

export function axialEquals(a: AxialCoord, b: AxialCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function officeAtCoord(
  coord: AxialCoord,
  branch: { established: boolean; coord: AxialCoord | null },
): OfficeLocationId | null {
  if (axialEquals(coord, MAP_HQ)) return "hq";
  if (
    branch.established &&
    branch.coord &&
    axialEquals(coord, branch.coord)
  ) {
    return "branch";
  }
  return null;
}

export function officeCoordFor(
  officeId: OfficeLocationId,
  branchCoord: AxialCoord | null,
): AxialCoord {
  if (officeId === "hq") return MAP_HQ;
  return branchCoord ?? MAP_BRANCH;
}

/** @deprecated use officeCoordFor — legacy default branch tile */
export const OFFICE_COORDS: Record<OfficeLocationId, AxialCoord> = {
  hq: MAP_HQ,
  branch: MAP_BRANCH,
};

/** Cube / axial hex steps between two tiles. */
export function axialDistance(a: AxialCoord, b: AxialCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function officeSeparationHexes(
  from: OfficeLocationId,
  to: OfficeLocationId,
  branchCoord: AxialCoord | null,
): number {
  if (from === to) return 0;
  return axialDistance(
    officeCoordFor(from, branchCoord),
    officeCoordFor(to, branchCoord),
  );
}

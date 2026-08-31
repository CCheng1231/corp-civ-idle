/** Pointy-top hex layout (Civilization-style tessellation). */

import type { AxialCoord, EstablishedBranchSite, OfficeLocationId } from "./types";
import {
  branchOfficeIdForSite,
  branchSiteCoord,
} from "./branchSites";

/** Hex circumradius in px — roomier than the original 26 for player city map. */
export const HEX_RADIUS = 42;

/** Axial hexagon patch radius (map extent from Gov). */
export const MAP_RADIUS = 7;

export type { AxialCoord } from "./types";

export const MAP_GOV: AxialCoord = { q: 0, r: 0 };
/**
 * Starting HQ in the countryside rim (future company starts land here too).
 * Slightly off-axis so the map spine isn't a straight column.
 */
export const MAP_HQ: AxialCoord = { q: 2, r: -7 };
/** Legacy fallback branch tile (live branches use branchCoord). */
export const MAP_BRANCH: AxialCoord = { q: -1, r: -3 };

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
  branch: { branchSites: EstablishedBranchSite[] },
  hqCoord: AxialCoord = MAP_HQ,
): OfficeLocationId | null {
  if (axialEquals(coord, hqCoord)) return "hq";
  for (const site of branch.branchSites) {
    if (axialEquals(coord, branchSiteCoord(site))) {
      return branchOfficeIdForSite(site);
    }
  }
  return null;
}

export function officeCoordFor(
  officeId: OfficeLocationId,
  _branchCoord: AxialCoord | null,
  hqCoord: AxialCoord = MAP_HQ,
): AxialCoord {
  if (officeId === "hq") return hqCoord;
  return MAP_BRANCH;
}

/** @deprecated use branchSiteCoordForOffice — HQ-only fallback map */
export const OFFICE_COORDS = {
  hq: MAP_HQ,
} as const satisfies Record<"hq", AxialCoord>;

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
  hqCoord: AxialCoord = MAP_HQ,
): number {
  if (from === to) return 0;
  return axialDistance(
    officeCoordFor(from, branchCoord, hqCoord),
    officeCoordFor(to, branchCoord, hqCoord),
  );
}

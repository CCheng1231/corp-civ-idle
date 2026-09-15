/**
 * Six strategic major hubs — canon art targets bound to nearest playable hexes.
 * Gov (0,0) is the center; painted positions live in z1-layout-canonical.json.
 */
import {
  axialEquals,
  axialKey,
  generateHexagonMap,
  MAP_GOV,
  MAP_RADIUS,
  type AxialCoord,
} from "./hexLayout";
import { worldMapAxialToPixel } from "./mapWorld";
import {
  z1CanonicalMajorHubHexes,
  z1CanonicalMajorHubMarkers,
} from "./z1LayoutCanonical";
import {
  Z1_MAJOR_HUB_MARKER_COUNT,
  type MapZ1MajorHubMarker,
} from "./worldMapZ1Markers";
import type { GameSettings } from "./types";
import { effectiveLandmarkCoord } from "./mapDevLayout";

export interface Z1MajorHubDefinition {
  id: string;
  slot: number;
  label: string;
  coord: AxialCoord;
  /** Locked art target (viewBox px) from z1-layout-canonical.json */
  canonPixel: MapZ1MajorHubMarker;
}

export function buildZ1MajorHubs(
  markers: MapZ1MajorHubMarker[],
): Z1MajorHubDefinition[] {
  const cells = generateHexagonMap(MAP_RADIUS).filter(
    (c) => !axialEquals(c, MAP_GOV),
  );
  const used = new Set<string>();
  const hubs: Z1MajorHubDefinition[] = [];

  for (let i = 0; i < markers.length; i += 1) {
    const pixel = markers[i]!;
    let best: AxialCoord | null = null;
    let bestDistSq = Infinity;

    for (const c of cells) {
      const k = axialKey(c);
      if (used.has(k)) continue;
      const p = worldMapAxialToPixel(c);
      const dx = p.x - pixel.x;
      const dy = p.y - pixel.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = c;
      }
    }

    if (!best) break;
    used.add(axialKey(best));
    hubs.push({
      id: `major-hub-${i + 1}`,
      slot: i + 1,
      label: `Major hub ${i + 1}`,
      coord: best,
      canonPixel: pixel,
    });
  }

  return hubs;
}

function buildZ1MajorHubsLocked(
  markers: MapZ1MajorHubMarker[],
  hexes: { q: number; r: number }[],
): Z1MajorHubDefinition[] {
  return hexes.map((coord, i) => ({
    id: `major-hub-${i + 1}`,
    slot: i + 1,
    label: `Major hub ${i + 1}`,
    coord,
    canonPixel: markers[i] ?? worldMapAxialToPixel(coord),
  }));
}

const canonMarkers = z1CanonicalMajorHubMarkers();
const canonHexes = z1CanonicalMajorHubHexes();

export const Z1_MAJOR_HUBS: Z1MajorHubDefinition[] =
  canonHexes.length === Z1_MAJOR_HUB_MARKER_COUNT &&
  canonMarkers.length === Z1_MAJOR_HUB_MARKER_COUNT
    ? buildZ1MajorHubsLocked(canonMarkers, canonHexes)
    : buildZ1MajorHubs(canonMarkers);

export function resolveZ1MajorHubs(
  settings?: GameSettings,
): Z1MajorHubDefinition[] {
  return Z1_MAJOR_HUBS.map((h) => {
    const moved = effectiveLandmarkCoord(`major-${h.slot}`, settings);
    if (!moved) return h;
    return { ...h, coord: moved };
  });
}

export function majorHubAtCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): Z1MajorHubDefinition | null {
  const k = axialKey(coord);
  return resolveZ1MajorHubs(settings).find((h) => axialKey(h.coord) === k) ?? null;
}

export function isZ1MajorHubCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): boolean {
  return majorHubAtCoord(coord, settings) !== null;
}

/** For layout / Z1 hub glow filter layer */
export function z1MajorHubArtSites(settings?: GameSettings): {
  id: string;
  coord: AxialCoord;
  role: "major";
}[] {
  return resolveZ1MajorHubs(settings).map((h) => ({
    id: h.id,
    coord: h.coord,
    role: "major" as const,
  }));
}

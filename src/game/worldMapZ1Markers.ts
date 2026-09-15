import { z1CanonicalMajorHubMarkers } from "./z1LayoutCanonical";

/** Content-pixel targets for Z1 six major hubs (dev placement; not necessarily hex centers). */
export interface MapZ1MajorHubMarker {
  x: number;
  y: number;
}

export const Z1_MAJOR_HUB_MARKER_COUNT = 6;

export function parseMapZ1MajorHubMarkers(raw: unknown): MapZ1MajorHubMarker[] {
  if (!Array.isArray(raw)) return [];
  const out: MapZ1MajorHubMarker[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const x = (item as { x?: unknown }).x;
    const y = (item as { y?: unknown }).y;
    if (
      typeof x === "number" &&
      typeof y === "number" &&
      Number.isFinite(x) &&
      Number.isFinite(y)
    ) {
      out.push({ x, y });
      if (out.length >= Z1_MAJOR_HUB_MARKER_COUNT) break;
    }
  }
  return out;
}

/** Save override, else repo canon (`z1-layout-canonical.json`). */
export function resolveZ1MajorHubMarkers(
  partial?: MapZ1MajorHubMarker[] | null,
): MapZ1MajorHubMarker[] {
  const fromSave = parseMapZ1MajorHubMarkers(partial);
  if (fromSave.length > 0) return fromSave;
  return z1CanonicalMajorHubMarkers();
}

export function applyZ1MajorHubPlacement(
  markers: MapZ1MajorHubMarker[],
  cycleIndex: number,
  point: MapZ1MajorHubMarker,
): MapZ1MajorHubMarker[] {
  const slot = cycleIndex % Z1_MAJOR_HUB_MARKER_COUNT;
  const next = [...markers];
  if (next.length < Z1_MAJOR_HUB_MARKER_COUNT && slot === next.length) {
    next.push(point);
    return next;
  }
  while (next.length < Z1_MAJOR_HUB_MARKER_COUNT) {
    next.push(point);
  }
  next[slot] = point;
  return next;
}

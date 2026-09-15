/**
 * Repo-canonical Z1 alignment (Chris sign-off). Overrides identity defaults;
 * per-save settings still win when present.
 */
import canonical from "../assets/z1-layout-canonical.json";
import type { Z1RasterAlignment } from "./worldMapZ1Align";
import type { MapZ1MajorHubMarker } from "./worldMapZ1Markers";

/** Keep in sync with `Z1_MAJOR_HUB_MARKER_COUNT` — local to avoid import cycle. */
const Z1_MAJOR_HUB_MARKER_COUNT = 6;

function parseMarkers(raw: unknown): MapZ1MajorHubMarker[] {
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

export interface Z1LayoutCanonical {
  lockedAt: string;
  note?: string;
  rasterAlign: Z1RasterAlignment;
  majorHubMarkers: MapZ1MajorHubMarker[];
  /** When present, major hubs bind to these axial coords (bake cornerstone). */
  majorHubHexes?: { q: number; r: number }[];
}

const parsed = canonical as Z1LayoutCanonical;

function parseMajorHubHexes(raw: unknown): { q: number; r: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { q: number; r: number }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const q = (item as { q?: unknown }).q;
    const r = (item as { r?: unknown }).r;
    if (
      typeof q === "number" &&
      typeof r === "number" &&
      Number.isFinite(q) &&
      Number.isFinite(r)
    ) {
      out.push({ q, r });
      if (out.length >= Z1_MAJOR_HUB_MARKER_COUNT) break;
    }
  }
  return out;
}

export const Z1_LAYOUT_CANONICAL: Z1LayoutCanonical = {
  lockedAt: parsed.lockedAt ?? "2026-09-15",
  note: parsed.note,
  rasterAlign: {
    offsetX: Number(parsed.rasterAlign?.offsetX) || 0,
    offsetY: Number(parsed.rasterAlign?.offsetY) || 0,
    scale: Number(parsed.rasterAlign?.scale) || 1,
    rotationDeg: Number(parsed.rasterAlign?.rotationDeg) || 0,
  },
  majorHubMarkers: parseMarkers(parsed.majorHubMarkers),
  majorHubHexes: parseMajorHubHexes(parsed.majorHubHexes),
};

export function z1CanonicalRasterAlign(): Z1RasterAlignment {
  return { ...Z1_LAYOUT_CANONICAL.rasterAlign };
}

export function z1CanonicalMajorHubMarkers(): MapZ1MajorHubMarker[] {
  return Z1_LAYOUT_CANONICAL.majorHubMarkers.slice(0, Z1_MAJOR_HUB_MARKER_COUNT);
}

export function z1CanonicalMajorHubHexes(): { q: number; r: number }[] {
  return (Z1_LAYOUT_CANONICAL.majorHubHexes ?? []).slice(
    0,
    Z1_MAJOR_HUB_MARKER_COUNT,
  );
}

export function z1LayoutCanonicalExportPayload(
  rasterAlign: Z1RasterAlignment,
  majorHubMarkers: MapZ1MajorHubMarker[],
): Z1LayoutCanonical {
  return {
    lockedAt: new Date().toISOString().slice(0, 10),
    rasterAlign: { ...rasterAlign },
    majorHubMarkers: majorHubMarkers.slice(0, Z1_MAJOR_HUB_MARKER_COUNT),
  };
}

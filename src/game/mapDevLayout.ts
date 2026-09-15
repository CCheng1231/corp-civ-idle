/**
 * Dev-only map layout overrides (persisted in settings until exported to repo canon).
 */
import {
  MAP_GOV,
  MAP_HQ,
  MAP_RADIUS,
  axialKey,
  generateHexagonMap,
} from "./hexLayout";
import type { AxialCoord, GameSettings } from "./types";
import {
  COMMERCIAL_REAL_ESTATE,
  OFFICE_TOWERS,
  worldMapAxialToPixel,
} from "./mapWorld";
import { CHRIS_HQ } from "../multiplayer/playerHq";
import { axialEquals } from "./hexLayout";
import { Z1_MAJOR_HUB_MARKER_COUNT } from "./worldMapZ1Markers";
import {
  z1CanonicalMajorHubHexes,
  z1CanonicalMajorHubMarkers,
  z1LayoutCanonicalExportPayload,
} from "./z1LayoutCanonical";
import type { Z1RasterAlignment } from "./worldMapZ1Align";
import { isMapDevLandmarkKeyLocked } from "./mapLayoutLock";

export type MapDevLandmarkKey = string;

export function mapDevLandmarkOptions(): {
  key: MapDevLandmarkKey;
  label: string;
  locked?: boolean;
}[] {
  return [
    { key: "gov", label: "Gov (locked)", locked: true },
    ...Array.from({ length: Z1_MAJOR_HUB_MARKER_COUNT }, (_, i) => ({
      key: `major-${i + 1}`,
      label: `Major hub ${i + 1} (locked)`,
      locked: true,
    })),
    ...OFFICE_TOWERS.map((t) => ({
      key: `tower:${t.id}`,
      label: t.name,
    })),
    { key: "hq:tim", label: "Tim HQ" },
    { key: "hq:chris", label: "Chris HQ" },
    ...COMMERCIAL_REAL_ESTATE.map((lot) => ({
      key: `commercial:${lot.id}`,
      label: lot.label,
    })),
  ];
}

export function defaultMapDevMovableLandmarkKey(): MapDevLandmarkKey {
  const opt = mapDevLandmarkOptions().find((o) => !o.locked);
  return opt?.key ?? "hq:chris";
}

function parseCoord(raw: unknown): AxialCoord | null {
  if (!raw || typeof raw !== "object") return null;
  const q = (raw as { q?: unknown }).q;
  const r = (raw as { r?: unknown }).r;
  if (typeof q !== "number" || typeof r !== "number") return null;
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}

export function mapDevLandmarkCoords(
  settings?: GameSettings,
): Record<MapDevLandmarkKey, AxialCoord> {
  const raw = settings?.mapDevLandmarkCoords;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<MapDevLandmarkKey, AxialCoord> = {};
  for (const [key, value] of Object.entries(raw)) {
    const c = parseCoord(value);
    if (c) out[key] = c;
  }
  return out;
}

/** Movable landmarks only (export sidecar; locked hubs use majorHubHexes). */
export function mapDevLandmarkCoordsMovable(
  settings?: GameSettings,
): Record<MapDevLandmarkKey, AxialCoord> {
  const all = mapDevLandmarkCoords(settings);
  const out: Record<MapDevLandmarkKey, AxialCoord> = {};
  for (const [key, value] of Object.entries(all)) {
    if (isMapDevLandmarkKeyLocked(key)) continue;
    out[key] = value;
  }
  return out;
}

export function mapDevExtraHexes(settings?: GameSettings): AxialCoord[] {
  const raw = settings?.mapDevExtraHexes;
  if (!Array.isArray(raw)) return [];
  const out: AxialCoord[] = [];
  for (const item of raw) {
    const c = parseCoord(item);
    if (c) out.push(c);
  }
  return out;
}

export function defaultCoordForLandmark(key: MapDevLandmarkKey): AxialCoord | null {
  if (key === "gov") return MAP_GOV;
  if (key.startsWith("major-")) {
    const slot = Number(key.slice("major-".length));
    const hexes = z1CanonicalMajorHubHexes();
    const h = hexes[slot - 1];
    return h ? { q: h.q, r: h.r } : null;
  }
  if (key.startsWith("tower:")) {
    const id = key.slice("tower:".length);
    return OFFICE_TOWERS.find((t) => t.id === id)?.coord ?? null;
  }
  if (key === "hq:tim") return MAP_HQ;
  if (key === "hq:chris") return CHRIS_HQ;
  if (key.startsWith("commercial:")) {
    const id = key.slice("commercial:".length);
    return COMMERCIAL_REAL_ESTATE.find((l) => l.id === id)?.coord ?? null;
  }
  return null;
}

export function effectiveLandmarkCoord(
  key: MapDevLandmarkKey,
  settings?: GameSettings,
): AxialCoord | null {
  const overrides = mapDevLandmarkCoords(settings);
  return overrides[key] ?? defaultCoordForLandmark(key);
}

/** Gov + major hub cells at their effective axial positions (for nudge UI). */
export function isMapLayoutLockedCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): boolean {
  if (axialEquals(coord, MAP_GOV)) return true;
  for (let slot = 1; slot <= Z1_MAJOR_HUB_MARKER_COUNT; slot += 1) {
    const c = effectiveLandmarkCoord(`major-${slot}`, settings);
    if (c && axialEquals(coord, c)) return true;
  }
  return false;
}

export function worldMapCellsForSettings(settings?: GameSettings): AxialCoord[] {
  const merged = new Map<string, AxialCoord>();
  for (const c of generateHexagonMap(MAP_RADIUS)) {
    merged.set(axialKey(c), c);
  }
  for (const c of mapDevExtraHexes(settings)) {
    merged.set(axialKey(c), c);
  }
  return Array.from(merged.values());
}

export function landmarkKeyForCoord(
  coord: AxialCoord,
  settings?: GameSettings,
): MapDevLandmarkKey | null {
  if (axialEquals(coord, MAP_GOV)) return null;
  for (const opt of mapDevLandmarkOptions()) {
    if (opt.locked) continue;
    const c = effectiveLandmarkCoord(opt.key, settings);
    if (c && axialEquals(coord, c)) return opt.key;
  }
  return null;
}

/** Presentation pixel for hex tiles and markers (grid + per-cell nudge in dev). */
export function worldMapPresentationPixel(
  coord: AxialCoord,
  settings?: GameSettings,
): { x: number; y: number } {
  const base = worldMapAxialToPixel(coord);
  if (!settings) return base;
  let dx = settings.mapDevGridNudge?.dx ?? 0;
  let dy = settings.mapDevGridNudge?.dy ?? 0;
  const hex = settings.mapDevHexNudges?.[axialKey(coord)];
  if (hex) {
    dx += hex.dx;
    dy += hex.dy;
  }
  const siteKey = landmarkKeyForCoord(coord, settings);
  const site = siteKey ? settings.mapDevSiteNudges?.[siteKey] : undefined;
  if (site) {
    dx += site.dx;
    dy += site.dy;
  }
  if (dx === 0 && dy === 0) return base;
  return { x: base.x + dx, y: base.y + dy };
}

export function nearestAxialFromViewBox(
  point: { x: number; y: number },
  maxRadius: number = MAP_RADIUS + 2,
): AxialCoord {
  let best: AxialCoord = MAP_GOV;
  let bestDist = Infinity;
  for (let q = -maxRadius; q <= maxRadius; q += 1) {
    for (let r = -maxRadius; r <= maxRadius; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) > maxRadius) continue;
      const p = worldMapAxialToPixel({ q, r });
      const d = (p.x - point.x) ** 2 + (p.y - point.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = { q, r };
      }
    }
  }
  return best;
}

export function mapDevLayoutExportPayload(
  settings: GameSettings,
  rasterAlign: Z1RasterAlignment,
): Record<string, unknown> {
  const markers = z1CanonicalMajorHubMarkers();
  const canon = z1LayoutCanonicalExportPayload(rasterAlign, markers);
  const moves = mapDevLandmarkCoordsMovable(settings);
  const majorHubHexes = Array.from(
    { length: Z1_MAJOR_HUB_MARKER_COUNT },
    (_, i) => effectiveLandmarkCoord(`major-${i + 1}`, settings),
  ).filter(Boolean);

  return {
    ...canon,
    majorHubHexes,
    mapDevLandmarkCoords: moves,
    mapDevExtraHexes: mapDevExtraHexes(settings),
    mapDevGridNudge: settings.mapDevGridNudge,
    mapDevHexNudges: settings.mapDevHexNudges,
    mapDevSiteNudges: settings.mapDevSiteNudges,
  };
}

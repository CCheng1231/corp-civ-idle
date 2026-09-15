/**
 * Data-driven world map layout — hub sites, tunable greenbelt, placeholders.
 * Art generators read from here so coords can change without repainting PNGs.
 */
import { MAP_GOV, MAP_HQ, axialKey, type AxialCoord } from "./hexLayout";
import { CHRIS_HQ } from "../multiplayer/playerHq";
import {
  COMMERCIAL_REAL_ESTATE,
  OFFICE_TOWERS,
  worldMapAxialToPixel,
} from "./mapWorld";
import { Z1_MAJOR_HUBS } from "./worldMapMajorHubs";

export type MapZ1FilterGroup =
  | "base"
  | "geography"
  | "hubs"
  | "roads"
  | "flavor";

/** Procedural Z1 layers (hub-aligned generator). `base` = land, not a static PNG. */
/** Player default: terrain only; hub/road/flavor overlays via filters (v0.2 UX). */
/** `base` = pass-1 hybrid-soft bake; overlays off by default (pins + bake only). */
export const MAP_Z1_LAYER_DEFAULTS: Record<MapZ1FilterGroup, boolean> = {
  base: true,
  geography: false,
  hubs: false,
  roads: false,
  flavor: false,
};

export type MapArtHubRole =
  | "gov"
  | "major"
  | "tower"
  | "hq"
  | "commercial"
  | "mini-placeholder";

export interface MapArtHubSite {
  id: string;
  coord: AxialCoord;
  role: MapArtHubRole;
  filterGroup: "hubs" | "flavor";
}

export interface WorldMapGreenbeltConfig {
  /** Visual center follows Gov pixel (from axial). */
  centerAxial: AxialCoord;
  ringRadiusPx: number;
  wobble: number;
  strokeWidth: number;
  innerUrbanRadiusPx: number;
  innerUrbanWobble: number;
}

export interface WorldMapHubGlowConfig {
  gov: { rx: number; ry: number };
  major: { rx: number; ry: number };
  tower: { rx: number; ry: number };
  hq: { rx: number; ry: number };
  commercial: { rx: number; ry: number };
  miniPlaceholder: { rx: number; ry: number };
}

export interface WorldMapLayoutConfig {
  greenbelt: WorldMapGreenbeltConfig;
  hubGlow: WorldMapHubGlowConfig;
  /** Undesigned beginner / mini hubs — empty until design exists. */
  miniHubPlaceholders: AxialCoord[];
}

export const DEFAULT_WORLD_MAP_LAYOUT: WorldMapLayoutConfig = {
  greenbelt: {
    centerAxial: MAP_GOV,
    ringRadiusPx: 86,
    wobble: 11,
    strokeWidth: 22,
    innerUrbanRadiusPx: 64,
    innerUrbanWobble: 8,
  },
  hubGlow: {
    gov: { rx: 92, ry: 78 },
    major: { rx: 52, ry: 44 },
    tower: { rx: 48, ry: 40 },
    hq: { rx: 44, ry: 38 },
    commercial: { rx: 36, ry: 30 },
    miniPlaceholder: { rx: 22, ry: 18 },
  },
  miniHubPlaceholders: [],
};

/** HQ test coords (online Tim / Chris) — engine may change; art follows. */
export function mapArtHqTestCoords(): AxialCoord[] {
  const key = (c: AxialCoord) => `${c.q},${c.r}`;
  const seen = new Set<string>();
  const out: AxialCoord[] = [];
  for (const c of [MAP_HQ, CHRIS_HQ]) {
    const k = key(c);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(c);
    }
  }
  return out;
}

/** All sites that anchor Z1 hub / flavor layers (gameplay coords). */
export function mapArtHubSites(
  layout: WorldMapLayoutConfig = DEFAULT_WORLD_MAP_LAYOUT,
): MapArtHubSite[] {
  const sites: MapArtHubSite[] = [
    { id: "gov", coord: MAP_GOV, role: "gov", filterGroup: "hubs" },
    ...Z1_MAJOR_HUBS.map((h) => ({
      id: h.id,
      coord: h.coord,
      role: "major" as const,
      filterGroup: "hubs" as const,
    })),
    ...OFFICE_TOWERS.filter(
      (t) => !Z1_MAJOR_HUBS.some((h) => axialKey(h.coord) === axialKey(t.coord)),
    ).map((t) => ({
      id: t.id,
      coord: t.coord,
      role: "tower" as const,
      filterGroup: "hubs" as const,
    })),
    ...mapArtHqTestCoords().map((coord, i) => ({
      id: `hq-test-${i}`,
      coord,
      role: "hq" as const,
      filterGroup: "hubs" as const,
    })),
    ...COMMERCIAL_REAL_ESTATE.map((lot) => ({
      id: lot.id,
      coord: lot.coord,
      role: "commercial" as const,
      filterGroup: "hubs" as const,
    })),
    ...layout.miniHubPlaceholders.map((coord, i) => ({
      id: `mini-${i}`,
      coord,
      role: "mini-placeholder" as const,
      filterGroup: "flavor" as const,
    })),
  ];
  return sites;
}

export function mapArtHubPixel(
  site: MapArtHubSite,
): { x: number; y: number } {
  return worldMapAxialToPixel(site.coord);
}

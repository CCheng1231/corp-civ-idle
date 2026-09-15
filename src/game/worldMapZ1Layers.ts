/**
 * Z1 strategic map — hex-driven terrain (no legacy bay/river SVG). Hub glows at engine coords.
 */
import {
  axialDistance,
  axialKey,
  generateHexagonMap,
  hexPolygonPoints,
  MAP_GOV,
  MAP_RADIUS,
  type AxialCoord,
} from "./hexLayout";
import type { MapBounds } from "./worldMapV01";
import {
  DEFAULT_WORLD_MAP_LAYOUT,
  type MapArtHubRole,
  type MapArtHubSite,
  type MapZ1FilterGroup,
  mapArtHubPixel,
  mapArtHubSites,
  type WorldMapLayoutConfig,
} from "./worldMapLayout";
import {
  worldMapAxialToPixel,
  worldMapOuterGreenbeltRadiusPx,
} from "./mapWorld";

export interface Z1PathDraw {
  d: string;
  className: string;
}

export interface Z1HubDraw {
  siteId: string;
  role: MapArtHubRole;
  d: string;
  className: string;
}

export interface Z1Layer {
  id: string;
  filterGroup: MapZ1FilterGroup;
  paths: Z1PathDraw[];
  hubs: Z1HubDraw[];
}

export interface Z1HubGradient {
  id: string;
  cx: number;
  cy: number;
  r: number;
  innerColor: string;
  outerColor: string;
}

export interface Z1LayerStack {
  layers: Z1Layer[];
  govCenter: { x: number; y: number };
  landGradientRadius: number;
  hubGradients: Z1HubGradient[];
}

/** Meandering river as a chain of playable hexes (no painted channel overlapping center lake). */
const Z1_RIVER_HEXES: AxialCoord[] = [
  { q: -5, r: 3 },
  { q: -4, r: 2 },
  { q: -3, r: 2 },
  { q: -2, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -2 },
  { q: 2, r: -3 },
];

function hexPathD(coord: AxialCoord): string {
  const { x, y } = worldMapAxialToPixel(coord);
  const pts = hexPolygonPoints(x, y);
  return `M ${pts.split(" ").join(" L ")} Z`;
}

function hubHexKeySet(sites: MapArtHubSite[]): Set<string> {
  const keys = new Set<string>();
  for (const site of sites) {
    keys.add(axialKey(site.coord));
  }
  return keys;
}

function riverHexKeySet(): Set<string> {
  const keys = new Set<string>();
  for (const c of Z1_RIVER_HEXES) {
    if (axialDistance(c, MAP_GOV) >= 2) {
      keys.add(axialKey(c));
    }
  }
  return keys;
}

/** Eastern outer hexes for a modest bay — excludes any hub hex. */
function bayHexKeys(
  cells: AxialCoord[],
  hubKeys: Set<string>,
): Set<string> {
  const govPx = worldMapAxialToPixel(MAP_GOV);
  const keys = new Set<string>();
  for (const c of cells) {
    const k = axialKey(c);
    if (hubKeys.has(k)) continue;
    const d = axialDistance(c, MAP_GOV);
    if (d < 5) continue;
    const { x } = worldMapAxialToPixel(c);
    if (c.q >= 5 && x > govPx.x + 60) {
      keys.add(k);
    }
  }
  return keys;
}

function irregularRing(
  cx: number,
  cy: number,
  r: number,
  wobble: number,
): string {
  const parts: string[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const a = (i / 48) * Math.PI * 2;
    const rr =
      r + Math.sin(a * 3.1) * wobble + Math.cos(a * 5.7) * wobble * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    parts.push(
      i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`,
    );
  }
  return `${parts.join(" ")} Z`;
}

function hubGlowPath(cx: number, cy: number, rx: number, ry: number): string {
  return irregularRing(cx, cy, (rx + ry) / 2, (rx - ry) * 0.22);
}

function curvePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  bend = 0.18,
): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const cx = mx + (-dy / len) * len * bend;
  const cy = my + (dx / len) * len * bend;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

function hubClassName(role: MapArtHubRole): string {
  switch (role) {
    case "gov":
      return "map-z1-hub-gov";
    case "major":
      return "map-z1-hub-teal";
    case "tower":
      return "map-z1-hub-teal";
    case "hq":
      return "map-z1-hub-amber";
    case "commercial":
      return "map-z1-hub-commercial";
    case "mini-placeholder":
      return "map-z1-hub-mini";
    default:
      return "map-z1-hub-teal";
  }
}

function hubGradientColors(role: MapArtHubRole): {
  inner: string;
  outer: string;
  r: number;
} {
  switch (role) {
    case "gov":
      return { inner: "#7ec8c0", outer: "#3d6a62", r: 105 };
    case "major":
      return { inner: "#6ec8e8", outer: "#2a6878", r: 62 };
    case "tower":
      return { inner: "#6ec0e0", outer: "#2a5a68", r: 58 };
    case "hq":
      return { inner: "#e8c080", outer: "#6a5838", r: 52 };
    case "commercial":
      return { inner: "#d8c090", outer: "#5a5040", r: 42 };
    case "mini-placeholder":
      return { inner: "#e8d878", outer: "#5a5830", r: 32 };
    default:
      return { inner: "#6ec0e0", outer: "#2a5a68", r: 52 };
  }
}

function hubGradientsForSites(sites: MapArtHubSite[]): Z1HubGradient[] {
  return sites.map((site) => {
    const { x, y } = mapArtHubPixel(site);
    const colors = hubGradientColors(site.role);
    return {
      id: `map-z1-hub-grad-${site.id.replace(/[^a-z0-9-]/gi, "-")}`,
      cx: x,
      cy: y,
      r: colors.r,
      innerColor: colors.inner,
      outerColor: colors.outer,
    };
  });
}

function hubGlowSize(
  role: MapArtHubRole,
  layout: WorldMapLayoutConfig,
): { rx: number; ry: number } {
  const g = layout.hubGlow;
  switch (role) {
    case "gov":
      return g.gov;
    case "major":
      return g.major;
    case "tower":
      return g.tower;
    case "hq":
      return g.hq;
    case "commercial":
      return g.commercial;
    case "mini-placeholder":
      return g.miniPlaceholder;
    default:
      return g.tower;
  }
}

function hubDrawsForSites(
  sites: MapArtHubSite[],
  layout: WorldMapLayoutConfig,
): Z1HubDraw[] {
  return sites.map((site) => {
    const { x, y } = mapArtHubPixel(site);
    const { rx, ry } = hubGlowSize(site.role, layout);
    return {
      siteId: site.id,
      role: site.role,
      d: hubGlowPath(x, y, rx, ry),
      className: hubClassName(site.role),
    };
  });
}

function hubToHubRoads(sites: MapArtHubSite[]): Z1PathDraw[] {
  const govPx = mapArtHubPixel(
    sites.find((s) => s.role === "gov") ?? {
      id: "gov",
      coord: MAP_GOV,
      role: "gov",
      filterGroup: "hubs",
    },
  );
  const roads: Z1PathDraw[] = [];
  for (const site of sites) {
    if (site.role === "gov" || site.role === "mini-placeholder") continue;
    const p = mapArtHubPixel(site);
    roads.push({
      d: curvePath(govPx, p, site.role === "hq" ? 0.24 : 0.14),
      className:
        site.role === "tower" || site.role === "hq"
          ? "map-z1-road-arterial"
          : "map-z1-road-collector",
    });
  }
  return roads;
}

function flavorHexPatches(
  cells: AxialCoord[],
  hubKeys: Set<string>,
  waterKeys: Set<string>,
): Z1PathDraw[] {
  const picks = cells.filter((c) => {
    const k = axialKey(c);
    if (hubKeys.has(k) || waterKeys.has(k)) return false;
    const d = axialDistance(c, MAP_GOV);
    return d >= 3 && d <= 5;
  });
  const paths: Z1PathDraw[] = [];
  for (let i = 0; i < picks.length && paths.length < 5; i += 2) {
    const c = picks[i]!;
    const { x, y } = worldMapAxialToPixel(c);
    paths.push({
      d: irregularRing(x, y, 22, 4),
      className: i % 4 === 0 ? "map-z1-forest" : "map-z1-residential",
    });
  }
  return paths;
}

export function buildWorldMapZ1LayerStack(
  bounds: MapBounds,
  layout: WorldMapLayoutConfig = DEFAULT_WORLD_MAP_LAYOUT,
): Z1LayerStack {
  const { minX, minY, width, height } = bounds;
  const sites = mapArtHubSites(layout);
  const cells = generateHexagonMap(MAP_RADIUS);
  const hubKeys = hubHexKeySet(sites);
  const riverKeys = riverHexKeySet();
  const bayKeys = bayHexKeys(cells, hubKeys);
  const waterKeys = new Set([...riverKeys, ...bayKeys]);

  const govPx = worldMapAxialToPixel(layout.greenbelt.centerAxial);
  const gb = layout.greenbelt;
  const outerGreenbeltR = worldMapOuterGreenbeltRadiusPx();

  const landRect = [
    `M ${minX.toFixed(1)} ${minY.toFixed(1)}`,
    `L ${(minX + width).toFixed(1)} ${minY.toFixed(1)}`,
    `L ${(minX + width).toFixed(1)} ${(minY + height).toFixed(1)}`,
    `L ${minX.toFixed(1)} ${(minY + height).toFixed(1)}`,
    "Z",
  ].join(" ");

  const innerUrbanHexPaths: Z1PathDraw[] = [];
  const waterHexPaths: Z1PathDraw[] = [];
  for (const c of cells) {
    const k = axialKey(c);
    if (waterKeys.has(k)) {
      waterHexPaths.push({ d: hexPathD(c), className: "map-z1-water" });
      continue;
    }
    const d = axialDistance(c, MAP_GOV);
    if (d <= 2 && !hubKeys.has(k)) {
      innerUrbanHexPaths.push({
        d: hexPathD(c),
        className: "map-z1-inner-urban-hex",
      });
    }
  }

  const hubSites = sites.filter((s) => s.filterGroup === "hubs");
  const flavorHubSites = sites.filter((s) => s.filterGroup === "flavor");

  const layers: Z1Layer[] = [
    {
      id: "base-land",
      filterGroup: "base",
      paths: [{ d: landRect, className: "map-z1-land" }],
      hubs: [],
    },
    {
      id: "geography-urban-greenbelt",
      filterGroup: "geography",
      paths: [
        ...innerUrbanHexPaths,
        {
          d: irregularRing(
            govPx.x,
            govPx.y,
            outerGreenbeltR,
            gb.wobble + 4,
          ),
          className: "map-z1-greenbelt",
        },
      ],
      hubs: [],
    },
    {
      id: "geography-water-hexes",
      filterGroup: "geography",
      paths: waterHexPaths,
      hubs: [],
    },
    {
      id: "flavor-patches",
      filterGroup: "flavor",
      paths: flavorHexPatches(cells, hubKeys, waterKeys),
      hubs: hubDrawsForSites(flavorHubSites, layout),
    },
    {
      id: "hubs-glow",
      filterGroup: "hubs",
      paths: [],
      hubs: hubDrawsForSites(hubSites, layout),
    },
    {
      id: "roads-hub-spokes",
      filterGroup: "roads",
      paths: hubToHubRoads(sites),
      hubs: [],
    },
  ];

  return {
    layers,
    govCenter: { x: govPx.x, y: govPx.y },
    landGradientRadius: Math.max(width, height) * 0.58,
    hubGradients: hubGradientsForSites(sites),
  };
}

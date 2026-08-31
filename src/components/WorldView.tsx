import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  REGION_LABELS,
  isAvailableCommercialLot,
  mainOfficeCoordForState,
  mapMainOfficeId,
  officeDisplayName,
  regionAtCoord,
  towerAtCoord,
  worldMapAxialToPixel,
  worldMapHexBounds,
  worldMapHexPathPixels,
} from "../game/mapWorld";
import {
  branchOfficeIds,
  hasBranchOffices,
  isBranchOfficeId,
} from "../game/branchSites";
import {
  clampMapPan,
  clampMapZoomRel,
  applyMapWheelZoom,
  focusViewportOnContentPoint,
  MAP_HQ_FOCUS_ZOOM_REL,
  MAP_ZOOM_REL_DEFAULT,
  MAP_ZOOM_REL_MAX,
  MAP_ZOOM_REL_MIN,
  MAP_ZOOM_REL_STEP,
  measureMapViewport,
  type MapContentSize,
  worldMapCoordToContentPixel,
} from "../game/mapViewport";
import {
  readWorldMapViewportCache,
  writeWorldMapViewportCache,
} from "../game/worldMapViewportCache";
import {
  HEX_RADIUS,
  MAP_GOV,
  axialEquals,
  axialKey,
  generateHexagonMap,
  hexPolygonPoints,
} from "../game/hexLayout";
import {
  hexPath,
  jobSiteCoordsForEngagement,
  pointAlongPolyline,
} from "../game/mapTravel";
import {
  jobSiteCoordForPosting,
} from "../game/mapWorld";
import { jobDefinitionForPosting } from "../game/jobs";
import { hqCoordForState, officeAtForState } from "../multiplayer/playerHq";
import { PLAYER_IDS } from "../multiplayer/types";
import type {
  AxialCoord,
  GameAction,
  GameState,
  JobEngagement,
  MapRegion,
} from "../game/types";
import { MapHexDrawer } from "./MapHexDrawer";

interface WorldViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

type HexVariant =
  | "default"
  | "gov"
  | "hq"
  | "branch"
  | "tower"
  | "commercial"
  | "active";

type LegendHover =
  | { kind: "region"; id: MapRegion }
  | { kind: "landmark"; id: HexVariant | "gov" | "job" }
  | null;

type LandmarkKind = "gov" | "hq" | "branch" | "tower" | "commercial" | "active";

const PLAYER_HIT_RADIUS = HEX_RADIUS * 0.62;
const PAN_DRAG_THRESHOLD = 3;

function coordFromEventTarget(target: EventTarget | null): AxialCoord | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("[data-map-q]");
  if (!el) return null;
  const q = Number(el.getAttribute("data-map-q"));
  const r = Number(el.getAttribute("data-map-r"));
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}
const REGION_ORDER: MapRegion[] = [
  "countryside",
  "rural",
  "suburban",
  "metropolis",
];

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const AXIAL_NEIGHBORS: AxialCoord[] = [
  { q: 1, r: -1 },
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
];

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

function pathCoord(value: number): string {
  return value.toFixed(2);
}

/**
 * Irregular watercolor pool — smooth bezier outline, stays crisp when zoomed.
 */
function watercolorWashPath(
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  samples = 28,
): string {
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const wobble =
      0.76 +
      0.24 * hash01(seed + i * 13) +
      0.1 * Math.sin(t * 1.6 + seed * 0.35) +
      0.06 * Math.cos(t * 2.4 - seed * 0.55);
    const r = radius * wobble;
    const stretch = 0.86 + 0.22 * hash01(seed + i * 5);
    raw.push({
      x: cx + Math.cos(t) * r,
      y: cy + Math.sin(t) * r * stretch,
    });
  }

  const pts = chaikinClosed(raw, 1);
  const n = pts.length;
  let d = `M${pathCoord(pts[0].x)},${pathCoord(pts[0].y)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;
    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;
    d += ` C${pathCoord(cp1x)},${pathCoord(cp1y)} ${pathCoord(cp2x)},${pathCoord(cp2y)} ${pathCoord(p2.x)},${pathCoord(p2.y)}`;
  }
  return `${d} Z`;
}

/** Organic watercolor blob — no straight hex edges. */
type WatercolorWash = {
  id: MapRegion;
  key: string;
  variant: "core" | "a" | "b" | "bleed";
  d: string;
};

type DecoKind =
  | "tree"
  | "cottage"
  | "barn"
  | "crop"
  | "house"
  | "bush"
  | "towerette"
  | "lamp";

type MapDecoration = {
  key: string;
  x: number;
  y: number;
  region: MapRegion;
  kind: DecoKind;
};

/** Pocket “town” layouts — mixed props that sell the region vibe. */
const REGION_POCKET_KITS: Record<MapRegion, DecoKind[]> = {
  countryside: ["cottage", "tree", "tree", "cottage", "tree", "bush"],
  rural: ["barn", "crop", "crop", "tree", "barn", "crop"],
  suburban: ["house", "bush", "house", "bush", "house", "tree"],
  metropolis: ["towerette", "lamp", "towerette", "lamp", "towerette", "bush"],
};

const POCKET_COUNT: Record<MapRegion, number> = {
  countryside: 3,
  rural: 3,
  suburban: 3,
  metropolis: 2,
};

function pickPocketAnchors(
  candidates: AxialCoord[],
  count: number,
  seed: number,
): AxialCoord[] {
  if (candidates.length === 0 || count <= 0) return [];
  const scored = candidates
    .map((coord, index) => ({
      coord,
      score: hash01(seed + coord.q * 19 + coord.r * 41 + index),
    }))
    .sort((a, b) => b.score - a.score);
  const picked: AxialCoord[] = [];
  const minDist = 2.4;
  for (const entry of scored) {
    if (picked.length >= count) break;
    const farEnough = picked.every(
      (other) =>
        Math.hypot(entry.coord.q - other.q, entry.coord.r - other.r) >= minDist,
    );
    if (farEnough) picked.push(entry.coord);
  }
  // Fallback if map is tight.
  for (const entry of scored) {
    if (picked.length >= count) break;
    if (!picked.some((p) => axialEquals(p, entry.coord))) {
      picked.push(entry.coord);
    }
  }
  return picked;
}

function MapDecorationMark({
  x,
  y,
  kind,
}: {
  x: number;
  y: number;
  kind: MapDecoration["kind"];
}) {
  return (
    <g
      className={`map-deco map-deco-${kind}`}
      transform={`translate(${x},${y})`}
      pointerEvents="none"
    >
      {kind === "tree" ? (
        <>
          <rect x={-1.2} y={1} width={2.4} height={5} rx={0.6} className="map-deco-trunk" />
          <circle cx={0} cy={-1} r={5.2} className="map-deco-leaf" />
          <circle cx={-2.5} cy={1} r={3.4} className="map-deco-leaf" />
          <circle cx={2.6} cy={1.2} r={3.2} className="map-deco-leaf" />
        </>
      ) : null}
      {kind === "cottage" ? (
        <>
          <rect x={-5} y={-1} width={10} height={7} rx={1} className="map-deco-wall" />
          <path d="M-6.2 -1 L0 -7 L6.2 -1 Z" className="map-deco-roof" />
          <rect x={-1.4} y={2} width={2.8} height={4} className="map-deco-door" />
        </>
      ) : null}
      {kind === "barn" ? (
        <>
          <rect x={-7} y={-2} width={14} height={9} rx={1.2} className="map-deco-barn" />
          <path d="M-8 -2 L0 -8 L8 -2 Z" className="map-deco-roof" />
        </>
      ) : null}
      {kind === "crop" ? (
        <>
          <path d="M-6 4 Q-3 -2 0 4 Q3 -2 6 4" className="map-deco-crop" />
          <path d="M-4 5 Q-1 0 2 5 Q4 1 6 5" className="map-deco-crop" />
        </>
      ) : null}
      {kind === "house" ? (
        <>
          <rect x={-4.5} y={-1} width={9} height={7} rx={0.8} className="map-deco-wall" />
          <path d="M-5.5 -1 L0 -6.5 L5.5 -1 Z" className="map-deco-roof-sub" />
          <rect x={-2.8} y={1} width={2.2} height={2} className="map-deco-window" />
          <rect x={1} y={2.2} width={2} height={3.8} className="map-deco-door" />
        </>
      ) : null}
      {kind === "bush" ? (
        <>
          <circle cx={-2} cy={1} r={3.2} className="map-deco-bush" />
          <circle cx={2} cy={1.2} r={3.4} className="map-deco-bush" />
          <circle cx={0} cy={-1} r={2.8} className="map-deco-bush" />
        </>
      ) : null}
      {kind === "towerette" ? (
        <>
          <rect x={-3} y={-8} width={6} height={14} rx={0.8} className="map-deco-highrise" />
          <rect x={-2} y={-6} width={1.6} height={1.6} className="map-deco-window" />
          <rect x={0.4} y={-6} width={1.6} height={1.6} className="map-deco-window" />
          <rect x={-2} y={-2.5} width={1.6} height={1.6} className="map-deco-window" />
          <rect x={0.4} y={-2.5} width={1.6} height={1.6} className="map-deco-window" />
        </>
      ) : null}
      {kind === "lamp" ? (
        <>
          <rect x={-0.8} y={-2} width={1.6} height={8} className="map-deco-pole" />
          <circle cx={0} cy={-4} r={2.4} className="map-deco-lamp" />
        </>
      ) : null}
    </g>
  );
}

function hexVariant(coord: AxialCoord, state: GameState): HexVariant {
  if (axialEquals(coord, MAP_GOV)) return "gov";
  const officeId = officeAtForState(coord, state);
  if (officeId === "hq") return "hq";
  if (officeId && isBranchOfficeId(officeId)) return "branch";
  if (towerAtCoord(coord)) return "tower";
  if (isAvailableCommercialLot(coord, state)) return "commercial";
  if (state.jobEngagements.some((e) => e.phase === "working")) {
    const workingTower = state.jobEngagements.find(
      (e) => e.phase === "working",
    )?.towerId;
    if (workingTower && towerAtCoord(coord) === workingTower) {
      return "active";
    }
  }
  return "default";
}

function regionClass(coord: AxialCoord): string {
  return `hex-region-${regionAtCoord(coord)}`;
}

function travelProgress(engagement: JobEngagement, now: number): number {
  const start = engagement.travelStartedAt;
  const end = engagement.travelArrivesAt;
  if (start == null || end == null || end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

function landmarkKindFor(
  coord: AxialCoord,
  variant: HexVariant,
): LandmarkKind | null {
  if (variant === "default") return null;
  if (axialEquals(coord, MAP_GOV) || variant === "gov") return "gov";
  if (variant === "hq") return "hq";
  if (variant === "branch") return "branch";
  if (variant === "commercial") return "commercial";
  if (variant === "active") return "active";
  return "tower";
}

function matchesLegendHover(
  hover: LegendHover,
  region: MapRegion,
  landmark: LandmarkKind | null,
  isWorkingSite: boolean,
): boolean {
  if (!hover) return false;
  if (hover.kind === "region") return region === hover.id;
  if (hover.id === "job") return isWorkingSite || landmark === "active";
  if (hover.id === "tower") return landmark === "tower" || landmark === "active";
  return landmark === hover.id;
}

function LandmarkMarker({
  x,
  y,
  variant,
  highlighted,
  dimmed,
  flashing,
}: {
  x: number;
  y: number;
  variant: LandmarkKind;
  highlighted: boolean;
  dimmed: boolean;
  flashing?: boolean;
}) {
  const kind = variant;
  const wrapClass = [
    "map-city-marker-wrap",
    highlighted ? "is-legend-hot" : "",
    dimmed ? "is-legend-dim" : "",
    flashing ? "is-hq-flash" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (kind === "commercial") {
    return (
      <g transform={`translate(${x},${y})`} pointerEvents="none" className={wrapClass}>
        <g className={`map-city-marker map-city-marker-${kind}`}>
          <rect
            x={-9}
            y={-7}
            width={18}
            height={14}
            rx={2.5}
            className="map-city-marker-pad"
          />
          <path
            d="M-6 4 V-2 H-2 V4 M2 4 V-4 H6 V4"
            className="map-city-marker-glyph"
          />
        </g>
      </g>
    );
  }

  const h = kind === "gov" ? 20 : kind === "hq" ? 18 : 15;
  const w = kind === "gov" ? 14 : 11;
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none" className={wrapClass}>
      <g className={`map-city-marker map-city-marker-${kind}`}>
        <ellipse
          cx={0}
          cy={h * 0.42}
          rx={w * 0.7}
          ry={3.2}
          className="map-city-marker-shadow"
        />
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={1.8}
          className="map-city-marker-body"
        />
        <rect
          x={-w / 2 + 2}
          y={-h / 2 + 3}
          width={w - 4}
          height={3.2}
          rx={0.6}
          className="map-city-marker-window"
        />
        <rect
          x={-w / 2 + 2}
          y={-h / 2 + 8}
          width={w - 4}
          height={3.2}
          rx={0.6}
          className="map-city-marker-window"
        />
        {kind === "gov" || kind === "hq" ? (
          <path
            d={`M0 ${-h / 2 - 5} L3 ${-h / 2} L-3 ${-h / 2} Z`}
            className="map-city-marker-roof"
          />
        ) : null}
      </g>
    </g>
  );
}

function RunningIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="map-task-icon map-task-icon-running" transform={`translate(${x},${y})`}>
      <circle r={9} className="map-task-icon-disc" />
      <g transform="translate(0,1)">
        <circle cx={0} cy={-4.5} r={1.6} fill="currentColor" />
        <path
          d="M0 -2.5 L0 1 M0 -1 L-3 0.5 M0 -1 L3 -0.2 M0 1 L-2.5 5 M0 1 L2.8 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function WorkingIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="map-task-icon map-task-icon-working" transform={`translate(${x},${y})`}>
      <circle r={9} className="map-task-icon-disc" />
      <g transform="translate(0,0.5)">
        <circle cx={0} cy={-4} r={1.6} fill="currentColor" />
        <path
          d="M0 -2.2 L0 1.5 M0 -0.5 L-2.5 1 M0 -0.5 L2.5 1 M0 1.5 L-1.8 5 M0 1.5 L1.8 5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
        />
        <path
          d="M3.2 -3.2 L5.2 -5.2 M4.8 -2.6 L5.6 -2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

const LANDMARK_LEGEND: {
  id: "gov" | "hq" | "branch" | "tower" | "commercial" | "job";
  label: string;
  className: string;
}[] = [
  { id: "gov", label: "Gov", className: "landmark-legend-gov" },
  { id: "hq", label: "HQ", className: "landmark-legend-hq" },
  { id: "branch", label: "Branch", className: "landmark-legend-branch" },
  { id: "tower", label: "Office tower", className: "landmark-legend-tower" },
  { id: "commercial", label: "Commercial lot", className: "landmark-legend-lot" },
  { id: "job", label: "Task force", className: "landmark-legend-job" },
];

export function WorldView({ state, dispatch }: WorldViewProps) {
  const savedViewport = readWorldMapViewportCache();
  const restoreViewport = savedViewport.hasSession;
  const cells = useMemo(() => generateHexagonMap(), []);
  const bounds = useMemo(() => worldMapHexBounds(cells), [cells]);
  const { watercolorWashes, decorations } = useMemo(() => {
    const washes: WatercolorWash[] = [];
    const cellsByKey = new Map(cells.map((coord) => [axialKey(coord), coord]));
    const freeByRegion: Record<MapRegion, AxialCoord[]> = {
      metropolis: [],
      suburban: [],
      rural: [],
      countryside: [],
    };

    cells.forEach((coord, index) => {
      const region = regionAtCoord(coord);
      const { x, y } = worldMapAxialToPixel(coord);
      const cellSeed = coord.q * 31 + coord.r * 17 + 9;
      const coordKey = axialKey(coord);

      const coreSeed = cellSeed + index;
      washes.push({
        id: region,
        key: `core-${coordKey}`,
        variant: "core",
        d: watercolorWashPath(
          x + (hash01(coreSeed + 2) - 0.5) * HEX_RADIUS * 0.14,
          y + (hash01(coreSeed + 4) - 0.5) * HEX_RADIUS * 0.14,
          HEX_RADIUS * (1.92 + 0.18 * hash01(coreSeed + 8)),
          coreSeed,
        ),
      });

      for (let w = 0; w < 2; w += 1) {
        const washSeed = cellSeed + index + w * 991;
        washes.push({
          id: region,
          key: `wash-${coordKey}-${w}`,
          variant: w === 0 ? "a" : "b",
          d: watercolorWashPath(
            x + (hash01(washSeed + 2) - 0.5) * HEX_RADIUS * 0.38,
            y + (hash01(washSeed + 4) - 0.5) * HEX_RADIUS * 0.38,
            HEX_RADIUS * (1.52 + 0.28 * hash01(washSeed + 8)),
            washSeed,
          ),
        });
      }

      for (let edge = 0; edge < AXIAL_NEIGHBORS.length; edge += 1) {
        const offset = AXIAL_NEIGHBORS[edge];
        const neighborCoord = {
          q: coord.q + offset.q,
          r: coord.r + offset.r,
        };
        const neighborKey = axialKey(neighborCoord);
        if (!cellsByKey.has(neighborKey)) continue;
        if (regionAtCoord(neighborCoord) === region) continue;

        const neighborPixel = worldMapAxialToPixel(neighborCoord);
        const bleedSeed = cellSeed + edge * 137 + index;
        const bleedT = 0.5 + 0.12 * hash01(bleedSeed + 3);
        washes.push({
          id: region,
          key: `bleed-${coordKey}-${edge}`,
          variant: "bleed",
          d: watercolorWashPath(
            x + (neighborPixel.x - x) * bleedT,
            y + (neighborPixel.y - y) * bleedT,
            HEX_RADIUS * (1.22 + 0.2 * hash01(bleedSeed + 8)),
            bleedSeed,
          ),
        });
      }

      const occupied =
        axialEquals(coord, MAP_GOV) ||
        Boolean(towerAtCoord(coord)) ||
        Boolean(officeAtForState(coord, state)) ||
        isAvailableCommercialLot(coord, state);
      if (!occupied) freeByRegion[region].push(coord);
    });

    const decos: MapDecoration[] = [];
    for (const region of REGION_ORDER) {
      const anchors = pickPocketAnchors(
        freeByRegion[region],
        POCKET_COUNT[region],
        120 + REGION_ORDER.indexOf(region) * 47,
      );
      const kit = REGION_POCKET_KITS[region];
      anchors.forEach((anchor, pocketIndex) => {
        const center = worldMapAxialToPixel(anchor);
        const propCount = 4 + Math.floor(hash01(anchor.q * 13 + anchor.r * 7 + 3) * 3);
        for (let i = 0; i < propCount; i += 1) {
          const seed = anchor.q * 53 + anchor.r * 29 + pocketIndex * 11 + i * 17;
          const angle = hash01(seed) * Math.PI * 2;
          const dist =
            HEX_RADIUS * (0.2 + 0.85 * hash01(seed + 5) * (i === 0 ? 0.15 : 1));
          const kind = kit[Math.floor(hash01(seed + 9) * kit.length)];
          decos.push({
            key: `deco-${region}-${pocketIndex}-${i}`,
            x: center.x + Math.cos(angle) * dist,
            y: center.y + Math.sin(angle) * dist,
            region,
            kind,
          });
        }
      });
    }

    washes.sort(
      (a, b) => REGION_ORDER.indexOf(a.id) - REGION_ORDER.indexOf(b.id),
    );
    return {
      watercolorWashes: washes,
      decorations: decos,
    };
  }, [cells, state]);
  const [inspectedCoord, setInspectedCoord] = useState<AxialCoord | null>(
    restoreViewport ? savedViewport.inspectedCoord : null,
  );
  const [legendOpen, setLegendOpen] = useState(
    restoreViewport ? savedViewport.legendOpen : false,
  );
  const [legendHover, setLegendHover] = useState<LegendHover>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const [mapZoomRel, setMapZoomRel] = useState(
    restoreViewport ? savedViewport.mapZoomRel : MAP_ZOOM_REL_DEFAULT,
  );
  const [mapContentSize, setMapContentSize] = useState<MapContentSize>({
    width: 1,
    height: 1,
  });
  const [mapPan, setMapPan] = useState(
    restoreViewport ? savedViewport.mapPan : { x: 0, y: 0 },
  );
  const [isPanning, setIsPanning] = useState(false);
  const [hqFlashSeq, setHqFlashSeq] = useState(0);
  const [hqFlashActive, setHqFlashActive] = useState(false);
  const mapViewportRef = useRef<HTMLDivElement>(null);
  const mapSvgRef = useRef<SVGSVGElement>(null);
  const mapContentSizeRef = useRef(mapContentSize);
  const mapZoomRelRef = useRef(mapZoomRel);
  const mapPanRef = useRef(mapPan);
  const fitZoomRef = useRef(fitZoom);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    hitCoord: AxialCoord | null;
  } | null>(null);
  const now = Date.now();
  const isDev = state.settings.mapPresentation === "dev";
  const mapZoom = fitZoom * mapZoomRel;
  const legendActive = legendHover !== null;
  const playerHqCoord = useMemo(() => hqCoordForState(state), [state]);
  const mainOfficeId = mapMainOfficeId(state);
  const mainOfficeLocationId =
    mainOfficeId === "branch"
      ? (branchOfficeIds(state)[0] ?? "hq")
      : "hq";
  const mainOfficeCoord = useMemo(
    () => mainOfficeCoordForState(state),
    [state, playerHqCoord, state.branchSites, state.settings.mapMainOffice],
  );

  function viewportSize(): { width: number; height: number } {
    const el = mapViewportRef.current;
    if (!el) return { width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  const measureFitZoom = useCallback(() => {
    requestAnimationFrame(() => {
      const viewport = mapViewportRef.current;
      if (!viewport) return;
      const vpW = viewport.clientWidth;
      const vpH = viewport.clientHeight;
      if (vpW < 8 || vpH < 8 || bounds.width <= 0) return;

      const measured = measureMapViewport(vpW, vpH, bounds);
      mapContentSizeRef.current = measured.content;
      setMapContentSize(measured.content);
      setFitZoom(measured.fitZoom);
      setMapPan((pan) =>
        clampMapPan(
          pan,
          measured.fitZoom * mapZoomRelRef.current,
          vpW,
          vpH,
          measured.content,
        ),
      );
    });
  }, [bounds.height, bounds.minX, bounds.minY, bounds.width]);

  function setPanClamped(
    next: { x: number; y: number },
    zoom = mapZoom,
    content: MapContentSize = mapContentSizeRef.current,
  ) {
    const { width, height } = viewportSize();
    setMapPan(clampMapPan(next, zoom, width, height, content));
  }

  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const content = mapContentSizeRef.current;
      if (content.width <= 1 || content.height <= 1) return;

      const next = applyMapWheelZoom({
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        viewportX: event.clientX - rect.left,
        viewportY: event.clientY - rect.top,
        viewportW: rect.width,
        viewportH: rect.height,
        fitZoom: fitZoomRef.current,
        zoomRel: mapZoomRelRef.current,
        pan: mapPanRef.current,
        content,
      });
      setMapZoomRel(next.zoomRel);
      setMapPan(next.pan);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => measureFitZoom());
    ro.observe(viewport);
    measureFitZoom();
    return () => ro.disconnect();
  }, [measureFitZoom, isDev]);

  useEffect(() => {
    measureFitZoom();
  }, [measureFitZoom, bounds.width, bounds.height, cells.length]);

  useEffect(() => {
    mapContentSizeRef.current = mapContentSize;
  }, [mapContentSize]);

  useEffect(() => {
    mapZoomRelRef.current = mapZoomRel;
  }, [mapZoomRel]);

  useEffect(() => {
    mapPanRef.current = mapPan;
  }, [mapPan]);

  useEffect(() => {
    fitZoomRef.current = fitZoom;
  }, [fitZoom]);

  useEffect(() => {
    writeWorldMapViewportCache({
      mapZoomRel,
      mapPan,
      inspectedCoord,
      legendOpen,
    });
  }, [mapZoomRel, mapPan, inspectedCoord, legendOpen]);

  useEffect(() => {
    if (!hqFlashActive) return;
    const timer = window.setTimeout(() => setHqFlashActive(false), 2200);
    return () => window.clearTimeout(timer);
  }, [hqFlashActive, hqFlashSeq]);

  useEffect(() => {
    if (mapContentSize.width <= 1 || mapContentSize.height <= 1) return;
    const { width, height } = viewportSize();
    if (width <= 0 || height <= 0) return;
    setMapPan((pan) =>
      clampMapPan(pan, mapZoom, width, height, mapContentSizeRef.current),
    );
  }, [mapZoom, fitZoom, mapZoomRel, mapContentSize.width, mapContentSize.height]);

  function resetMapView() {
    setMapZoomRel(MAP_ZOOM_REL_DEFAULT);
    setMapPan({ x: 0, y: 0 });
  }

  function focusOnMainOffice() {
    const { width: vpW, height: vpH } = viewportSize();
    if (vpW <= 0 || vpH <= 0 || bounds.width <= 0) return;

    const content = mapContentSizeRef.current;
    if (content.width <= 0 || content.height <= 0) return;

    const officePoint = worldMapCoordToContentPixel(
      mainOfficeCoord,
      bounds,
      content,
    );
    const focused = focusViewportOnContentPoint(
      officePoint,
      content,
      vpW,
      vpH,
      fitZoom,
      MAP_HQ_FOCUS_ZOOM_REL,
    );

    setMapZoomRel(focused.zoomRel);
    setMapPan(focused.pan);
    setHqFlashActive(true);
    setHqFlashSeq((seq) => seq + 1);
  }

  function closeDrawer() {
    setInspectedCoord(null);
    dispatch({ type: "SELECT_TOWER", towerId: null });
    dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
  }

  function inspectHex(coord: AxialCoord) {
    setInspectedCoord({ ...coord });

    const officeId = officeAtForState(coord, state);
    const towerId = towerAtCoord(coord);

    if (officeId) {
      dispatch({ type: "SELECT_OFFICE", officeId });
      dispatch({ type: "SELECT_TOWER", towerId: null });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    } else if (towerId) {
      dispatch({ type: "SELECT_TOWER", towerId });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    } else if (isAvailableCommercialLot(coord, state)) {
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: { ...coord } });
      dispatch({ type: "SELECT_TOWER", towerId: null });
    } else {
      dispatch({ type: "SELECT_TOWER", towerId: null });
      dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
    }
  }

  function onMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // Stop browser SVG/image drag ghosts (common when grabbing map corners).
    event.preventDefault();
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
      moved: false,
      hitCoord: coordFromEventTarget(event.target),
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < PAN_DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      setIsPanning(true);
    }
    setPanClamped({ x: drag.originX + dx, y: drag.originY + dy });
  }

  function onMapPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldInspect = !drag.moved && drag.hitCoord;
    const hitCoord = drag.hitCoord;
    panDragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
    }
    if (shouldInspect && hitCoord) {
      inspectHex(hitCoord);
    }
  }

  function onMapDragStart(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  const activeEngagements = state.jobEngagements.filter(
    (e) =>
      e.phase === "outbound" ||
      e.phase === "working" ||
      e.phase === "returning",
  );
  const workingSiteCoords = useMemo(() => {
    const seen = new Set<string>();
    const coords: AxialCoord[] = [];
    for (const engagement of activeEngagements) {
      if (engagement.phase !== "working") continue;
      const posting = state.jobPostings.find(
        (entry) => entry.id === engagement.postingId,
      );
      if (!posting) continue;
      const def = jobDefinitionForPosting(posting);
      const site = jobSiteCoordForPosting(posting, def);
      const key = axialKey(site);
      if (seen.has(key)) continue;
      seen.add(key);
      coords.push(site);
    }
    return coords;
  }, [activeEngagements, state.jobPostings]);

  const peerMarkers = useMemo(() => {
    if (state.onlineSession?.playMode !== "online") return [];
    const selfId = state.onlineSession.playerId;
    return PLAYER_IDS.filter((id) => id !== selfId)
      .map((id) => state.companyPresence?.[id])
      .filter((presence) => Boolean(presence))
      .flatMap((presence) => {
        const items: { coord: AxialCoord; label: string; key: string }[] = [
          {
            coord: presence!.hqCoord,
            label: `${presence!.displayName} HQ`,
            key: `${presence!.playerId}-hq`,
          },
        ];
        if (presence!.branchSites?.length) {
          for (const [index, branch] of presence!.branchSites.entries()) {
            items.push({
              coord: branch.coord,
              label: branch.name ?? `${presence!.displayName} branch`,
              key: `${presence!.playerId}-branch-${index}`,
            });
          }
        }
        return items;
      });
  }, [state.companyPresence, state.onlineSession]);

  return (
    <div
      className={`world-view map-presentation-${isDev ? "dev" : "player"} map-ground-hybrid${
        legendActive ? " map-legend-hovering" : ""
      }`}
    >
      <div className="world-header">
        <div className="world-header-top">
          <h2>World map</h2>
          <div className="world-map-controls world-map-controls-compact" role="group" aria-label="Map view mode">
            <label className="world-map-main-office-field">
              <span className="sr-only">Distance from</span>
              <select
                className="world-map-main-office"
                value={mainOfficeId}
                aria-label="Distance from office"
                onChange={(e) =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    settings: {
                      mapMainOffice: e.target.value as "hq" | "branch",
                    },
                  })
                }
              >
                <option value="hq">{officeDisplayName(state, "hq")}</option>
                {hasBranchOffices(state) ? (
                  <option value="branch">
                    {officeDisplayName(state, branchOfficeIds(state)[0]!)}
                  </option>
                ) : null}
              </select>
            </label>
            <button
              type="button"
              className={`tab${!isDev ? " active" : ""}`}
              aria-pressed={!isDev}
              onClick={() =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  settings: {
                    mapPresentation: "player",
                    mapPlayerGround: "hybrid",
                  },
                })
              }
            >
              Player&apos;s view
            </button>
            <button
              type="button"
              className={`tab${isDev ? " active" : ""}`}
              aria-pressed={isDev}
              onClick={() =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  settings: { mapPresentation: "dev" },
                })
              }
            >
              Developer view
            </button>
          </div>
        </div>
      </div>

      <div className="world-map-stage">
        <aside
          className={`map-legend-panel${legendOpen ? " is-open" : ""}`}
          aria-label="Map legend"
        >
          <button
            type="button"
            className="map-legend-toggle"
            aria-expanded={legendOpen}
            onClick={() => setLegendOpen((open) => !open)}
          >
            <span>Legend</span>
            <span className="map-legend-toggle-caret" aria-hidden>
              {legendOpen ? "▾" : "▸"}
            </span>
          </button>
          {legendOpen ? (
            <div className="map-legend-body">
              <ul className="region-legend" aria-label="Map regions">
                {(
                  Object.entries(REGION_LABELS) as [MapRegion, string][]
                ).map(([id, label]) => (
                  <li
                    key={id}
                    className={`region-legend-${id}${
                      legendHover?.kind === "region" && legendHover.id === id
                        ? " is-legend-hot"
                        : ""
                    }`}
                    onMouseEnter={() => setLegendHover({ kind: "region", id })}
                    onMouseLeave={() => setLegendHover(null)}
                    onFocus={() => setLegendHover({ kind: "region", id })}
                    onBlur={() => setLegendHover(null)}
                    tabIndex={0}
                  >
                    {label}
                  </li>
                ))}
              </ul>
              <ul className="map-landmark-legend" aria-label="Landmarks">
                {LANDMARK_LEGEND.map((item) => (
                  <li
                    key={item.id}
                    className={`${item.className}${
                      legendHover?.kind === "landmark" &&
                      legendHover.id === item.id
                        ? " is-legend-hot"
                        : ""
                    }`}
                    onMouseEnter={() =>
                      setLegendHover({ kind: "landmark", id: item.id })
                    }
                    onMouseLeave={() => setLegendHover(null)}
                    onFocus={() =>
                      setLegendHover({ kind: "landmark", id: item.id })
                    }
                    onBlur={() => setLegendHover(null)}
                    tabIndex={0}
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <button
          type="button"
          className="map-hq-btn"
          aria-label={`Center map on ${officeDisplayName(state, mainOfficeLocationId)} at 100% zoom`}
          onClick={focusOnMainOffice}
        >
          {mainOfficeId === "branch"
            ? officeDisplayName(state, mainOfficeLocationId)
            : "HQ"}
        </button>

        <div className="map-zoom-controls" role="group" aria-label="Map zoom">
          <button
            type="button"
            className="map-zoom-btn"
            aria-label="Zoom out"
            disabled={mapZoomRel <= MAP_ZOOM_REL_MIN}
            onClick={() => setMapZoomRel((z) => clampMapZoomRel(z - MAP_ZOOM_REL_STEP))}
          >
            −
          </button>
          <button
            type="button"
            className="map-zoom-btn map-zoom-reset"
            aria-label="Reset zoom and pan"
            onClick={resetMapView}
          >
            {Math.round(mapZoomRel * 100)}%
          </button>
          <button
            type="button"
            className="map-zoom-btn"
            aria-label="Zoom in"
            disabled={mapZoomRel >= MAP_ZOOM_REL_MAX}
            onClick={() => setMapZoomRel((z) => clampMapZoomRel(z + MAP_ZOOM_REL_STEP))}
          >
            +
          </button>
        </div>

        <div
          className={`hex-map map-zoom-viewport${isPanning ? " is-panning" : ""}`}
          ref={mapViewportRef}
          onPointerDown={onMapPointerDown}
          onPointerMove={onMapPointerMove}
          onPointerUp={onMapPointerUp}
          onPointerCancel={onMapPointerUp}
          onDragStart={onMapDragStart}
        >
          <div className="map-zoom-scaler" draggable={false}>
            <div
              className="map-zoom-pan-layer"
              style={{
                transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0)`,
              }}
            >
              <div
                className="map-zoom-scale-layer"
                style={{
                  transform: `scale(${mapZoom})`,
                  width: mapContentSize.width,
                  height: mapContentSize.height,
                }}
              >
            <svg
              ref={mapSvgRef}
              viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              shapeRendering="geometricPrecision"
              role="img"
              aria-label="World map"
            >
              <defs>
                {/* Light edge softening only — heavy blur/displace on the whole layer rasterizes low-res when zooming. */}
                <filter
                  id="map-watercolor-soft"
                  filterUnits="objectBoundingBox"
                  x="-12%"
                  y="-12%"
                  width="124%"
                  height="124%"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur stdDeviation="1.35" edgeMode="none" />
                </filter>
                <filter
                  id="map-watercolor-grain"
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  colorInterpolationFilters="sRGB"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.72"
                    numOctaves="3"
                    seed="8"
                    result="grain"
                  />
                  <feColorMatrix
                    in="grain"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.045 0"
                    result="grainAlpha"
                  />
                  <feBlend in="SourceGraphic" in2="grainAlpha" mode="multiply" />
                </filter>
                <radialGradient id="map-watercolor-undercoat" cx="48%" cy="42%" r="78%">
                  <stop offset="0%" stopColor="#6e9874" />
                  <stop offset="55%" stopColor="#628a68" />
                  <stop offset="100%" stopColor="#567a5c" />
                </radialGradient>
                <radialGradient id="map-city-ground" cx="46%" cy="40%" r="74%">
                  <stop offset="0%" stopColor="#3a4d63" />
                  <stop offset="55%" stopColor="#314456" />
                  <stop offset="100%" stopColor="#2a3a4c" />
                </radialGradient>
                <pattern
                  id="map-street-grid"
                  width="36"
                  height="36"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M36 0 H0 V36"
                    fill="none"
                    stroke="rgba(150, 170, 195, 0.14)"
                    strokeWidth="1"
                  />
                  <path
                    d="M18 0 V36 M0 18 H36"
                    fill="none"
                    stroke="rgba(120, 145, 170, 0.07)"
                    strokeWidth="0.8"
                  />
                </pattern>
              </defs>

              {!isDev ? (
                <>
                  <rect
                    className="map-city-ground"
                    x={bounds.minX}
                    y={bounds.minY}
                    width={bounds.width}
                    height={bounds.height}
                    fill="url(#map-city-ground)"
                  />
                  <rect
                    className="map-street-grid-layer"
                    x={bounds.minX}
                    y={bounds.minY}
                    width={bounds.width}
                    height={bounds.height}
                    fill="url(#map-street-grid)"
                    pointerEvents="none"
                  />
                  <rect
                    className="map-region-undercoat"
                    x={bounds.minX}
                    y={bounds.minY}
                    width={bounds.width}
                    height={bounds.height}
                    fill="url(#map-watercolor-undercoat)"
                    filter="url(#map-watercolor-grain)"
                    pointerEvents="none"
                  />
                  {REGION_ORDER.map((region) => (
                    <g
                      key={`region-layer-${region}`}
                      className={`map-region-layer map-region-layer-${region}`}
                      pointerEvents="none"
                    >
                      {watercolorWashes
                        .filter((wash) => wash.id === region)
                        .map((wash) => {
                          const regionHot =
                            legendHover?.kind === "region" &&
                            legendHover.id === wash.id;
                          const softEdge =
                            wash.variant === "core" || wash.variant === "bleed";
                          return (
                            <path
                              key={wash.key}
                              d={wash.d}
                              filter={
                                softEdge
                                  ? "url(#map-watercolor-soft)"
                                  : undefined
                              }
                              className={[
                                "map-region-wash",
                                `map-region-wash-${wash.id}`,
                                `map-region-wash-${wash.id}-${wash.variant}`,
                                regionHot ? "is-legend-hot" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            />
                          );
                        })}
                    </g>
                  ))}
                  <g className="map-decorations" pointerEvents="none">
                    {decorations.map((deco) => {
                      const regionHot =
                        legendHover?.kind === "region" &&
                        legendHover.id === deco.region;
                      return (
                        <g
                          key={deco.key}
                          className={[
                            regionHot ? "is-legend-hot" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          <MapDecorationMark
                            x={deco.x}
                            y={deco.y}
                            kind={deco.kind}
                          />
                        </g>
                      );
                    })}
                  </g>
                </>
              ) : null}

              {cells.map((coord) => {
                const { x, y } = worldMapAxialToPixel(coord);
                const variant = hexVariant(coord, state);
                const isDefault = variant === "default";
                const officeId = officeAtForState(coord, state);
                const isInspected =
                  inspectedCoord !== null && axialEquals(coord, inspectedCoord);
                const isPlayerMainOffice =
                  officeId === mainOfficeId &&
                  axialEquals(coord, mainOfficeCoord);
                const hqFlashing = isPlayerMainOffice && hqFlashActive;
                const landmark = landmarkKindFor(coord, variant);
                const isLandmark = landmark !== null;
                const region = regionAtCoord(coord);
                const isWorkingSite = workingSiteCoords.some((site) =>
                  axialEquals(coord, site),
                );
                const hot = matchesLegendHover(
                  legendHover,
                  region,
                  landmark,
                  isWorkingSite,
                );
                const siteHot = hot && (isDev || isLandmark);
                const siteDim = legendActive && !hot && (isDev || isLandmark);

                return (
                  <g
                    key={axialKey(coord)}
                    className={[
                      "hex-cell",
                      siteHot ? "is-legend-hot" : "",
                      siteDim ? "is-legend-dim" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isDev ? (
                      <polygon
                        points={hexPolygonPoints(x, y)}
                        data-map-q={coord.q}
                        data-map-r={coord.r}
                        className={[
                          "hex-tile",
                          isDefault ? regionClass(coord) : "",
                          `hex-tile-${variant}`,
                          officeId ? "hex-tile-office" : "",
                          isInspected ? "hex-tile-inspected" : "",
                          hot ? "is-legend-hot" : "",
                          legendActive && !hot ? "is-legend-dim" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ cursor: "pointer" }}
                      />
                    ) : (
                      <>
                        <circle
                          cx={x}
                          cy={y}
                          r={PLAYER_HIT_RADIUS}
                          data-map-q={coord.q}
                          data-map-r={coord.r}
                          className={[
                            "map-player-node",
                            isLandmark
                              ? `map-player-node-${landmark}`
                              : "map-player-node-empty",
                            isInspected ? "map-player-node-inspected" : "",
                            hqFlashing ? "map-player-node-hq-flash" : "",
                            siteHot ? "is-legend-hot" : "",
                            siteDim ? "is-legend-dim" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          style={{ cursor: "pointer" }}
                        />
                        {isLandmark && landmark ? (
                          <LandmarkMarker
                            x={x}
                            y={y}
                            variant={landmark}
                            highlighted={siteHot || hqFlashing}
                            dimmed={siteDim && !hqFlashing}
                            flashing={hqFlashing}
                          />
                        ) : null}
                        {hqFlashing ? (
                          <circle
                            key={`hq-flash-${hqFlashSeq}`}
                            cx={x}
                            cy={y}
                            r={HEX_RADIUS * 0.92}
                            className="map-hq-focus-ring"
                            pointerEvents="none"
                          />
                        ) : null}
                        {/* Hit target above marker art so clicks always reach towers. */}
                        {isLandmark ? (
                          <circle
                            cx={x}
                            cy={y}
                            r={PLAYER_HIT_RADIUS * 1.2}
                            data-map-q={coord.q}
                            data-map-r={coord.r}
                            className="map-player-node-hit"
                            style={{ cursor: "pointer" }}
                          />
                        ) : null}
                      </>
                    )}
                  </g>
                );
              })}

              {peerMarkers.map((marker) => {
                const { x, y } = worldMapAxialToPixel(marker.coord);
                return (
                  <g key={marker.key} className="map-peer-marker">
                    <circle
                      cx={x}
                      cy={y}
                      r={PLAYER_HIT_RADIUS * 0.82}
                      className="map-peer-node"
                    />
                  </g>
                );
              })}

              <g className="map-task-layer" pointerEvents="none">
                {activeEngagements.map((engagement) => {
                  const { from, to } = jobSiteCoordsForEngagement(
                    state,
                    engagement,
                  );
                  const origin = engagement.phase === "returning" ? to : from;
                  const dest = engagement.phase === "returning" ? from : to;
                  const pathCoords = isDev
                    ? hexPath(origin, dest)
                    : [origin, dest];
                  const pixels = worldMapHexPathPixels(pathCoords);
                  const pointsAttr = pixels
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ");
                  const jobHot =
                    legendHover?.kind === "landmark" && legendHover.id === "job";
                  const jobDim =
                    legendActive &&
                    !(
                      legendHover?.kind === "landmark" &&
                      legendHover.id === "job"
                    );
                  const isTraveling =
                    engagement.phase === "outbound" ||
                    engagement.phase === "returning";
                  const pos = isTraveling
                    ? pointAlongPolyline(
                        pixels,
                        travelProgress(engagement, now),
                      )
                    : null;
                  return (
                    <g
                      key={engagement.id}
                      className={[
                        jobHot ? "is-legend-hot" : "",
                        jobDim ? "is-legend-dim" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <polyline
                        points={pointsAttr}
                        className={`map-travel-path${
                          isDev
                            ? " map-travel-path-hex"
                            : " map-travel-path-straight"
                        }${
                          engagement.phase === "working"
                            ? " map-travel-path-working"
                            : ""
                        }`}
                        fill="none"
                      />
                      {pos ? <RunningIcon x={pos.x} y={pos.y} /> : null}
                    </g>
                  );
                })}
                {workingSiteCoords.map((siteCoord) => {
                  const key = axialKey(siteCoord);
                  const { x, y } = worldMapAxialToPixel(siteCoord);
                  const jobHot =
                    legendHover?.kind === "landmark" && legendHover.id === "job";
                  const jobDim =
                    legendActive &&
                    !(
                      legendHover?.kind === "landmark" &&
                      legendHover.id === "job"
                    );
                  return (
                    <g
                      key={key}
                      className={[
                        jobHot ? "is-legend-hot" : "",
                        jobDim ? "is-legend-dim" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <WorkingIcon x={x} y={y - 14} />
                    </g>
                  );
                })}
              </g>
            </svg>
              </div>
            </div>
          </div>
        </div>

        {inspectedCoord && (
          <MapHexDrawer
            state={state}
            dispatch={dispatch}
            coord={inspectedCoord}
            side="right"
            onClose={closeDrawer}
          />
        )}
      </div>
    </div>
  );
}

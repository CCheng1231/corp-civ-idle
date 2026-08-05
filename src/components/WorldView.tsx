import {
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
  TOWER_HEX_LABELS,
  isAvailableCommercialLot,
  regionAtCoord,
  towerAtCoord,
  towerById,
} from "../game/mapWorld";
import {
  HEX_RADIUS,
  MAP_GOV,
  axialEquals,
  axialKey,
  axialToPixel,
  generateHexagonMap,
  hexBounds,
  hexPolygonPoints,
  officeAtCoord,
} from "../game/hexLayout";
import {
  hexPath,
  hexPathPixels,
  officeTowerCoords,
  pointAlongPolyline,
} from "../game/mapTravel";
import type {
  AxialCoord,
  GameAction,
  GameState,
  JobEngagement,
  MapPlayerGround,
  MapRegion,
  TowerId,
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

const MAP_ZOOM_MIN = 0.7;
const MAP_ZOOM_MAX = 1.8;
const MAP_ZOOM_STEP = 0.1;
const MAP_ZOOM_DEFAULT = 1;
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

const GROUND_OPTIONS: { id: MapPlayerGround; label: string }[] = [
  { id: "streets", label: "Streets" },
  { id: "terrain", label: "Terrain" },
  { id: "hybrid", label: "Hybrid" },
];

function clampZoom(zoom: number): number {
  const stepped = Math.round(zoom / MAP_ZOOM_STEP) * MAP_ZOOM_STEP;
  return Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, Number(stepped.toFixed(1))));
}

/** Keep enough of the map inside the viewport so drag can't lose it. */
function clampMapPan(
  pan: { x: number; y: number },
  zoom: number,
  viewportW: number,
  viewportH: number,
): { x: number; y: number } {
  if (viewportW <= 0 || viewportH <= 0) return pan;
  // Require ~35% of the viewport to still overlap the scaled map.
  const keep = 0.35;
  const limitX =
    zoom >= 1
      ? (viewportW * (zoom - 1)) / 2 + viewportW * keep
      : viewportW * keep * Math.max(zoom, 0.5);
  const limitY =
    zoom >= 1
      ? (viewportH * (zoom - 1)) / 2 + viewportH * keep
      : viewportH * keep * Math.max(zoom, 0.5);
  return {
    x: Math.min(limitX, Math.max(-limitX, pan.x)),
    y: Math.min(limitY, Math.max(-limitY, pan.y)),
  };
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Curvy local wash patch — smooth bezier outline so region edges stay organic
 * without needing heavy Gaussian blur.
 */
function localTerrainPatchPath(
  cx: number,
  cy: number,
  radius: number,
  seed: number,
  samples = 18,
): string {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    const wobble =
      0.68 +
      0.34 * hash01(seed + i * 11) +
      0.14 * Math.sin(t * 2.2 + seed) +
      0.08 * Math.cos(t * 3.7 - seed * 0.6);
    const r = radius * wobble;
    pts.push({
      x: cx + Math.cos(t) * r,
      y: cy + Math.sin(t) * r * (0.86 + 0.18 * hash01(seed + i * 3)),
    });
  }

  const n = pts.length;
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

type TerrainPatch = {
  id: MapRegion;
  key: string;
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
  const officeId = officeAtCoord(coord, {
    established: state.branchEstablished,
    coord: state.branchCoord,
  });
  if (officeId === "hq") return "hq";
  if (officeId === "branch") return "branch";
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

function hexOfficeLabel(
  officeId: ReturnType<typeof officeAtCoord>,
  towerId: ReturnType<typeof towerAtCoord>,
): { text: string; kind: "hq" | "branch" | "tower" } | null {
  if (officeId === "hq") return { text: "HQ", kind: "hq" };
  if (officeId === "branch") return { text: "Branch", kind: "branch" };
  if (towerId) {
    return { text: TOWER_HEX_LABELS[towerId], kind: "tower" };
  }
  return null;
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
}: {
  x: number;
  y: number;
  variant: LandmarkKind;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const kind = variant;
  const wrapClass = [
    "map-city-marker-wrap",
    highlighted ? "is-legend-hot" : "",
    dimmed ? "is-legend-dim" : "",
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
  const cells = useMemo(() => generateHexagonMap(), []);
  const bounds = useMemo(() => hexBounds(cells), [cells]);
  const { terrainPatches, decorations } = useMemo(() => {
    const patches: TerrainPatch[] = [];
    const freeByRegion: Record<MapRegion, AxialCoord[]> = {
      metropolis: [],
      suburban: [],
      rural: [],
      countryside: [],
    };

    // Dense overlapping patches so each region reads as one connected wash,
    // without a single hull that fills holes (countryside over metro).
    cells.forEach((coord, index) => {
      const region = regionAtCoord(coord);
      const { x, y } = axialToPixel(coord.q, coord.r);
      const cellSeed = coord.q * 31 + coord.r * 17 + 9;
      const radius = HEX_RADIUS * (1.38 + 0.28 * hash01(cellSeed + 8));
      const ox = (hash01(cellSeed + 2) - 0.5) * HEX_RADIUS * 0.28;
      const oy = (hash01(cellSeed + 4) - 0.5) * HEX_RADIUS * 0.28;
      patches.push({
        id: region,
        key: `patch-${axialKey(coord)}`,
        d: localTerrainPatchPath(x + ox, y + oy, radius, cellSeed + index),
      });

      const occupied =
        axialEquals(coord, MAP_GOV) ||
        Boolean(towerAtCoord(coord)) ||
        Boolean(
          officeAtCoord(coord, {
            established: state.branchEstablished,
            coord: state.branchCoord,
          }),
        ) ||
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
        const center = axialToPixel(anchor.q, anchor.r);
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

    patches.sort(
      (a, b) => REGION_ORDER.indexOf(a.id) - REGION_ORDER.indexOf(b.id),
    );
    return { terrainPatches: patches, decorations: decos };
  }, [cells, state.branchEstablished, state.branchCoord]);
  const [inspectedCoord, setInspectedCoord] = useState<AxialCoord | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [legendHover, setLegendHover] = useState<LegendHover>(null);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM_DEFAULT);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const mapViewportRef = useRef<HTMLDivElement>(null);
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
  const ground = state.settings.mapPlayerGround ?? "hybrid";
  const legendActive = legendHover !== null;

  function viewportSize(): { width: number; height: number } {
    const el = mapViewportRef.current;
    if (!el) return { width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function setPanClamped(next: { x: number; y: number }, zoom = mapZoom) {
    const { width, height } = viewportSize();
    setMapPan(clampMapPan(next, zoom, width, height));
  }

  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -MAP_ZOOM_STEP : MAP_ZOOM_STEP;
      setMapZoom((z) => clampZoom(z + delta));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const { width, height } = viewportSize();
    setMapPan((pan) => clampMapPan(pan, mapZoom, width, height));
  }, [mapZoom]);

  function resetMapView() {
    setMapZoom(MAP_ZOOM_DEFAULT);
    setMapPan({ x: 0, y: 0 });
  }

  function closeDrawer() {
    setInspectedCoord(null);
    dispatch({ type: "SELECT_TOWER", towerId: null });
    dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
  }

  function inspectHex(coord: AxialCoord) {
    setInspectedCoord({ ...coord });

    const officeId = officeAtCoord(coord, {
      established: state.branchEstablished,
      coord: state.branchCoord,
    });
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
  const workingTowerIds = [
    ...new Set(
      activeEngagements
        .filter((e) => e.phase === "working")
        .map((e) => e.towerId),
    ),
  ];

  return (
    <div
      className={`world-view map-presentation-${isDev ? "dev" : "player"} map-ground-${ground}${
        legendActive ? " map-legend-hovering" : ""
      }`}
    >
      <div className="world-header">
        <h2>Regional map</h2>
        <p>
          {isDev
            ? "Developer hex view — same region map as Player, with hex paths for timing."
            : "City map — try Streets / Terrain / Hybrid; hover the legend to spotlight."}
        </p>
        <div className="world-map-controls" role="group" aria-label="Map view mode">
          <span className="world-map-controls-label">View</span>
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
            Developer
          </button>
          <button
            type="button"
            className={`tab${!isDev ? " active" : ""}`}
            aria-pressed={!isDev}
            onClick={() =>
              dispatch({
                type: "UPDATE_SETTINGS",
                settings: { mapPresentation: "player" },
              })
            }
          >
            Player
          </button>
        </div>
        {!isDev ? (
          <div
            className="world-map-controls"
            role="group"
            aria-label="Player ground style"
          >
            <span className="world-map-controls-label">Ground</span>
            {GROUND_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`tab${ground === option.id ? " active" : ""}`}
                aria-pressed={ground === option.id}
                onClick={() =>
                  dispatch({
                    type: "UPDATE_SETTINGS",
                    settings: { mapPlayerGround: option.id },
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
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

        <div className="map-zoom-controls" role="group" aria-label="Map zoom">
          <button
            type="button"
            className="map-zoom-btn"
            aria-label="Zoom out"
            disabled={mapZoom <= MAP_ZOOM_MIN}
            onClick={() => setMapZoom((z) => clampZoom(z - MAP_ZOOM_STEP))}
          >
            −
          </button>
          <button
            type="button"
            className="map-zoom-btn map-zoom-reset"
            aria-label="Reset zoom and pan"
            onClick={resetMapView}
          >
            {Math.round(mapZoom * 100)}%
          </button>
          <button
            type="button"
            className="map-zoom-btn"
            aria-label="Zoom in"
            disabled={mapZoom >= MAP_ZOOM_MAX}
            onClick={() => setMapZoom((z) => clampZoom(z + MAP_ZOOM_STEP))}
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
          <div
            className="map-zoom-scaler"
            style={{
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
            }}
            draggable={false}
          >
            <svg
              viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
              role="img"
              aria-label="Regional map"
            >
              <defs>
                <filter
                  id="map-terrain-soft"
                  x="-25%"
                  y="-25%"
                  width="150%"
                  height="150%"
                >
                  <feGaussianBlur stdDeviation="3.2" />
                </filter>
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
                  <g
                    className="map-region-clouds"
                    filter="url(#map-terrain-soft)"
                    pointerEvents="none"
                  >
                    {terrainPatches.map((patch) => {
                      const regionHot =
                        legendHover?.kind === "region" &&
                        legendHover.id === patch.id;
                      const regionDim =
                        legendActive &&
                        !(
                          legendHover?.kind === "region" &&
                          legendHover.id === patch.id
                        );
                      return (
                        <path
                          key={patch.key}
                          d={patch.d}
                          className={[
                            "map-region-cloud",
                            `map-region-cloud-${patch.id}`,
                            regionHot ? "is-legend-hot" : "",
                            regionDim ? "is-legend-dim" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      );
                    })}
                  </g>
                  <g className="map-decorations" pointerEvents="none">
                    {decorations.map((deco) => {
                      const regionHot =
                        legendHover?.kind === "region" &&
                        legendHover.id === deco.region;
                      const regionDim =
                        legendActive &&
                        !(
                          legendHover?.kind === "region" &&
                          legendHover.id === deco.region
                        );
                      return (
                        <g
                          key={deco.key}
                          className={[
                            regionHot ? "is-legend-hot" : "",
                            regionDim ? "is-legend-dim" : "",
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
                const { x, y } = axialToPixel(coord.q, coord.r);
                const variant = hexVariant(coord, state);
                const isDefault = variant === "default";
                const towerId = towerAtCoord(coord);
                const officeId = officeAtCoord(coord, {
                  established: state.branchEstablished,
                  coord: state.branchCoord,
                });
                const isInspected =
                  inspectedCoord !== null && axialEquals(coord, inspectedCoord);
                const mapLabel = hexOfficeLabel(officeId, towerId);
                const landmark = landmarkKindFor(coord, variant);
                const isLandmark = landmark !== null;
                const region = regionAtCoord(coord);
                const isWorkingSite = Boolean(
                  towerId && workingTowerIds.includes(towerId),
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
                            highlighted={siteHot}
                            dimmed={siteDim}
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
                    {mapLabel && (
                      <text
                        x={x}
                        y={y + (isDev ? 0 : 20)}
                        className={`hex-label hex-label-${mapLabel.kind}${
                          !isDev ? " hex-label-player" : ""
                        }${siteHot ? " is-legend-hot" : ""}${
                          siteDim ? " is-legend-dim" : ""
                        }`}
                        textAnchor="middle"
                        dominantBaseline="central"
                        pointerEvents="none"
                      >
                        {mapLabel.text}
                      </text>
                    )}
                    {isDev && axialEquals(coord, MAP_GOV) ? (
                      <text
                        x={x}
                        y={y}
                        className="hex-label hex-label-gov"
                        textAnchor="middle"
                        dominantBaseline="central"
                        pointerEvents="none"
                      >
                        Gov
                      </text>
                    ) : null}
                  </g>
                );
              })}

              <g className="map-task-layer" pointerEvents="none">
                {activeEngagements.map((engagement) => {
                  const { from, to } = officeTowerCoords(
                    state,
                    engagement.officeId,
                    engagement.towerId,
                  );
                  const origin = engagement.phase === "returning" ? to : from;
                  const dest = engagement.phase === "returning" ? from : to;
                  const pathCoords = isDev
                    ? hexPath(origin, dest)
                    : [origin, dest];
                  const pixels = hexPathPixels(pathCoords);
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
                {workingTowerIds.map((towerId) => {
                  const coord = towerById(towerId as TowerId).coord;
                  const { x, y } = axialToPixel(coord.q, coord.r);
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
                      key={towerId}
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

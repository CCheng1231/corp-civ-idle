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
import { majorHubAtCoord } from "../game/worldMapMajorHubs";
import {
  REGION_LABELS,
  isAvailableCommercialLot,
  hqMapCoordForFocus,
  mapMainOfficeId,
  officeDisplayName,
  regionAtCoord,
  towerAtCoord,
  worldMapHexBounds,
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
  findMapHexElement,
  focusViewportOnContentPoint,
  MAP_HQ_FOCUS_ZOOM_REL,
  MAP_ZOOM_REL_DEFAULT,
  MAP_ZOOM_REL_MAX,
  MAP_ZOOM_REL_MIN,
  MAP_ZOOM_REL_STEP,
  mapPresentationTiltDeg,
  measureMapViewport,
  panToCenterViewportRect,
  type MapContentSize,
  worldMapCoordToContentPixel,
} from "../game/mapViewport";
import {
  readWorldMapViewportCache,
  writeWorldMapViewportCache,
} from "../game/worldMapViewportCache";
import { worldMapV01ZoomBand } from "../game/worldMapV01";
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
import { officeAtForState, playerHqCoord as hqCoordForPlayer } from "../multiplayer/playerHq";
import type {
  AxialCoord,
  GameAction,
  GameState,
  JobEngagement,
  MapRegion,
} from "../game/types";
import { MapHexDrawer } from "./MapHexDrawer";
import { MapLandmarkIcon } from "./MapLandmarkIcon";
import {
  WorldMapBaseArt,
  WorldMapZ1EngineHubDots,
} from "./WorldMapBaseArt";
import { WorldMapZ1AlignDragLayer } from "./WorldMapZ1AlignDragLayer";
import { WorldMapDevToolbar } from "./WorldMapDevToolbar";
import { resolveZ1RasterAlignment } from "../game/worldMapZ1Align";
import {
  defaultMapDevMovableLandmarkKey,
  effectiveLandmarkCoord,
  landmarkKeyForCoord,
  nearestAxialFromViewBox,
  type MapDevLandmarkKey,
  worldMapCellsForSettings,
  worldMapPresentationPixel,
} from "../game/mapDevLayout";
import { isMapDevLandmarkKeyLocked } from "../game/mapLayoutLock";
import type { OnlineSession } from "../multiplayer/types";

interface WorldViewProps {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  session?: OnlineSession;
}

type HexVariant =
  | "default"
  | "gov"
  | "hq"
  | "branch"
  | "tower"
  | "commercial"
  | "active"
  | "major-hub";

type LegendHover =
  | { kind: "region"; id: MapRegion }
  | { kind: "landmark"; id: HexVariant | "gov" | "job" }
  | null;

type LandmarkKind =
  | "gov"
  | "hq"
  | "branch"
  | "tower"
  | "major-hub"
  | "commercial"
  | "active";

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

function hexVariant(
  coord: AxialCoord,
  state: GameState,
  session?: OnlineSession,
): HexVariant {
  const settings = state.settings;
  if (axialEquals(coord, MAP_GOV)) return "gov";
  const officeId = officeAtForState(coord, state, session);
  if (officeId === "hq") return "hq";
  if (officeId && isBranchOfficeId(officeId)) return "branch";
  if (towerAtCoord(coord, settings)) return "tower";
  if (isAvailableCommercialLot(coord, state)) return "commercial";
  if (majorHubAtCoord(coord, settings)) return "major-hub";
  if (state.jobEngagements.some((e) => e.phase === "working")) {
    const workingTower = state.jobEngagements.find(
      (e) => e.phase === "working",
    )?.towerId;
    if (workingTower && towerAtCoord(coord, settings) === workingTower) {
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
  if (variant === "major-hub") return "major-hub";
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
  if (hover.id === "major-hub")
    return landmark === "major-hub" || landmark === "tower";
  return landmark === hover.id;
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
  id: "gov" | "hq" | "branch" | "tower" | "major-hub" | "commercial" | "job";
  label: string;
  className: string;
}[] = [
  { id: "gov", label: "Gov", className: "landmark-legend-gov" },
  { id: "hq", label: "HQ", className: "landmark-legend-hq" },
  { id: "branch", label: "Branch", className: "landmark-legend-branch" },
  { id: "tower", label: "Office tower", className: "landmark-legend-tower" },
  {
    id: "major-hub",
    label: "Major hub",
    className: "landmark-legend-major-hub",
  },
  { id: "commercial", label: "Commercial lot", className: "landmark-legend-lot" },
  { id: "job", label: "Task force", className: "landmark-legend-job" },
];

export function WorldView({ state, dispatch, session }: WorldViewProps) {
  const savedViewport = readWorldMapViewportCache();
  const restoreViewport = savedViewport.hasSession;
  const cells = useMemo(
    () => worldMapCellsForSettings(state.settings),
    [state.settings],
  );
  const bounds = useMemo(() => worldMapHexBounds(cells), [cells]);
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
    hexMoveLandmarkKey: MapDevLandmarkKey | null;
  } | null>(null);
  const [hexMoveHoverCoord, setHexMoveHoverCoord] = useState<AxialCoord | null>(
    null,
  );
  const now = Date.now();
  const isDev = state.settings.mapPresentation === "dev";
  const mapGround = state.settings.mapPlayerGround ?? "hybrid";
  const mapZoom = fitZoom * mapZoomRel;
  const mapV01Band = worldMapV01ZoomBand(mapZoomRel);
  const mapTiltDeg = !isDev ? mapPresentationTiltDeg(mapZoomRel, mapV01Band) : 0;
  const z1RasterAlign = useMemo(
    () => resolveZ1RasterAlignment(state.settings.mapZ1RasterAlign),
    [state.settings.mapZ1RasterAlign],
  );
  const z1AlignDragActive =
    isDev && mapV01Band === 1 && state.settings.mapZ1AlignDrag === true;
  const mapDevHexEditActive = isDev && state.settings.mapDevHexEdit === true;
  const isDevRef = useRef(isDev);
  const mapV01BandRef = useRef(mapV01Band);
  const z1RasterAlignRef = useRef(z1RasterAlign);
  const dispatchRef = useRef(dispatch);

  function adjustZ1BakeScale(delta: number) {
    const align = resolveZ1RasterAlignment(z1RasterAlignRef.current);
    const nextScale = Math.min(1.55, Math.max(0.75, align.scale + delta));
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        mapZ1RasterAlign: { ...align, scale: nextScale },
      },
    });
  }

  function applyLandmarkMove(landmarkKey: MapDevLandmarkKey, dest: AxialCoord) {
    if (landmarkKey === "gov" || axialEquals(dest, MAP_GOV)) return;
    if (isMapDevLandmarkKeyLocked(landmarkKey)) return;
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        mapDevLandmarkCoords: {
          ...state.settings.mapDevLandmarkCoords,
          [landmarkKey]: dest,
        },
        mapDevHexEditLandmark: landmarkKey,
      },
    });
    setInspectedCoord(dest);
    setHexMoveHoverCoord(null);
  }

  function mapContentPointFromClient(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const svg = mapSvgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const mapped = pt.matrixTransform(ctm.inverse());
    return { x: mapped.x, y: mapped.y };
  }

  const legendActive = legendHover !== null;
  const mainOfficeId = mapMainOfficeId(state);
  const mainOfficeLocationId =
    mainOfficeId === "branch"
      ? (branchOfficeIds(state)[0] ?? "hq")
      : "hq";
  const mapFocusCoordValue = useMemo(
    () => hqMapCoordForFocus(cells, state, session),
    [cells, state, session],
  );
  const mainOfficeCoord = mapFocusCoordValue;

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
      if (
        event.ctrlKey &&
        isDevRef.current &&
        mapV01BandRef.current === 1
      ) {
        event.preventDefault();
        const align = resolveZ1RasterAlignment(z1RasterAlignRef.current);
        const step = event.deltaY > 0 ? -0.025 : 0.025;
        const nextScale = Math.min(1.55, Math.max(0.75, align.scale + step));
        dispatchRef.current({
          type: "UPDATE_SETTINGS",
          settings: {
            mapZ1RasterAlign: { ...align, scale: nextScale },
          },
        });
        return;
      }
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
    isDevRef.current = isDev;
    mapV01BandRef.current = mapV01Band;
    z1RasterAlignRef.current = z1RasterAlign;
    dispatchRef.current = dispatch;
  }, [isDev, mapV01Band, z1RasterAlign, dispatch]);

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
    const viewport = mapViewportRef.current;
    if (!viewport || bounds.width <= 0) return;

    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    if (vpW <= 0 || vpH <= 0) return;

    const measured = measureMapViewport(vpW, vpH, bounds);
    const content = measured.content;
    if (content.width <= 1 || content.height <= 1) return;

    mapContentSizeRef.current = content;
    fitZoomRef.current = measured.fitZoom;
    mapZoomRelRef.current = MAP_HQ_FOCUS_ZOOM_REL;
    setMapContentSize(content);
    setFitZoom(measured.fitZoom);
    setMapZoomRel(MAP_HQ_FOCUS_ZOOM_REL);

    const focusCoord = hqMapCoordForFocus(cells, state, session);

    const centerOnHqHex = () => {
      const vp = mapViewportRef.current;
      const svgEl = mapSvgRef.current;
      if (!vp) return;

      const vpRect = vp.getBoundingClientRect();
      const zoom = fitZoomRef.current * mapZoomRelRef.current;
      const hexEl = svgEl ? findMapHexElement(svgEl, focusCoord) : null;

      let nextPan = mapPanRef.current;
      if (hexEl) {
        nextPan = panToCenterViewportRect(
          vpRect,
          hexEl.getBoundingClientRect(),
          mapPanRef.current,
        );
      } else {
        const officePoint = worldMapCoordToContentPixel(
          focusCoord,
          bounds,
          mapContentSizeRef.current,
          state.settings,
        );
        nextPan = focusViewportOnContentPoint(
          officePoint,
          mapContentSizeRef.current,
          vpRect.width,
          vpRect.height,
          fitZoomRef.current,
          MAP_HQ_FOCUS_ZOOM_REL,
        ).pan;
      }

      const clamped = clampMapPan(
        nextPan,
        zoom,
        vpRect.width,
        vpRect.height,
        mapContentSizeRef.current,
      );
      mapPanRef.current = clamped;
      setMapPan(clamped);
      setHqFlashActive(true);
      setHqFlashSeq((seq) => seq + 1);
    };

    requestAnimationFrame(() => requestAnimationFrame(centerOnHqHex));
  }

  function closeDrawer() {
    setInspectedCoord(null);
    dispatch({ type: "SELECT_TOWER", towerId: null });
    dispatch({ type: "SELECT_COMMERCIAL_HEX", coord: null });
  }

  function inspectHex(coord: AxialCoord) {
    setInspectedCoord({ ...coord });

    const officeId = officeAtForState(coord, state, session);
    const towerId = towerAtCoord(coord, state.settings);

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
    const hitCoord = coordFromEventTarget(event.target);
    const hexEditMove =
      mapDevHexEditActive &&
      (state.settings.mapDevHexEditMode ?? "move") === "move" &&
      !event.altKey;
    if (mapDevHexEditActive && !event.altKey && !hexEditMove) {
      event.preventDefault();
      panDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: mapPan.x,
        originY: mapPan.y,
        moved: false,
        hitCoord,
        hexMoveLandmarkKey: null,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (hexEditMove) {
      event.preventDefault();
      const rawPicked =
        (hitCoord ? landmarkKeyForCoord(hitCoord, state.settings) : null) ??
        state.settings.mapDevHexEditLandmark ??
        defaultMapDevMovableLandmarkKey();
      const picked =
        rawPicked && !isMapDevLandmarkKeyLocked(rawPicked) ? rawPicked : null;
      panDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: mapPan.x,
        originY: mapPan.y,
        moved: false,
        hitCoord,
        hexMoveLandmarkKey:
          picked && picked !== "gov" ? picked : null,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    // Stop browser SVG/image drag ghosts (common when grabbing map corners).
    event.preventDefault();
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
      moved: false,
      hitCoord,
      hexMoveLandmarkKey: null,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (z1AlignDragActive) return;
    const drag = panDragRef.current;
    if (
      mapDevHexEditActive &&
      drag &&
      drag.pointerId === event.pointerId &&
      (state.settings.mapDevHexEditMode ?? "move") === "move" &&
      drag.hexMoveLandmarkKey
    ) {
      const point = mapContentPointFromClient(event.clientX, event.clientY);
      if (point) {
        setHexMoveHoverCoord(nearestAxialFromViewBox(point));
      }
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) >= PAN_DRAG_THRESHOLD) {
        drag.moved = true;
      }
      return;
    }
    if (mapDevHexEditActive) return;
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
    if (mapDevHexEditActive) {
      const point = mapContentPointFromClient(event.clientX, event.clientY);
      const mode = state.settings.mapDevHexEditMode ?? "move";
      if (mode === "create" && point && !drag.moved) {
        const coord = nearestAxialFromViewBox(point);
        const key = axialKey(coord);
        const base = generateHexagonMap();
        const already =
          base.some((c) => axialKey(c) === key) ||
          (state.settings.mapDevExtraHexes ?? []).some(
            (c) => axialKey(c) === key,
          );
        if (!already) {
          dispatch({
            type: "UPDATE_SETTINGS",
            settings: {
              mapDevExtraHexes: [
                ...(state.settings.mapDevExtraHexes ?? []),
                coord,
              ],
            },
          });
        }
        setInspectedCoord(coord);
        return;
      }
      if (mode === "move" && point) {
        const dest = hitCoord ?? nearestAxialFromViewBox(point);
        const rawLandmarkKey =
          drag.hexMoveLandmarkKey ??
          (hitCoord ? landmarkKeyForCoord(hitCoord, state.settings) : null) ??
          state.settings.mapDevHexEditLandmark ??
          defaultMapDevMovableLandmarkKey();
        const landmarkKey =
          rawLandmarkKey && !isMapDevLandmarkKeyLocked(rawLandmarkKey)
            ? rawLandmarkKey
            : null;
        if (landmarkKey) {
          applyLandmarkMove(landmarkKey, dest);
        }
      }
      setHexMoveHoverCoord(null);
      return;
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
    const selfId = state.onlineSession.accountId;
    return Object.values(state.companyPresence ?? {})
      .filter((presence) => presence.accountId !== selfId)
      .flatMap((presence) => {
        const items: { coord: AxialCoord; label: string; key: string }[] = [
          {
            coord: hqCoordForPlayer(presence.accountId),
            label: `${presence.displayName} HQ`,
            key: `${presence.accountId}-hq`,
          },
        ];
        if (presence.branchSites?.length) {
          for (const [index, branch] of presence.branchSites.entries()) {
            items.push({
              coord: branch.coord,
              label: branch.name ?? `${presence.displayName} branch`,
              key: `${presence.accountId}-branch-${index}`,
            });
          }
        }
        return items;
      });
  }, [state.companyPresence, state.onlineSession]);

  return (
    <div
      className={`world-view map-presentation-${isDev ? "dev" : "player"} map-ground-${mapGround}${
        legendActive ? " map-legend-hovering" : ""
      }${z1AlignDragActive ? " world-view-z1-align-drag" : ""}${
        mapDevHexEditActive ? " world-view-dev-hex-edit" : ""
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
            {isDev ? (
              <WorldMapDevToolbar
                settings={state.settings}
                dispatch={dispatch}
                mapV01Band={mapV01Band}
                z1RasterAlign={z1RasterAlign}
                onAdjustBakeScale={adjustZ1BakeScale}
                inspectedHex={inspectedCoord}
              />
            ) : null}
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
          {session?.playMode === "online"
            ? "HQ"
            : mainOfficeId === "branch"
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
                className={`map-zoom-scale-layer${!isDev ? " map-zoom-scale-layer-tilt" : ""}`}
                style={{
                  transform: !isDev
                    ? `perspective(1400px) rotateX(${mapTiltDeg}deg) scale(${mapZoom})`
                    : `scale(${mapZoom})`,
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
              <WorldMapBaseArt
                bounds={bounds}
                zoomRel={mapZoomRel}
                z1LayerVisibility={state.settings.mapZ1LayerFilters}
                z1RasterAlign={z1RasterAlign}
                z1OmitBakedLayer={z1AlignDragActive}
                z1ShowAlignGuide={
                  isDev &&
                  state.settings.mapZ1AlignGuide === true &&
                  !z1AlignDragActive
                }
                z1ShowEngineHubDots={isDev && !z1AlignDragActive}
              />

              {cells.map((coord) => {
                const { x, y } = worldMapPresentationPixel(
                  coord,
                  state.settings,
                );
                const variant = hexVariant(coord, state, session);
                const isDefault = variant === "default";
                const officeId = officeAtForState(coord, state, session);
                const isInspected =
                  inspectedCoord !== null && axialEquals(coord, inspectedCoord);
                const isExtraHex =
                  mapDevHexEditActive &&
                  (state.settings.mapDevExtraHexes ?? []).some((c) =>
                    axialEquals(c, coord),
                  );
                const devMoveLandmark = state.settings.mapDevHexEditLandmark;
                const devMoveSourceCoord =
                  mapDevHexEditActive &&
                  devMoveLandmark &&
                  devMoveLandmark !== "gov"
                    ? effectiveLandmarkCoord(devMoveLandmark, state.settings)
                    : null;
                const isHexMoveSource =
                  devMoveSourceCoord != null &&
                  axialEquals(coord, devMoveSourceCoord);
                const isHexMoveTarget =
                  hexMoveHoverCoord !== null &&
                  axialEquals(coord, hexMoveHoverCoord);
                const isPlayerMainOffice =
                  session?.playMode === "online"
                    ? officeId === "hq" &&
                      axialEquals(coord, mapFocusCoordValue)
                    : officeId === mainOfficeId &&
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
                          isExtraHex ? "hex-tile-dev-extra" : "",
                          isHexMoveSource ? "hex-tile-dev-move-source" : "",
                          isHexMoveTarget ? "hex-tile-dev-move-target" : "",
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
                          r={isLandmark ? PLAYER_HIT_RADIUS * 1.2 : PLAYER_HIT_RADIUS}
                          data-map-q={coord.q}
                          data-map-r={coord.r}
                          className={[
                            "map-player-node",
                            "map-player-node-hit",
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
                          <MapLandmarkIcon
                            x={x}
                            y={y}
                            kind={landmark}
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
                      </>
                    )}
                  </g>
                );
              })}

              {z1AlignDragActive ? (
                <WorldMapZ1AlignDragLayer
                  bounds={bounds}
                  alignment={z1RasterAlign}
                  showAlignGuide={state.settings.mapZ1AlignGuide === true}
                  onAlignmentChange={(next) =>
                    dispatch({
                      type: "UPDATE_SETTINGS",
                      settings: { mapZ1RasterAlign: next },
                    })
                  }
                />
              ) : null}
              {isDev && mapV01Band === 1 && !z1AlignDragActive ? (
                <WorldMapZ1EngineHubDots />
              ) : null}

              {peerMarkers.map((marker) => {
                const { x, y } = worldMapPresentationPixel(
                  marker.coord,
                  state.settings,
                );
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
                  const pixels = pathCoords.map((c) =>
                    worldMapPresentationPixel(c, state.settings),
                  );
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
                        className="map-travel-path map-travel-path-halo"
                        fill="none"
                      />
                      <polyline
                        points={pointsAttr}
                        className={`map-travel-path${
                          isDev
                            ? " map-travel-path-hex"
                            : " map-travel-path-straight"
                        } map-travel-path-${engagement.phase}`}
                        fill="none"
                      />
                      {pos ? <RunningIcon x={pos.x} y={pos.y} /> : null}
                    </g>
                  );
                })}
                {workingSiteCoords.map((siteCoord) => {
                  const key = axialKey(siteCoord);
                  const { x, y } = worldMapPresentationPixel(
                    siteCoord,
                    state.settings,
                  );
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

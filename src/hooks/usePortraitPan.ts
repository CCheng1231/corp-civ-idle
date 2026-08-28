import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type SyntheticEvent,
} from "react";

export interface PortraitPan {
  x: number;
  y: number;
}

export interface PortraitImageLayout {
  width: number;
  height: number;
  baseX: number;
  baseY: number;
}

const DEFAULT_PAN: PortraitPan = { x: 0, y: 0 };

/** Extra scale beyond cover so drag can reveal uncropped edges. */
const PAN_ZOOM_FACTOR = 1.45;
const DEFAULT_FOCAL_Y_PERCENT = 12;

function readPan(storageKey: string): PortraitPan {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_PAN;
    const parsed = JSON.parse(raw) as PortraitPan;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PAN;
}

export function computePortraitImageLayout(
  frameWidth: number,
  frameHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  focalYPercent = DEFAULT_FOCAL_Y_PERCENT,
): PortraitImageLayout | null {
  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return null;
  }

  const coverScale = Math.max(
    frameWidth / naturalWidth,
    frameHeight / naturalHeight,
  );
  const scale = coverScale * PAN_ZOOM_FACTOR;
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const baseX = (frameWidth - width) / 2;
  const baseY = (frameHeight - height) * (focalYPercent / 100);

  return { width, height, baseX, baseY };
}

function clampPan(
  pan: PortraitPan,
  frameWidth: number,
  frameHeight: number,
  layout: PortraitImageLayout,
): PortraitPan {
  const minX = frameWidth - layout.width - layout.baseX;
  const maxX = -layout.baseX;
  const minY = frameHeight - layout.height - layout.baseY;
  const maxY = -layout.baseY;

  if (minX > maxX || minY > maxY) {
    return DEFAULT_PAN;
  }

  return {
    x: Math.max(minX, Math.min(maxX, pan.x)),
    y: Math.max(minY, Math.min(maxY, pan.y)),
  };
}

export function usePortraitPan(storageKey: string) {
  const [pan, setPan] = useState<PortraitPan>(() => readPan(storageKey));
  const [layout, setLayout] = useState<PortraitImageLayout | null>(null);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const syncLayout = useCallback(() => {
    const frame = frameRef.current;
    const natural = naturalSizeRef.current;
    if (!frame || !natural) return;

    const nextLayout = computePortraitImageLayout(
      frame.clientWidth,
      frame.clientHeight,
      natural.width,
      natural.height,
    );
    if (!nextLayout) return;

    setLayout(nextLayout);
    setPan((prev) =>
      clampPan(
        prev,
        frame.clientWidth,
        frame.clientHeight,
        nextLayout,
      ),
    );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pan));
    } catch {
      /* ignore */
    }
  }, [pan, storageKey]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => syncLayout());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [syncLayout]);

  const onImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
      naturalSizeRef.current = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      requestAnimationFrame(() => syncLayout());
    },
    [syncLayout],
  );

  const reset = useCallback(() => {
    setPan(DEFAULT_PAN);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLImageElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      };
      setDragging(true);
    },
    [pan.x, pan.y],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLImageElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const frame = frameRef.current;
      if (!frame || !layout) return;

      const next = {
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      };
      setPan(
        clampPan(next, frame.clientWidth, frame.clientHeight, layout),
      );
    },
    [layout],
  );

  const endDrag = useCallback((event: PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const surfaceTransform =
    layout === null
      ? undefined
      : `translate(${layout.baseX + pan.x}px, ${layout.baseY + pan.y}px)`;

  return {
    pan,
    layout,
    dragging,
    frameRef,
    reset,
    onImageLoad,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    surfaceTransform,
  };
}

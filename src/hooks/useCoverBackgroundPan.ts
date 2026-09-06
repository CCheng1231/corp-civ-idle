import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  type CoverPanOffset,
  DEFAULT_COVER_PAN_OFFSET,
  coverBackgroundPanStyle,
  notifyCoverBackgroundPanChange,
  readCoverBackgroundPanOffset,
} from "../game/hubLandingPan";

function computePanLimits(
  frameWidth: number,
  frameHeight: number,
  naturalWidth: number,
  naturalHeight: number,
): { maxX: number; maxY: number } {
  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return { maxX: 0, maxY: 0 };
  }

  const scale = Math.max(
    frameWidth / naturalWidth,
    frameHeight / naturalHeight,
  );
  const scaledWidth = naturalWidth * scale;
  const scaledHeight = naturalHeight * scale;

  return {
    maxX: Math.max(0, (scaledWidth - frameWidth) / 2),
    maxY: Math.max(0, (scaledHeight - frameHeight) / 2),
  };
}

function clampOffset(
  offset: CoverPanOffset,
  limits: { maxX: number; maxY: number },
): CoverPanOffset {
  return {
    x: Math.max(-limits.maxX, Math.min(limits.maxX, offset.x)),
    y: Math.max(-limits.maxY, Math.min(limits.maxY, offset.y)),
  };
}

export function useCoverBackgroundPan(imageSrc: string, storageKey: string) {
  const [offset, setOffset] = useState<CoverPanOffset>(() =>
    readCoverBackgroundPanOffset(storageKey),
  );
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(
    null,
  );
  const limitsRef = useRef({ maxX: 0, maxY: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  const syncLimits = useCallback(() => {
    const frame = frameRef.current;
    const natural = naturalSizeRef.current;
    if (!frame || !natural) return;

    const limits = computePanLimits(
      frame.clientWidth,
      frame.clientHeight,
      natural.width,
      natural.height,
    );
    limitsRef.current = limits;
    setOffset((prev) => clampOffset(prev, limits));
  }, []);

  useEffect(() => {
    naturalSizeRef.current = null;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
      naturalSizeRef.current = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      requestAnimationFrame(() => syncLimits());
    };
    img.src = imageSrc;
  }, [imageSrc, syncLimits]);

  useEffect(() => {
    setOffset(readCoverBackgroundPanOffset(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const key = storageKeyRef.current;
    try {
      localStorage.setItem(key, JSON.stringify(offset));
    } catch {
      /* ignore */
    }
    notifyCoverBackgroundPanChange(key, offset);
  }, [offset]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const observer = new ResizeObserver(() => syncLimits());
    observer.observe(frame);
    return () => observer.disconnect();
  }, [syncLimits]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
      };
      setDragging(true);
    },
    [offset.x, offset.y],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const next = {
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    };
    setOffset(clampOffset(next, limitsRef.current));
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const backgroundStyle = coverBackgroundPanStyle(imageSrc, offset);

  return {
    frameRef,
    dragging,
    backgroundStyle,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}

export type { CoverPanOffset };
export { DEFAULT_COVER_PAN_OFFSET as DEFAULT_PAN };

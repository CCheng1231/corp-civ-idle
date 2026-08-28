import { useRef, type PointerEvent } from "react";
import { usePortraitPan } from "../hooks/usePortraitPan";

interface TabPortraitFrameProps {
  src: string;
  panStorageKey?: string;
  onPortraitToggle?: () => void;
}

const DOUBLE_TAP_MS = 320;
const TAP_MOVE_THRESHOLD_PX = 8;

function usePortraitDoubleTap(onPortraitToggle?: () => void) {
  const lastTapAtRef = useRef(0);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  function handlePortraitToggle() {
    if (!onPortraitToggle) return;
    onPortraitToggle();
    lastTapAtRef.current = 0;
  }

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
  }

  function handlePointerMove(event: PointerEvent<HTMLImageElement>) {
    const down = pointerDownRef.current;
    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (dx * dx + dy * dy > TAP_MOVE_THRESHOLD_PX * TAP_MOVE_THRESHOLD_PX) {
      movedRef.current = true;
    }
  }

  function handlePointerEnd(event?: PointerEvent<HTMLImageElement>) {
    if (!onPortraitToggle || movedRef.current) {
      pointerDownRef.current = null;
      return;
    }
    // Mouse double-click fires dblclick after pointerup — avoid toggling twice.
    if (event?.pointerType === "mouse") {
      pointerDownRef.current = null;
      return;
    }
    const now = Date.now();
    if (now - lastTapAtRef.current < DOUBLE_TAP_MS) {
      handlePortraitToggle();
    } else {
      lastTapAtRef.current = now;
    }
    pointerDownRef.current = null;
  }

  function clearPointer() {
    pointerDownRef.current = null;
  }

  const enabled = Boolean(onPortraitToggle);

  return {
    frameTitle: enabled ? "Double-tap portrait to change size" : undefined,
    doubleTapClass: enabled ? "tab-portrait-frame-double-tap" : "",
    onDoubleClick: enabled
      ? (event: { preventDefault: () => void }) => {
          event.preventDefault();
          handlePortraitToggle();
        }
      : undefined,
    pointerHandlers: enabled
      ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerEnd,
          onPointerCancel: clearPointer,
        }
      : {},
  };
}

function StaticTabPortraitFrame({
  src,
  onPortraitToggle,
}: TabPortraitFrameProps) {
  const { frameTitle, doubleTapClass, onDoubleClick, pointerHandlers } =
    usePortraitDoubleTap(onPortraitToggle);

  return (
    <div
      className={`secretary-portrait-frame${doubleTapClass ? ` ${doubleTapClass}` : ""}`}
      title={frameTitle}
    >
      <img
        src={src}
        alt=""
        className="secretary-portrait"
        draggable={false}
        onDoubleClick={onDoubleClick}
        {...pointerHandlers}
        aria-hidden
      />
    </div>
  );
}

function PannableTabPortraitFrame({
  src,
  panStorageKey,
  onPortraitToggle,
}: TabPortraitFrameProps & { panStorageKey: string }) {
  const {
    pan,
    layout,
    dragging,
    frameRef,
    reset,
    onImageLoad,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    surfaceTransform,
  } = usePortraitPan(panStorageKey);

  const { frameTitle, doubleTapClass, onDoubleClick, pointerHandlers } =
    usePortraitDoubleTap(onPortraitToggle);

  function handlePointerDown(event: PointerEvent<HTMLImageElement>) {
    pointerHandlers.onPointerDown?.(event);
    if (layout) {
      onPointerDown(event);
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLImageElement>) {
    pointerHandlers.onPointerMove?.(event);
    if (layout) {
      onPointerMove(event);
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLImageElement>) {
    if (layout) {
      onPointerUp(event);
    }
    pointerHandlers.onPointerUp?.(event);
  }

  function handlePointerCancel(event: PointerEvent<HTMLImageElement>) {
    if (layout) {
      onPointerCancel(event);
    }
    pointerHandlers.onPointerCancel?.();
  }

  const interactionEnabled = onPortraitToggle || layout;

  return (
    <div
      ref={frameRef}
      className={`secretary-portrait-frame tab-portrait-frame-pannable${pan.x !== 0 || pan.y !== 0 ? " tab-portrait-frame-panned" : ""}${doubleTapClass ? ` ${doubleTapClass}` : ""}`}
      title={frameTitle}
    >
      <button
        type="button"
        className="tab-portrait-pan-reset"
        title="Reset portrait position"
        aria-label="Reset portrait position"
        onClick={reset}
      />
      <div
        className={`tab-portrait-pan-surface${layout ? " tab-portrait-pan-surface-ready" : ""}${dragging ? " tab-portrait-pan-surface-dragging" : ""}`}
        style={surfaceTransform ? { transform: surfaceTransform } : undefined}
      >
        <img
          src={src}
          alt=""
          className={`secretary-portrait tab-portrait-pannable${layout ? " tab-portrait-pannable-ready" : ""}`}
          style={
            layout ? { width: layout.width, height: layout.height } : undefined
          }
          draggable={false}
          onLoad={onImageLoad}
          onDoubleClick={onDoubleClick}
          onPointerDown={interactionEnabled ? handlePointerDown : undefined}
          onPointerMove={interactionEnabled ? handlePointerMove : undefined}
          onPointerUp={interactionEnabled ? handlePointerEnd : undefined}
          onPointerCancel={interactionEnabled ? handlePointerCancel : undefined}
          aria-hidden
        />
      </div>
    </div>
  );
}

export function DraggableTabPortraitFrame(props: TabPortraitFrameProps) {
  if (props.panStorageKey) {
    return (
      <PannableTabPortraitFrame
        {...props}
        panStorageKey={props.panStorageKey}
      />
    );
  }
  return <StaticTabPortraitFrame {...props} />;
}

import { useRef, useState, type PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 4;

const SCROLL_EXCLUDED_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "option",
  '[role="button"]',
  '[contenteditable="true"]',
  ".tab-portrait-frame-pannable",
  ".tab-portrait-pan-surface",
  ".logbook-col-resize",
].join(", ");

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
  dragging: boolean;
};

function isScrollExcluded(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest(SCROLL_EXCLUDED_SELECTOR))
  );
}

/** Pointer drag on scroll containers; touch uses native momentum scroll. */
export function useDragScroll() {
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 && event.button !== 1) return;
    if (event.pointerType === "touch") return;
    if (isScrollExcluded(event.target)) return;

    const el = event.currentTarget;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      dragging: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const el = event.currentTarget;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.dragging) {
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      drag.dragging = true;
      setDragging(true);
      el.setPointerCapture(event.pointerId);
    }

    el.scrollLeft = drag.scrollLeft - dx;
    el.scrollTop = drag.scrollTop - dy;
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const el = event.currentTarget;
    if (drag.dragging && el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  }

  return {
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}

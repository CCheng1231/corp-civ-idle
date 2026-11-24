import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const PAD = 8;
const PAD_MAP = 0;
const PAD_MAP_JOB_ROW = 3;
const RING_NUDGE_HOST_X = 0;
const RING_NUDGE_HOST_Y = 0;

function coachHolePad(anchorId: string): number {
  if (
    anchorId.startsWith("gov-coach-anchor-map-job-") &&
    !anchorId.includes("-send-")
  ) {
    return PAD_MAP_JOB_ROW;
  }
  return anchorId.startsWith("gov-coach-anchor-map-") ? PAD_MAP : PAD;
}

function scrollCoachAnchorIntoView(el: HTMLElement) {
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
}

function isMapWorldCoachAnchor(anchorId: string): boolean {
  return anchorId.startsWith("gov-coach-anchor-map-");
}

function isMapJobEngageCoachAnchor(anchorId: string): boolean {
  return (
    anchorId === "gov-coach-anchor-map-job-engage-dialog" ||
    anchorId === "gov-coach-anchor-map-job-engage-facts" ||
    anchorId === "gov-coach-anchor-map-job-engage-fresh-qty" ||
    anchorId === "gov-coach-anchor-job-engage"
  );
}

function coachMapJobEngageBackdrop(): HTMLElement | null {
  return document.querySelector(
    ".map-world-job-engage-backdrop",
  ) as HTMLElement | null;
}
const Z_SCRIM = 1180;
const Z_RING = 1185;
const Z_BUBBLE = 1190;
const Z_BLOCK_SCRIM = 1310;
const Z_DISMISS_BUBBLE = 1320;

function coachShellElement(): HTMLElement | null {
  return (
    (document.querySelector(".device-preview-webview") as HTMLElement | null) ??
    (document.querySelector(".app-shell") as HTMLElement | null)
  );
}

/** Clamp coach UI to the game shell (phone preview frame or full app). */
function coachMapWorldHost(): HTMLElement | null {
  return document.querySelector(
    ".world-view.map-presentation-player",
  ) as HTMLElement | null;
}

function coachPortalHost(anchorId: string): HTMLElement {
  if (isMapJobEngageCoachAnchor(anchorId)) {
    const engageBackdrop = coachMapJobEngageBackdrop();
    if (engageBackdrop) return engageBackdrop;
  }
  if (
    isMapWorldCoachAnchor(anchorId) ||
    anchorId === "gov-coach-anchor-job-engage"
  ) {
    const world = coachMapWorldHost();
    if (world) return world;
  }
  return coachShellElement() ?? document.body;
}

function coachUsesHostFixedCoords(host: HTMLElement): boolean {
  return host !== document.body;
}

function coachOverlayPosition(host: HTMLElement): "fixed" | "absolute" {
  return coachUsesHostFixedCoords(host) ? "absolute" : "fixed";
}

function snapRectPx(r: DOMRect): DOMRect {
  return new DOMRect(
    Math.round(r.left),
    Math.round(r.top),
    Math.round(r.width),
    Math.round(r.height),
  );
}

function anchorRectForCoachHost(anchor: DOMRect, host: HTMLElement): DOMRect {
  if (!coachUsesHostFixedCoords(host)) return snapRectPx(anchor);
  const h = host.getBoundingClientRect();
  return snapRectPx(
    new DOMRect(
      anchor.left - h.left,
      anchor.top - h.top,
      anchor.width,
      anchor.height,
    ),
  );
}

function coachFrameBounds(anchorId: string): {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const host = coachPortalHost(anchorId);
  const edge = 8;
  if (coachUsesHostFixedCoords(host)) {
    const w = host.clientWidth;
    const h = host.clientHeight;
    return {
      left: edge,
      top: edge,
      right: w - edge,
      bottom: h - edge,
      width: Math.max(120, w - edge * 2),
      height: Math.max(120, h - edge * 2),
    };
  }
  const r = host.getBoundingClientRect();
  return {
    left: r.left + edge,
    top: r.top + edge,
    right: r.right - edge,
    bottom: r.bottom - edge,
    width: Math.max(120, r.width - edge * 2),
    height: Math.max(120, r.height - edge * 2),
  };
}

function coachShellBox(host: HTMLElement) {
  if (coachUsesHostFixedCoords(host)) {
    return {
      top: 0,
      left: 0,
      right: host.clientWidth,
      bottom: host.clientHeight,
      width: host.clientWidth,
      height: host.clientHeight,
    };
  }
  const r = host.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

interface GovProgramCoachSpotlightProps {
  anchorId: string;
  message: ReactNode;
  active: boolean;
  dimBackground?: boolean;
  dismissible?: boolean;
  dismissLabel?: string;
  onDismiss?: () => void;
}

/** Dim the UI and spotlight one control; compact coaching bubble beside it. */
export function GovProgramCoachSpotlight({
  anchorId,
  message,
  active,
  dimBackground = true,
  dismissible = false,
  dismissLabel = "Come back later",
  onDismiss,
}: GovProgramCoachSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [bubbleStyle, setBubbleStyle] = useState<CSSProperties | null>(null);
  const [blockingUiOpen, setBlockingUiOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) {
      setRect(null);
      setBubbleStyle(null);
      return;
    }

    function placeBubble(
      r: DOMRect,
      bubbleHeight: number,
      bubbleWidth: number,
    ) {
      const overlayHost = coachPortalHost(anchorId);
      const overlayPos = coachOverlayPosition(overlayHost);
      const frame = coachFrameBounds(anchorId);
      const maxW = Math.min(288, frame.width);
      const homeNav = anchorId === "gov-coach-anchor-home";
      const resourceBar = anchorId === "gov-coach-anchor-resource-bar";
      const queueHead = anchorId === "gov-coach-anchor-structure-queue-head";
      const gap = 10;
      const w = Math.min(bubbleWidth, maxW);

      let top: number;
      let left: number;

      if (isMapWorldCoachAnchor(anchorId)) {
        const useW = Math.min(maxW, Math.max(156, frame.width * 0.48));
        left = frame.left;
        top = Math.max(
          frame.top,
          Math.min(r.top - gap, frame.bottom - bubbleHeight - gap),
        );
        if (top + bubbleHeight > r.top - 2) {
          top = Math.max(frame.top, r.bottom + gap);
        }
        if (top + bubbleHeight > frame.bottom) {
          top = Math.max(frame.top, frame.bottom - bubbleHeight - gap);
        }
        setBubbleStyle({
          position: overlayPos,
          top,
          left,
          width: useW,
          maxWidth: useW,
          zIndex: dismissible ? Z_DISMISS_BUBBLE : Z_BUBBLE,
        });
        return;
      }

      if (anchorId === "gov-coach-anchor-job-engage") {
        const useW = Math.min(maxW, Math.max(156, frame.width - 16));
        const anchorCenter = r.left + r.width / 2;
        left = anchorCenter - useW / 2;
        left = Math.max(frame.left + 8, Math.min(left, frame.right - useW - 8));
        top = r.bottom + gap;
        if (top + bubbleHeight > frame.bottom - 8) {
          top = Math.max(frame.top + 8, frame.bottom - bubbleHeight - 8);
        }
        setBubbleStyle({
          position: overlayPos,
          top,
          left,
          width: useW,
          maxWidth: useW,
          zIndex: dismissible ? Z_DISMISS_BUBBLE : Z_BUBBLE,
        });
        return;
      }

      if (queueHead) {
        top = r.bottom + gap;
        if (top + bubbleHeight > frame.bottom) {
          top = Math.max(frame.top, r.top - gap - bubbleHeight);
        }
        left = frame.left + (frame.width - Math.min(maxW, frame.width)) / 2;
        const useW = Math.min(maxW, frame.width);
        setBubbleStyle({
          position: overlayPos,
          top: Math.max(frame.top, Math.min(top, frame.bottom - bubbleHeight)),
          left,
          width: useW,
          maxWidth: useW,
          zIndex: Z_BUBBLE,
        });
        return;
      }

      if (resourceBar) {
        top = Math.min(r.bottom + gap, frame.bottom - bubbleHeight);
      } else if (homeNav || r.bottom > frame.bottom - frame.height * 0.35) {
        top = r.top - gap - bubbleHeight;
      } else {
        const belowTop = r.bottom + gap;
        const aboveTop = r.top - gap - bubbleHeight;
        top =
          belowTop + bubbleHeight <= frame.bottom ? belowTop : aboveTop;
      }

      const anchorCenter = r.left + r.width / 2;
      left = anchorCenter - w / 2;
      top = Math.max(
        frame.top,
        Math.min(top, frame.bottom - bubbleHeight),
      );
      left = Math.max(frame.left, Math.min(left, frame.right - w));

      setBubbleStyle({
        position: overlayPos,
        top,
        left,
        maxWidth: maxW,
        zIndex: dismissible ? Z_DISMISS_BUBBLE : Z_BUBBLE,
      });
    }

    function measure() {
      const el = document.getElementById(anchorId);
      if (!el) {
        setRect(null);
        setBubbleStyle(null);
        return;
      }
      const needsScroll =
        anchorId === "gov-coach-anchor-structure-queue-head" ||
        anchorId === "gov-coach-anchor-map-tier" ||
        anchorId === "gov-coach-anchor-map-job-engage-fresh-qty" ||
        (anchorId.startsWith("gov-coach-anchor-map-job-") &&
          !anchorId.includes("-send-")) ||
        anchorId.startsWith("gov-coach-anchor-job-");
      if (needsScroll) {
        scrollCoachAnchorIntoView(el);
      }
      el.classList.add("gov-program-coach-spotlight-target");
      const host = coachPortalHost(anchorId);
      const applyMeasure = () => {
        const target = document.getElementById(anchorId);
        if (!target) return;
        const r = anchorRectForCoachHost(target.getBoundingClientRect(), host);
        setRect(r);
        const bubbleHeight = bubbleRef.current?.offsetHeight ?? 92;
        const bubbleWidth = bubbleRef.current?.offsetWidth ?? 200;
        placeBubble(r, bubbleHeight, bubbleWidth);
      };
      applyMeasure();
      if (needsScroll) {
        requestAnimationFrame(() => {
          requestAnimationFrame(applyMeasure);
        });
      }
    }

    measure();
    const afterPaint = requestAnimationFrame(measure);
    const retryId = window.setInterval(measure, 120);
    const stopRetry = window.setTimeout(() => window.clearInterval(retryId), 3200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(afterPaint);
      window.clearInterval(retryId);
      window.clearTimeout(stopRetry);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      document.getElementById(anchorId)?.classList.remove(
        "gov-program-coach-spotlight-target",
      );
    };
  }, [active, anchorId, message, dismissible]);

  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("gov-program-coach-active");
    return () => {
      document.documentElement.classList.remove("gov-program-coach-active");
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      setBlockingUiOpen(false);
      return;
    }
    const sync = () => {
      const backdrops = document.querySelectorAll(".modal-backdrop");
      const blocking = Array.from(backdrops).some(
        (el) => !el.classList.contains("map-world-job-engage-backdrop"),
      );
      setBlockingUiOpen(blocking);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active]);

  if (!active || blockingUiOpen || !rect || !bubbleStyle) return null;

  const portalHost = coachPortalHost(anchorId);
  const overlayPos = coachOverlayPosition(portalHost);
  const shell = coachShellBox(portalHost);
  const frameEdge = 8;
  const holePad = coachHolePad(anchorId);
  const hostRelative = coachUsesHostFixedCoords(portalHost);
  const nudgeX = hostRelative ? RING_NUDGE_HOST_X : 0;
  const nudgeY = hostRelative ? RING_NUDGE_HOST_Y : 0;
  const holeTop = Math.max(frameEdge, rect.top - holePad + nudgeY);
  const holeLeft = Math.max(frameEdge, rect.left - holePad + nudgeX);
  const holeRight = Math.min(
    shell.width - frameEdge,
    rect.right + holePad + nudgeX,
  );
  const holeBottom = Math.min(
    shell.height - frameEdge,
    rect.bottom + holePad + nudgeY,
  );
  const holeW = holeRight - holeLeft;
  const holeH = holeBottom - holeTop;
  const scrim = "rgba(14, 18, 24, 0.58)";
  const shellW = shell.width;

  const panels = [
    { top: shell.top, left: shell.left, width: shellW, height: holeTop - shell.top },
    {
      top: holeBottom,
      left: shell.left,
      width: shellW,
      height: Math.max(0, shell.bottom - holeBottom),
    },
    {
      top: holeTop,
      left: shell.left,
      width: Math.max(0, holeLeft - shell.left),
      height: holeH,
    },
    {
      top: holeTop,
      left: holeRight,
      width: Math.max(0, shell.right - holeRight),
      height: holeH,
    },
  ];
  const scrimBlocksPointer = dimBackground && dismissible;
  const mapCoach = isMapWorldCoachAnchor(anchorId);

  return createPortal(
    <>
      {dimBackground
        ? panels.map((p, i) => (
            <div
              key={i}
              className="gov-program-coach-scrim-panel"
              style={{
                position: overlayPos,
                top: p.top,
                left: p.left,
                width: p.width,
                height: p.height,
                background: scrim,
                zIndex: Z_SCRIM,
                pointerEvents:
                  scrimBlocksPointer || mapCoach ? "auto" : "none",
              }}
              aria-hidden
            />
          ))
        : null}
      {dimBackground ? (
        <div
          className="gov-program-coach-spotlight-ring"
          style={{
            position: overlayPos,
            top: holeTop,
            left: holeLeft,
            width: holeW,
            height: holeH,
            zIndex: Z_RING,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      ) : (
        <div
          className="gov-program-coach-spotlight-ring gov-program-coach-spotlight-ring--soft"
          style={{
            position: overlayPos,
            top: holeTop,
            left: holeLeft,
            width: holeW,
            height: holeH,
            zIndex: Z_RING,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      )}
      <div
        ref={bubbleRef}
        className={`gov-program-coach-guide-bubble${
          dismissible ? " gov-program-coach-guide-bubble--dismiss" : ""
        }`}
        style={bubbleStyle}
        role={dismissible ? "dialog" : "status"}
        aria-modal={dismissible || undefined}
      >
        <p className="gov-program-coach-guide-text">{message}</p>
        {dismissible && onDismiss ? (
          <div className="gov-program-tutorial-actions">
            <button
              type="button"
              className="btn primary gov-program-tutorial-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
            >
              {dismissLabel}
            </button>
          </div>
        ) : null}
      </div>
    </>,
    portalHost,
  );
}
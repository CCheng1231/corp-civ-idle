import { useLayoutEffect, useState, type CSSProperties, type Dispatch } from "react";
import { createPortal } from "react-dom";
import type { GameAction } from "../game/types";

function coachShellElement(): HTMLElement | null {
  return (
    (document.querySelector(".device-preview-webview") as HTMLElement | null) ??
    (document.querySelector(".app-shell") as HTMLElement | null)
  );
}

interface GovProgramMapFilterIntroProps {
  dispatch: Dispatch<GameAction>;
}

/** Step 3 — Jobs filter on the world map (anchored to filter panel). */
export function GovProgramMapFilterIntro({
  dispatch,
}: GovProgramMapFilterIntroProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    function place() {
      const host = coachShellElement() ?? document.body;
      const anchor = document.getElementById("gov-coach-anchor-map-job-filter");
      if (!anchor) {
        setStyle(null);
        return;
      }
      const hostRect = host.getBoundingClientRect();
      const r = anchor.getBoundingClientRect();
      const local = host !== document.body;
      const pad = 8;
      const frameW = local ? host.clientWidth : window.innerWidth;
      const maxW = Math.min(300, frameW - pad * 2);
      const anchorLeft = local ? r.left - hostRect.left : r.left;
      const anchorBottom = local ? r.bottom - hostRect.top : r.bottom;
      const left = Math.max(pad, Math.min(anchorLeft, frameW - maxW - pad));
      const top = anchorBottom + 8;
      setStyle({
        position: "fixed",
        top,
        left,
        width: maxW,
        zIndex: 1300,
      });
    }
    place();
    const retryId = window.setInterval(place, 120);
    const stopRetry = window.setTimeout(() => window.clearInterval(retryId), 2400);
    window.addEventListener("resize", place);
    return () => {
      window.clearInterval(retryId);
      window.clearTimeout(stopRetry);
      window.removeEventListener("resize", place);
    };
  }, []);

  if (!style) return null;

  return createPortal(
    <>
      <div
        className="gov-program-coach-intro-backdrop"
        role="presentation"
        aria-hidden
      />
      <div
        className="gov-program-coach-overlay-bubble"
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gov-map-filter-intro-title"
      >
        <p id="gov-map-filter-intro-title" className="gov-program-tutorial-copy">
          Contracts show on the map as sites. Use the <strong>Jobs</strong> filter —
          set <strong>Tier</strong> to <strong>T1</strong>, then pick a posting to
          survey it.
        </p>
        <div className="gov-program-tutorial-actions">
          <button
            type="button"
            className="btn primary gov-program-tutorial-btn"
            onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
          >
            Got it
          </button>
        </div>
      </div>
    </>,
    coachShellElement() ?? document.body,
  );
}
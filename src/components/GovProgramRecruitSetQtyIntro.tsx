import { useLayoutEffect, useState, type CSSProperties, type Dispatch } from "react";
import { createPortal } from "react-dom";
import type { GameAction } from "../game/types";

interface GovProgramRecruitSetQtyIntroProps {
  dispatch: Dispatch<GameAction>;
  anchorId: string;
}

/** Step 2 — text hint anchored to Fresh Graduate (no portrait). */
export function GovProgramRecruitSetQtyIntro({
  dispatch,
  anchorId,
}: GovProgramRecruitSetQtyIntroProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    function place() {
      const anchor = document.getElementById(anchorId);
      if (!anchor) {
        setStyle(null);
        return;
      }
      const r = anchor.getBoundingClientRect();
      const pad = 8;
      const maxW = Math.min(280, window.innerWidth - pad * 2);
      const left = Math.max(
        pad,
        Math.min(r.left, window.innerWidth - maxW - pad),
      );
      const top = r.bottom + 6;
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
    const scrollRoot = document.querySelector(
      ".recruitment-view.hub-synced-tab-view .hub-synced-tab-scroll-body",
    );
    scrollRoot?.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.clearInterval(retryId);
      window.clearTimeout(stopRetry);
      scrollRoot?.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [anchorId]);

  if (!style) return null;

  return createPortal(
    <div
      className="gov-program-coach-overlay-bubble"
      style={style}
      role="dialog"
      aria-labelledby="gov-recruit-set-qty-title"
    >
      <p id="gov-recruit-set-qty-title" className="gov-program-coach-overlay-text">
        Change <strong>Qty</strong> to <strong>10</strong>, then tap{" "}
        <strong>Queue order</strong> on Fresh Graduate.
      </p>
      <button
        type="button"
        className="btn primary gov-program-coach-overlay-ok"
        onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
      >
        OK
      </button>
    </div>,
    document.body,
  );
}

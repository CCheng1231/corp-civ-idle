import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { GameAction } from "../game/types";

interface GovProgramQueueIntroProps {
  dispatch: Dispatch<GameAction>;
  titleId: string;
  /** Extra class on root (e.g. recruit variant). */
  className?: string;
  buttonLabel?: string;
  children: ReactNode;
  /** Portals beside anchor — no layout shift in queue column. */
  anchorId?: string;
}

function QueueIntroBubble({
  titleId,
  buttonLabel,
  children,
  dispatch,
}: Pick<
  GovProgramQueueIntroProps,
  "titleId" | "buttonLabel" | "children" | "dispatch"
>) {
  return (
    <div className="gov-program-queue-intro-bubble">
      <p id={titleId} className="gov-program-tutorial-copy">
        {children}
      </p>
      <div className="gov-program-tutorial-actions">
        <button
          type="button"
          className="btn primary gov-program-tutorial-btn"
          onClick={() => dispatch({ type: "GOV_DISMISS_MODAL" })}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

/** Coach bubble after first queue (Structure / Recruit steps). */
export function GovProgramQueueIntro({
  dispatch,
  titleId,
  className,
  buttonLabel = "Continue",
  children,
  anchorId,
}: GovProgramQueueIntroProps) {
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (!anchorId) {
      setStyle(null);
      return;
    }
    const anchorIdFixed = anchorId;
    function place() {
      const anchor = document.getElementById(anchorIdFixed);
      if (!anchor) {
        setStyle(null);
        return;
      }
      const r = anchor.getBoundingClientRect();
      const pad = 8;
      const maxW = Math.min(420, window.innerWidth - pad * 2);
      const width = Math.min(maxW, r.width);
      const left = Math.max(
        pad,
        Math.min(r.left + (r.width - width) / 2, window.innerWidth - width - pad),
      );
      const top = r.bottom + 6;
      setStyle({
        position: "fixed",
        top,
        left,
        width,
        zIndex: 1300,
      });
    }
    place();
    const retryId = window.setInterval(place, 120);
    const stopRetry = window.setTimeout(() => window.clearInterval(retryId), 2400);
    const scrollRoot = document.querySelector(
      ".hub-synced-tab-view .hub-synced-tab-scroll-body",
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

  const rootClass = ["gov-program-queue-intro", className]
    .filter(Boolean)
    .join(" ");

  if (anchorId) {
    if (!style) return null;
    return createPortal(
      <div
        className={`${rootClass} gov-program-queue-intro--floating`}
        style={style}
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="gov-program-queue-intro-arrow" aria-hidden="true" />
        <QueueIntroBubble
          titleId={titleId}
          buttonLabel={buttonLabel}
          dispatch={dispatch}
        >
          {children}
        </QueueIntroBubble>
      </div>,
      document.body,
    );
  }

  return (
    <div className={rootClass} role="dialog" aria-labelledby={titleId}>
      <div className="gov-program-queue-intro-arrow" aria-hidden="true" />
      <QueueIntroBubble
        titleId={titleId}
        buttonLabel={buttonLabel}
        dispatch={dispatch}
      >
        {children}
      </QueueIntroBubble>
    </div>
  );
}
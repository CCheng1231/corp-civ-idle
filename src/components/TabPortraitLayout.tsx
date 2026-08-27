import { useEffect, useState, type ReactNode } from "react";
import { useTabPortraitParallax } from "../hooks/useTabPortraitParallax";

type PortraitSize = "compact" | "large";

function initialPortraitSize(
  storageKey: string,
  defaultLargeOnDesktop = false,
): PortraitSize {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "compact" || stored === "large") return stored;
  } catch {
    /* ignore */
  }
  if (
    defaultLargeOnDesktop &&
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 961px)").matches
  ) {
    return "large";
  }
  return "compact";
}

export function TabPortraitQuote({ quote }: { quote: string }) {
  return (
    <blockquote className="secretary-quote tab-portrait-quote">
      <p>&ldquo;{quote}&rdquo;</p>
    </blockquote>
  );
}

interface TabPortraitLayoutProps {
  src: string;
  storageKey: string;
  defaultLargeOnDesktop?: boolean;
  className?: string;
  quote?: string;
  portraitFooter?: ReactNode;
  /** Extra vertical span for Secretary portrait column. */
  tallPortrait?: boolean;
  /**
   * stretch — tall portrait grows with right column (Home, Hire, Research).
   * fixed — capped frame (Office sites).
   */
  portraitLayout?: "stretch" | "fixed";
  /** Slower left-column drift vs right content while scrolling. */
  parallaxScroll?: boolean;
  /** Right column scrolls; portrait stays visible (Home tab). */
  portraitLocked?: boolean;
  children: ReactNode;
}

/**
 * Portrait column beside tab content.
 * Default: vertical stretch portrait + parallax scroll.
 */
export function TabPortraitLayout({
  src,
  storageKey,
  defaultLargeOnDesktop = false,
  className = "",
  quote,
  portraitFooter,
  tallPortrait = false,
  portraitLayout = "stretch",
  parallaxScroll = true,
  portraitLocked = false,
  children,
}: TabPortraitLayoutProps) {
  const [portraitSize, setPortraitSize] = useState<PortraitSize>(() =>
    initialPortraitSize(storageKey, defaultLargeOnDesktop),
  );
  const portraitLarge = portraitSize === "large";
  const layout: "stretch" | "fixed" =
    tallPortrait ? "fixed" : portraitLayout;
  const { sceneRef, portraitTrackRef, mainTrackRef } = useTabPortraitParallax(
    parallaxScroll && !portraitLocked,
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, portraitSize);
    } catch {
      /* ignore */
    }
  }, [portraitSize, storageKey]);

  const sceneClass = [
    "tab-scene",
    "office-scene",
    "tab-portrait-scene",
    layout === "fixed" ? "tab-portrait-fixed" : "tab-portrait-stretch",
    tallPortrait ? "tab-portrait-tall" : "",
    portraitLarge ? "secretary-portrait-large" : "",
    parallaxScroll && !portraitLocked ? "tab-portrait-parallax" : "",
    portraitLocked ? "tab-portrait-locked" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const portraitColumnBody = (
    <>
      <div className="secretary-portrait-wrap tab-portrait-wrap">
        <div className="secretary-portrait-frame">
          <img src={src} alt="" className="secretary-portrait" aria-hidden />
        </div>
        <button
          type="button"
          className="tab secretary-portrait-resize"
          aria-pressed={portraitLarge}
          onClick={() =>
            setPortraitSize((size) => (size === "large" ? "compact" : "large"))
          }
        >
          {portraitLarge ? "Smaller portrait" : "Larger portrait"}
        </button>
      </div>
      {quote ? <TabPortraitQuote quote={quote} /> : null}
      {portraitFooter}
    </>
  );

  return (
    <div
      ref={parallaxScroll && !portraitLocked ? sceneRef : undefined}
      className={sceneClass}
    >
      <div className="secretary-hero-row tab-sticky-hero-row">
        <div className="secretary-portrait-column tab-portrait-column-sticky">
          {parallaxScroll && !portraitLocked ? (
            <div
              ref={portraitTrackRef}
              className="tab-portrait-parallax-track tab-portrait-side"
            >
              {portraitColumnBody}
            </div>
          ) : (
            portraitColumnBody
          )}
        </div>
        <div
          ref={parallaxScroll && !portraitLocked ? mainTrackRef : undefined}
          className={`tab-hero-main${parallaxScroll && !portraitLocked ? " tab-parallax-main" : ""}${portraitLocked ? " tab-hero-main-scroll" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

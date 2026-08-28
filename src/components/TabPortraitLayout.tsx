import { useEffect, useState, type ReactNode } from "react";
import { DraggableTabPortraitFrame } from "./DraggableTabPortraitFrame";
import { useTabPortraitParallax } from "../hooks/useTabPortraitParallax";

export type PortraitSize = "compact" | "large";

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

export function portraitPanStorageKeyFor(storageKey: string): string {
  return storageKey.endsWith("-portrait-size")
    ? storageKey.replace(/-portrait-size$/, "-portrait-pan")
    : `${storageKey}-pan`;
}

/** Compact = portrait lock; large = Hire-style stretch at same column width. */
export const DUAL_PORTRAIT_TAB_PROPS = {
  largePortraitLikeHire: true,
  portraitLayout: "fixed" as const,
  parallaxScroll: false,
  portraitLocked: true,
};

export function dualPortraitTabClass(portraitLarge: boolean): string {
  return portraitLarge
    ? "tab-portrait-hire-stretch"
    : "tab-portrait-vertical-layout portrait-lock-tab";
}

export function portraitLockPageClass(portraitLarge: boolean): string {
  return portraitLarge ? "" : "portrait-lock-page";
}

export function portraitLockBodyClass(portraitLarge: boolean): string {
  return portraitLarge ? "" : "portrait-lock-layout-body";
}

export function useTabPortraitSize(
  storageKey: string,
  defaultLargeOnDesktop = false,
) {
  const [portraitSize, setPortraitSize] = useState<PortraitSize>(() =>
    initialPortraitSize(storageKey, defaultLargeOnDesktop),
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, portraitSize);
    } catch {
      /* ignore */
    }
  }, [portraitSize, storageKey]);

  return {
    portraitSize,
    setPortraitSize,
    portraitLarge: portraitSize === "large",
  };
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
  portraitSize?: PortraitSize;
  onPortraitSizeChange?: (size: PortraitSize) => void;
  className?: string;
  quote?: string;
  portraitFooter?: ReactNode;
  /** Extra vertical span for Secretary portrait column. */
  tallPortrait?: boolean;
  /**
   * stretch — tall portrait grows with right column (Hire, Research).
   * fixed — capped frame (Home, Office portrait lock).
   */
  portraitLayout?: "stretch" | "fixed";
  /** Slower left-column drift vs right content while scrolling. */
  parallaxScroll?: boolean;
  /** Right column scrolls; portrait stays visible (Home tab). */
  portraitLocked?: boolean;
  /**
   * Office tab: compact = frozen portrait lock; large = stretch + parallax like Hire.
   */
  largePortraitLikeHire?: boolean;
  /** Office tab: drag to pan portrait; persists offset; default = centered crop. */
  portraitPanStorageKey?: string;
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
  portraitSize: portraitSizeProp,
  onPortraitSizeChange,
  className = "",
  quote,
  portraitFooter,
  tallPortrait = false,
  portraitLayout = "stretch",
  parallaxScroll = true,
  portraitLocked = false,
  largePortraitLikeHire = false,
  portraitPanStorageKey,
  children,
}: TabPortraitLayoutProps) {
  const [internalSize, setInternalSize] = useState<PortraitSize>(() =>
    initialPortraitSize(storageKey, defaultLargeOnDesktop),
  );
  const portraitSize = portraitSizeProp ?? internalSize;
  const setPortraitSize = onPortraitSizeChange ?? setInternalSize;
  const basePanStorageKey =
    portraitPanStorageKey ?? portraitPanStorageKeyFor(storageKey);
  const effectivePanStorageKey = `${basePanStorageKey}-${portraitSize}`;
  const portraitLarge = portraitSize === "large";
  const hireStretch = largePortraitLikeHire && portraitLarge;
  const layout: "stretch" | "fixed" = hireStretch
    ? "stretch"
    : tallPortrait
      ? "fixed"
      : portraitLayout;
  const effectiveParallax = hireStretch ? true : parallaxScroll;
  const effectiveLocked = hireStretch ? false : portraitLocked;
  const { sceneRef, portraitTrackRef, mainTrackRef } = useTabPortraitParallax(
    effectiveParallax && !effectiveLocked,
  );

  useEffect(() => {
    if (portraitSizeProp !== undefined) return;
    try {
      localStorage.setItem(storageKey, portraitSize);
    } catch {
      /* ignore */
    }
  }, [portraitSize, portraitSizeProp, storageKey]);

  const sceneClass = [
    "tab-scene",
    "office-scene",
    "tab-portrait-scene",
    layout === "fixed" ? "tab-portrait-fixed" : "tab-portrait-stretch",
    tallPortrait ? "tab-portrait-tall" : "",
    portraitLarge ? "secretary-portrait-large" : "",
    effectiveParallax && !effectiveLocked ? "tab-portrait-parallax" : "",
    effectiveLocked ? "tab-portrait-locked" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const togglePortraitSize = () =>
    setPortraitSize(portraitLarge ? "compact" : "large");

  const quoteOverlay = Boolean(quote);

  const portraitWrapClass = [
    "secretary-portrait-wrap",
    "tab-portrait-wrap",
    quoteOverlay ? "tab-portrait-stack" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const portraitColumnBody = (
    <>
      <div className={portraitWrapClass}>
        <DraggableTabPortraitFrame
          src={src}
          panStorageKey={effectivePanStorageKey}
          onPortraitToggle={togglePortraitSize}
        />
        {quoteOverlay ? (
          <div className="tab-portrait-quote-foot">
            <TabPortraitQuote quote={quote!} />
          </div>
        ) : null}
      </div>
      {portraitFooter}
    </>
  );

  return (
    <div
      ref={effectiveParallax && !effectiveLocked ? sceneRef : undefined}
      className={sceneClass}
    >
      <div className="secretary-hero-row tab-sticky-hero-row">
        <div className="secretary-portrait-column tab-portrait-column-sticky">
          {effectiveParallax && !effectiveLocked ? (
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
          ref={effectiveParallax && !effectiveLocked ? mainTrackRef : undefined}
          className={`tab-hero-main${effectiveParallax && !effectiveLocked ? " tab-parallax-main" : ""}${effectiveLocked ? " tab-hero-main-scroll" : ""}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

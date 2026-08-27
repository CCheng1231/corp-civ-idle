import { useEffect, useRef } from "react";

/** Left column drifts at this fraction of main-panel scroll (right stays at 1×). */
const LEFT_PARALLAX_RATE = 0.38;
/** Slight extra drift on main column for separation (visual ~1.12× vs portrait). */
const MAIN_PARALLAX_BOOST = 0.12;

export function useTabPortraitParallax(enabled: boolean) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const portraitTrackRef = useRef<HTMLDivElement>(null);
  const mainTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const scene = sceneRef.current;
    const portraitTrack = portraitTrackRef.current;
    const mainTrack = mainTrackRef.current;
    if (!scene || !portraitTrack || !mainTrack) return;

    const scrollRoot = scene.closest(".main-panel") as HTMLElement | null;
    if (!scrollRoot) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    let raf = 0;

    const update = () => {
      raf = 0;
      const scrollY = scrollRoot.scrollTop;
      const rootTop = scrollRoot.getBoundingClientRect().top;
      const sceneTop = scene.getBoundingClientRect().top - rootTop + scrollY;
      const delta = Math.max(0, scrollY - sceneTop);

      portraitTrack.style.transform = `translate3d(0, ${-delta * LEFT_PARALLAX_RATE}px, 0)`;
      mainTrack.style.transform = `translate3d(0, ${-delta * MAIN_PARALLAX_BOOST}px, 0)`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      portraitTrack.style.transform = "";
      mainTrack.style.transform = "";
    };
  }, [enabled]);

  return { sceneRef, portraitTrackRef, mainTrackRef };
}

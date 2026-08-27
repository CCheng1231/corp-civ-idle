import { useEffect, useRef } from "react";
import bgmTrack from "../assets/audio/bgm.mp3";

export function useBgm(volume: number, muted: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  /** True after a gesture in this page — Cursor preview often stays `visibility: hidden`. */
  const engagedRef = useRef(false);
  const effectiveVolume = muted ? 0 : volume;

  mutedRef.current = muted;
  volumeRef.current = volume;

  useEffect(() => {
    const audio = new Audio(bgmTrack);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clampVolume(mutedRef.current ? 0 : volumeRef.current);
    audioRef.current = audio;

    const shouldPlay = () => {
      if (mutedRef.current) return false;
      if (document.visibilityState === "visible") return true;
      if (document.hasFocus()) return true;
      if (engagedRef.current) return true;
      return false;
    };

    const tryPlay = () => {
      if (!shouldPlay()) return;
      audio.volume = clampVolume(mutedRef.current ? 0 : volumeRef.current);
      void audio.play().catch(() => {
        /* Autoplay blocked until interaction. */
      });
    };

    const pauseMusic = () => {
      audio.pause();
    };

    const syncPlayback = () => {
      if (shouldPlay()) tryPlay();
      else pauseMusic();
    };

    const onEngage = () => {
      engagedRef.current = true;
      tryPlay();
    };

    const onDisengage = () => {
      engagedRef.current = false;
      if (document.visibilityState === "hidden" && !document.hasFocus()) {
        pauseMusic();
      }
    };

    const onPageHide = () => {
      engagedRef.current = false;
      pauseMusic();
    };

    syncPlayback();
    const retryIds = [50, 150, 400, 1000, 2000, 4000].map((ms) =>
      window.setTimeout(syncPlayback, ms),
    );

    const engageEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "click",
      "touchstart",
    ];
    for (const event of engageEvents) {
      window.addEventListener(event, onEngage, { passive: true });
    }
    audio.addEventListener("canplaythrough", tryPlay);

    document.addEventListener("visibilitychange", syncPlayback);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", syncPlayback);
    window.addEventListener("focus", syncPlayback);
    window.addEventListener("blur", onDisengage);

    return () => {
      retryIds.forEach((id) => window.clearTimeout(id));
      for (const event of engageEvents) {
        window.removeEventListener(event, onEngage);
      }
      audio.removeEventListener("canplaythrough", tryPlay);
      document.removeEventListener("visibilitychange", syncPlayback);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", syncPlayback);
      window.removeEventListener("focus", syncPlayback);
      window.removeEventListener("blur", onDisengage);
      pauseMusic();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = clampVolume(effectiveVolume);
    if (muted) {
      audio.pause();
      return;
    }
  }, [effectiveVolume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || muted) return;
    const shouldPlay =
      document.visibilityState === "visible" ||
      document.hasFocus() ||
      engagedRef.current;
    if (shouldPlay) {
      void audio.play().catch(() => {});
    }
  }, [muted]);
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

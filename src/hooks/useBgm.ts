import { useEffect, useRef } from "react";
import bgmTrack from "../assets/audio/bgm.mp3";

export function useBgm(volume: number, muted: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const effectiveVolume = muted ? 0 : volume;

  useEffect(() => {
    const audio = new Audio(bgmTrack);
    audio.loop = true;
    audio.volume = clampVolume(effectiveVolume);
    audioRef.current = audio;

    const removeUnlockListeners = () => {
      window.removeEventListener("pointerdown", tryPlay);
      window.removeEventListener("keydown", tryPlay);
    };

    const tryPlay = () => {
      if (unlockedRef.current) return;
      void audio.play().then(() => {
        unlockedRef.current = true;
        removeUnlockListeners();
      }).catch(() => {
        /* Autoplay blocked until the player interacts. */
      });
    };

    tryPlay();
    window.addEventListener("pointerdown", tryPlay);
    window.addEventListener("keydown", tryPlay);

    return () => {
      removeUnlockListeners();
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = clampVolume(effectiveVolume);
    }
  }, [effectiveVolume]);
}

function clampVolume(volume: number): number {
  return Math.max(0, Math.min(1, volume));
}

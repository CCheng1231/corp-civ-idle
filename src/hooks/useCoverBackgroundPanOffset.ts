import { useEffect, useState } from "react";
import {
  HUB_LANDING_PAN_CHANGE_EVENT,
  type CoverPanOffset,
  readCoverBackgroundPanOffset,
} from "../game/hubLandingPan";

export function useCoverBackgroundPanOffset(storageKey: string): CoverPanOffset {
  const [offset, setOffset] = useState<CoverPanOffset>(() =>
    readCoverBackgroundPanOffset(storageKey),
  );

  useEffect(() => {
    function syncFromStorage() {
      setOffset(readCoverBackgroundPanOffset(storageKey));
    }

    syncFromStorage();

    function onPanChange(event: Event) {
      const detail = (
        event as CustomEvent<{ storageKey?: string; offset?: CoverPanOffset }>
      ).detail;
      if (detail?.storageKey !== storageKey) return;
      if (detail.offset) {
        setOffset(detail.offset);
        return;
      }
      syncFromStorage();
    }

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(HUB_LANDING_PAN_CHANGE_EVENT, onPanChange);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(HUB_LANDING_PAN_CHANGE_EVENT, onPanChange);
    };
  }, [storageKey]);

  return offset;
}

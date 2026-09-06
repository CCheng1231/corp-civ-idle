import type { CSSProperties } from "react";
import type { SecretaryId } from "./types";

export const HOME_LANDING_PAN_STORAGE_PREFIX =
  "corp-civ-idle-home-landing-cover";

export const SECRETARY_LANDING_PAN_STORAGE_PREFIX =
  "corp-civ-idle-secretary-landing-cover";

export const HUB_LANDING_PAN_CHANGE_EVENT = "hub-landing-pan-change";

export interface CoverPanOffset {
  x: number;
  y: number;
}

export const DEFAULT_COVER_PAN_OFFSET: CoverPanOffset = { x: 0, y: 0 };

export function homeLandingPanStorageKey(chiefId: SecretaryId): string {
  return `${HOME_LANDING_PAN_STORAGE_PREFIX}-${chiefId}`;
}

export function secretaryLandingPanStorageKey(chiefId: SecretaryId): string {
  return `${SECRETARY_LANDING_PAN_STORAGE_PREFIX}-${chiefId}`;
}

export function readCoverBackgroundPanOffset(
  storageKey: string,
): CoverPanOffset {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_COVER_PAN_OFFSET;
    const parsed = JSON.parse(raw) as CoverPanOffset;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_COVER_PAN_OFFSET;
}

export function coverBackgroundPanStyle(
  imageSrc: string,
  offset: CoverPanOffset,
): CSSProperties {
  return {
    backgroundImage: `url("${imageSrc}")`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundPosition: `calc(50% + ${offset.x}px) calc(50% + ${offset.y}px)`,
  };
}

export function notifyCoverBackgroundPanChange(
  storageKey: string,
  offset: CoverPanOffset,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(HUB_LANDING_PAN_CHANGE_EVENT, {
      detail: { storageKey, offset },
    }),
  );
}

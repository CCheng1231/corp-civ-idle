import {
  coverBackgroundPanStyle,
  homeLandingPanStorageKey,
  secretaryLandingPanStorageKey,
} from "../game/hubLandingPan";
import {
  secretaryHomePortraitSrc,
  secretaryTabPortraitSrc,
} from "../game/secretaryAssets";
import type { SecretaryId } from "../game/types";
import { useCoverBackgroundPanOffset } from "../hooks/useCoverBackgroundPanOffset";

export type HubSyncedPortraitSource = "home" | "secretary";

interface HubSyncedTabBackgroundProps {
  chiefId: SecretaryId;
  /** Home hub tabs use Home art; Secretary roster/job use Secretary art. */
  portraitSource?: HubSyncedPortraitSource;
}

export function HubSyncedTabBackground({
  chiefId,
  portraitSource = "home",
}: HubSyncedTabBackgroundProps) {
  const portrait =
    portraitSource === "secretary"
      ? secretaryTabPortraitSrc(chiefId)
      : secretaryHomePortraitSrc(chiefId);
  const storageKey =
    portraitSource === "secretary"
      ? secretaryLandingPanStorageKey(chiefId)
      : homeLandingPanStorageKey(chiefId);
  const offset = useCoverBackgroundPanOffset(storageKey);

  return (
    <div
      className="hub-synced-tab-portrait-bg"
      style={coverBackgroundPanStyle(portrait, offset)}
      aria-hidden
    />
  );
}

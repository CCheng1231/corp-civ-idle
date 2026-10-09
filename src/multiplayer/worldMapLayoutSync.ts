import {
  getDoc,
  onSnapshot,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import type { GameSettings, MapRegion } from "../game/types";
import {
  type WorldMapDevLayoutStore,
  syncWorldMapDevLayoutFromSettings,
  writeWorldMapDevLayoutStore,
} from "../game/worldMapDevLayoutStore";
import { stripUndefinedDeep } from "./companySave";
import { getDb } from "./firebase";
import {
  ensureFirebaseUser,
  loadBrowserBinding,
  OnlineAccessError,
} from "./onlineAccess";
import type { OnlineAccountId, WorldId } from "./types";
import { isDevAccount } from "./types";
import { mapLayoutRef } from "./worldDocs";

export interface WorldMapLayoutDoc {
  layout: WorldMapDevLayoutStore;
  updatedAt: number;
  updatedBy?: OnlineAccountId;
}

const MAP_REGIONS: MapRegion[] = [
  "metropolis",
  "suburban",
  "rural",
  "countryside",
];

function parseCoord(raw: unknown): { q: number; r: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const q = (raw as { q?: unknown }).q;
  const r = (raw as { r?: unknown }).r;
  if (typeof q !== "number" || typeof r !== "number") return null;
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}

export function parseWorldMapLayoutDoc(
  raw: Record<string, unknown> | undefined,
): WorldMapLayoutDoc | null {
  if (!raw) return null;
  const updatedAt = Number(raw.updatedAt ?? 0);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return null;
  const layoutRaw = raw.layout;
  if (!layoutRaw || typeof layoutRaw !== "object") {
    return { layout: {}, updatedAt };
  }
  const layoutObj = layoutRaw as Record<string, unknown>;
  const store: WorldMapDevLayoutStore = {};

  const landmarks = layoutObj.mapDevLandmarkCoords;
  if (landmarks && typeof landmarks === "object") {
    const out: Record<string, { q: number; r: number }> = {};
    for (const [key, value] of Object.entries(landmarks)) {
      const c = parseCoord(value);
      if (c) out[key] = c;
    }
    if (Object.keys(out).length > 0) {
      store.mapDevLandmarkCoords = out;
    }
  }

  if (Array.isArray(layoutObj.mapDevExtraHexes)) {
    const extra = layoutObj.mapDevExtraHexes
      .map((c) => parseCoord(c))
      .filter((c): c is { q: number; r: number } => c != null);
    if (extra.length > 0) store.mapDevExtraHexes = extra;
  }

  const regions = layoutObj.mapDevRegionOverrides;
  if (regions && typeof regions === "object") {
    const out: Record<string, MapRegion> = {};
    for (const [key, value] of Object.entries(regions)) {
      if (MAP_REGIONS.includes(value as MapRegion)) {
        out[key] = value as MapRegion;
      }
    }
    if (Object.keys(out).length > 0) {
      store.mapDevRegionOverrides = out;
    }
  }

  const brush = layoutObj.mapDevRegionBrush;
  if (MAP_REGIONS.includes(brush as MapRegion)) {
    store.mapDevRegionBrush = brush as MapRegion;
  }

  return { layout: store, updatedAt, updatedBy: raw.updatedBy as OnlineAccountId };
}

export function layoutSettingsPatchFromStore(
  store: WorldMapDevLayoutStore,
): Partial<GameSettings> {
  return {
    mapDevLandmarkCoords: store.mapDevLandmarkCoords,
    mapDevExtraHexes: store.mapDevExtraHexes,
    mapDevRegionOverrides: store.mapDevRegionOverrides,
    mapDevRegionBrush: store.mapDevRegionBrush,
  };
}

export function storeFromSettings(settings: GameSettings): WorldMapDevLayoutStore {
  return {
    mapDevLandmarkCoords: settings.mapDevLandmarkCoords,
    mapDevExtraHexes: settings.mapDevExtraHexes,
    mapDevRegionOverrides: settings.mapDevRegionOverrides,
    mapDevRegionBrush: settings.mapDevRegionBrush,
  };
}

function mapLayoutPublishError(err: unknown): OnlineAccessError {
  const code = (err as FirestoreError).code;
  if (code === "permission-denied") {
    return new OnlineAccessError(
      "Firestore denied map publish. Deploy the latest firestore.rules (firebase deploy --only firestore:rules), then connect Online once as Tim or Chris on this browser so the binding matches a dev account.",
    );
  }
  if (err instanceof Error && err.message) {
    return new OnlineAccessError(err.message);
  }
  return new OnlineAccessError("Map publish failed.");
}

/** Dev (Tim/Chris): publish shared playtest map — works from offline dev mode if browser is bound. */
export async function publishWorldMapDevLayout(
  worldId: WorldId,
  accountId: string,
  settings: GameSettings,
): Promise<WorldMapLayoutDoc> {
  if (!isDevAccount(accountId)) {
    throw new OnlineAccessError(
      "Only Tim or Chris can publish the shared world map.",
    );
  }
  await ensureFirebaseUser();
  const binding = await loadBrowserBinding(worldId);
  if (!binding) {
    throw new OnlineAccessError(
      "Publish requires a playtest binding. Open Online once and connect with your dev access key, then push again.",
    );
  }
  if (!isDevAccount(binding.accountId)) {
    throw new OnlineAccessError(
      "This browser is bound to a guest account. Open Online, connect with your Tim or Chris dev key, then push again.",
    );
  }
  if (accountId !== binding.accountId) {
    throw new OnlineAccessError(
      `Offline profile is ${accountId}, but this browser is bound to ${binding.accountId}. Match them (or reconnect Online as ${accountId}).`,
    );
  }

  const layout = storeFromSettings(settings);
  const doc: WorldMapLayoutDoc = {
    layout,
    updatedAt: Date.now(),
    updatedBy: binding.accountId,
  };
  try {
    await setDoc(
      mapLayoutRef(worldId),
      stripUndefinedDeep(doc) as Record<string, unknown>,
    );
  } catch (err) {
    throw mapLayoutPublishError(err);
  }
  writeWorldMapDevLayoutStore(layout);
  return doc;
}

export async function loadWorldMapDevLayout(
  worldId: WorldId = "dev",
): Promise<WorldMapLayoutDoc | null> {
  await ensureFirebaseUser();
  const snap = await getDoc(mapLayoutRef(worldId));
  if (!snap.exists()) return null;
  return parseWorldMapLayoutDoc(snap.data() as Record<string, unknown>);
}

export function subscribeWorldMapDevLayout(
  worldId: WorldId,
  onLayout: (doc: WorldMapLayoutDoc | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    mapLayoutRef(worldId),
    (snap) => {
      if (!snap.exists()) {
        onLayout(null);
        return;
      }
      onLayout(
        parseWorldMapLayoutDoc(snap.data() as Record<string, unknown>),
      );
    },
    (err) => onError?.(err),
  );
}

export function applyWorldMapLayoutDocToLocalCache(doc: WorldMapLayoutDoc): void {
  writeWorldMapDevLayoutStore(doc.layout);
}

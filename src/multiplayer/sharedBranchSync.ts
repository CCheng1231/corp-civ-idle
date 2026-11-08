import {
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { branchSitePadIndex } from "../game/branchSites";
import type { EstablishedBranchSite, GameState } from "../game/types";
import { stripUndefinedDeep } from "./companySave";
import { getDb } from "./firebase";
import type { WorldId } from "./types";
import { sharedBranchesRef } from "./worldDocs";

export interface SharedBranchesDoc {
  sites: EstablishedBranchSite[];
  worldBranchNameSeq: number;
  updatedAt: number;
}

export function branchSiteOccupancyKey(site: EstablishedBranchSite): string {
  const pad = branchSitePadIndex(site);
  if (site.hexKey) return `open:${site.hexKey}:${pad}`;
  if (site.commercialLotId) return `lot:${site.commercialLotId}:${pad}`;
  return `unknown:${site.name}:${pad}`;
}

function parseBranchSite(raw: unknown): EstablishedBranchSite | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name : "";
  if (!name) return null;
  const site: EstablishedBranchSite = {
    name,
    officeSpaceBase: Number(row.officeSpaceBase ?? 12),
  };
  if (typeof row.commercialLotId === "string") {
    site.commercialLotId = row.commercialLotId as EstablishedBranchSite["commercialLotId"];
  }
  if (typeof row.hexKey === "string") site.hexKey = row.hexKey;
  if (row.slotIndex != null) site.slotIndex = Number(row.slotIndex);
  if (row.padIndex != null) site.padIndex = Number(row.padIndex);
  if (typeof row.ownerPlayerId === "string") {
    site.ownerPlayerId = row.ownerPlayerId;
  }
  if (row.establishedAt != null) site.establishedAt = Number(row.establishedAt);
  if (row.closingStartedAt === null || typeof row.closingStartedAt === "number") {
    site.closingStartedAt = row.closingStartedAt as number | null;
  }
  if (!site.hexKey && !site.commercialLotId) return null;
  return site;
}

export function parseSharedBranchesDoc(
  raw: Record<string, unknown> | undefined,
): SharedBranchesDoc | null {
  if (!raw) return null;
  const updatedAt = Number(raw.updatedAt ?? 0);
  if (!Number.isFinite(updatedAt) || updatedAt < 0) return null;
  const worldBranchNameSeq = Math.max(1, Number(raw.worldBranchNameSeq ?? 1));
  const sites = Array.isArray(raw.sites)
    ? raw.sites.flatMap((entry) => {
        const site = parseBranchSite(entry);
        return site ? [site] : [];
      })
    : [];
  return { sites, worldBranchNameSeq, updatedAt };
}

export function mergeSharedBranchSites(
  remote: EstablishedBranchSite[],
  local: EstablishedBranchSite[],
): EstablishedBranchSite[] {
  const byKey = new Map<string, EstablishedBranchSite>();
  for (const site of remote) {
    byKey.set(branchSiteOccupancyKey(site), site);
  }
  for (const site of local) {
    byKey.set(branchSiteOccupancyKey(site), site);
  }
  return [...byKey.values()];
}

export async function loadSharedBranches(
  worldId: WorldId = "dev",
): Promise<SharedBranchesDoc | null> {
  const snap = await getDoc(sharedBranchesRef(worldId));
  if (!snap.exists()) return null;
  return parseSharedBranchesDoc(snap.data() as Record<string, unknown>);
}

export function subscribeSharedBranches(
  worldId: WorldId,
  onChange: (doc: SharedBranchesDoc | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    sharedBranchesRef(worldId),
    (snap) => {
      if (!snap.exists()) {
        onChange({ sites: [], worldBranchNameSeq: 1, updatedAt: 0 });
        return;
      }
      onChange(
        parseSharedBranchesDoc(snap.data() as Record<string, unknown>),
      );
    },
    (err) => onError?.(err),
  );
}

/** Push world branch occupancy (merged with remote by pad key). */
export async function saveSharedBranches(
  worldId: WorldId,
  payload: Pick<SharedBranchesDoc, "sites" | "worldBranchNameSeq">,
): Promise<number> {
  const updatedAt = Date.now();
  await runTransaction(getDb(), async (tx) => {
    const ref = sharedBranchesRef(worldId);
    const snap = await tx.get(ref);
    const remote = snap.exists()
      ? parseSharedBranchesDoc(snap.data() as Record<string, unknown>)
      : { sites: [], worldBranchNameSeq: 1, updatedAt: 0 };
    const mergedSites = mergeSharedBranchSites(
      remote?.sites ?? [],
      payload.sites,
    );
    const worldBranchNameSeq = Math.max(
      remote?.worldBranchNameSeq ?? 1,
      payload.worldBranchNameSeq,
    );
    tx.set(
      ref,
      stripUndefinedDeep({
        sites: mergedSites,
        worldBranchNameSeq,
        updatedAt,
      }) as Record<string, unknown>,
    );
  });
  return updatedAt;
}

/** One-time: merge legacy per-account `branchSites` from a private save blob into shared world. */
export async function upliftPrivateBranchesToShared(
  worldId: WorldId,
  remote: Record<string, unknown> | undefined,
  branchesDoc: SharedBranchesDoc | null,
): Promise<SharedBranchesDoc | null> {
  if (!remote || !Array.isArray(remote.branchSites)) return branchesDoc;
  const remoteSites = remote.branchSites.flatMap((entry) => {
    const site = parseBranchSite(entry);
    return site ? [site] : [];
  });
  if (remoteSites.length === 0) return branchesDoc;
  const merged = mergeSharedBranchSites(branchesDoc?.sites ?? [], remoteSites);
  if (
    merged.length === (branchesDoc?.sites.length ?? 0) &&
    (branchesDoc?.sites.length ?? 0) > 0
  ) {
    return branchesDoc;
  }
  const worldBranchNameSeq = Math.max(
    branchesDoc?.worldBranchNameSeq ?? 1,
    Number(remote.worldBranchNameSeq ?? 1),
  );
  const updatedAt = await saveSharedBranches(worldId, {
    sites: merged,
    worldBranchNameSeq,
  });
  return { sites: merged, worldBranchNameSeq, updatedAt };
}

export function applySharedBranchesToGameState(
  state: GameState,
  doc: SharedBranchesDoc | null | undefined,
): GameState {
  if (!doc) return state;
  if (
    state.branchSites === doc.sites &&
    state.worldBranchNameSeq === doc.worldBranchNameSeq
  ) {
    return state;
  }
  return {
    ...state,
    branchSites: doc.sites,
    worldBranchNameSeq: doc.worldBranchNameSeq,
  };
}

export async function resetSharedBranches(worldId: WorldId = "dev"): Promise<void> {
  await setDoc(
    sharedBranchesRef(worldId),
    stripUndefinedDeep({
      sites: [],
      worldBranchNameSeq: 1,
      updatedAt: Date.now(),
    }) as Record<string, unknown>,
  );
}

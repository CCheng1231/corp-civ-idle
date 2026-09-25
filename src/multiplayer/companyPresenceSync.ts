import { getDocs, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { branchSiteCoord } from "../game/mapWorld";
import type { GameState, AxialCoord } from "../game/types";
import {
  canonicalCompanyPresence,
  canonicalCompanyPresenceMap,
  playerHqCoord,
  presenceHqNeedsRepair,
} from "./playerHq";
import type { CompanyPresence, OnlineSession, WorldId } from "./types";
import { accountDisplayName, isValidOnlineAccountId } from "./types";
import { companiesCol, companyRef, WORLD_ID } from "./worldDocs";

export function presenceFromState(
  session: OnlineSession,
  state: GameState,
): CompanyPresence {
  return {
    accountId: session.accountId,
    displayName: accountDisplayName(session.accountId, session.displayName),
    hqCoord: playerHqCoord(session.accountId),
    branchSites: state.branchSites.map((site) => ({
      coord: branchSiteCoord(site),
      name: site.name
})),
    lastSeenAt: Date.now()
};
}

function parseAxialCoord(raw: unknown): AxialCoord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const q = Number(row.q);
  const r = Number(row.r);
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}

export function parseCompanyPresence(
  docId: string,
  raw: Record<string, unknown>,
): CompanyPresence | null {
  const rawAccount =
    typeof raw.accountId === "string"
      ? raw.accountId
      : typeof raw.playerId === "string"
        ? raw.playerId
        : docId;
  if (!isValidOnlineAccountId(rawAccount)) return null;
  const accountId = rawAccount;

  const hqCoord = parseAxialCoord(raw.hqCoord) ?? { q: 0, r: 0 };
  const branchSites = Array.isArray(raw.branchSites)
    ? raw.branchSites.flatMap((entry) => {
        const row = entry as Record<string, unknown>;
        const coord = parseAxialCoord(row.coord);
        if (!coord) return [];
        return [
          {
            coord,
            name: typeof row.name === "string" ? row.name : ""
},
        ];
      })
    : [];

  return {
    accountId,
    displayName:
      typeof raw.displayName === "string"
        ? raw.displayName
        : accountDisplayName(accountId),
    hqCoord,
    branchSites,
    lastSeenAt: Number(raw.lastSeenAt ?? 0)
};
}

export async function repairCompanyPresenceDoc(
  accountId: string,
  worldId: WorldId,
  presence: CompanyPresence,
): Promise<void> {
  if (!presenceHqNeedsRepair(presence)) return;
  await setDoc(
    companyRef(accountId, worldId),
    canonicalCompanyPresence(presence),
  );
}

/** Rewrite any stale HQ coords in Firestore (dev world). */
export async function repairStaleCompanyPresences(
  worldId: WorldId = WORLD_ID,
): Promise<void> {
  const snap = await getDocs(companiesCol(worldId));
  await Promise.all(
    snap.docs.map(async (d) => {
      const parsed = parseCompanyPresence(d.id, d.data() as Record<string, unknown>);
      if (!parsed) return;
      await repairCompanyPresenceDoc(parsed.accountId, worldId, parsed);
    }),
  );
}

export async function upsertCompanyPresence(
  session: OnlineSession,
  state: GameState,
): Promise<void> {
  await setDoc(
    companyRef(session.accountId, session.worldId),
    presenceFromState(session, state),
  );
}

export function subscribeCompanies(
  session: OnlineSession,
  onChange: (presence: Record<string, CompanyPresence>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    companiesCol(session.worldId),
    (snap) => {
      const map: Record<string, CompanyPresence> = {};
      for (const d of snap.docs) {
        const parsed = parseCompanyPresence(
          d.id,
          d.data() as Record<string, unknown>,
        );
        if (!parsed) continue;
        map[parsed.accountId] = parsed;
        if (presenceHqNeedsRepair(parsed)) {
          void repairCompanyPresenceDoc(
            parsed.accountId,
            session.worldId,
            parsed,
          ).catch((err) =>
            console.error("Repair company presence failed", err),
          );
        }
      }
      onChange(canonicalCompanyPresenceMap(map));
    },
    (err) => onError(err),
  );
}

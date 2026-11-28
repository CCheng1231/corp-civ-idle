import { secretaryById, SECRETARY_IDS } from "./secretaryData";
import { structureOfficeIds } from "./structureBalance";
import type { GameState, OfficeLocationId, SecretaryId } from "./types";

export function ownedOfficeIds(
  state: Pick<GameState, "structureLevelsByLocation">,
): OfficeLocationId[] {
  return structureOfficeIds(state.structureLevelsByLocation);
}

export function isOwnedOffice(
  state: Pick<GameState, "structureLevelsByLocation">,
  officeId: OfficeLocationId,
): boolean {
  return ownedOfficeIds(state).includes(officeId);
}

/** Where this secretary is posted; relocation overrides Secretary Stat default. */
export function secretaryPostedOffice(
  state: Pick<GameState, "secretaryPostedOffice" | "structureLevelsByLocation">,
  secretaryId: SecretaryId,
): OfficeLocationId {
  const override = state.secretaryPostedOffice?.[secretaryId];
  const fallback = secretaryById(secretaryId).officeId;
  const candidate = override ?? fallback;
  if (isOwnedOffice(state, candidate)) return candidate;
  if (isOwnedOffice(state, fallback)) return fallback;
  return "hq";
}

export function normalizeSecretaryPostedOffice(
  raw: unknown,
  structureLevelsByLocation: GameState["structureLevelsByLocation"],
): Partial<Record<SecretaryId, OfficeLocationId>> {
  const ctx = { structureLevelsByLocation, secretaryPostedOffice: {} };
  const out: Partial<Record<SecretaryId, OfficeLocationId>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of SECRETARY_IDS) {
    const val = (raw as Record<string, unknown>)[id];
    if (typeof val !== "string") continue;
    const officeId = val as OfficeLocationId;
    if (!isOwnedOffice(ctx, officeId)) continue;
    out[id] = officeId;
  }
  return out;
}
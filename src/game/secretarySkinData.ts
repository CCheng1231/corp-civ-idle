import type { SecretaryId } from "./types";
import nurse01 from "../assets/Secretary_skins/nurse/Secretary_01_Nurse.jpg";
import nurse02 from "../assets/Secretary_skins/nurse/Secretary_02_Nurse.jpg";
import nurse03 from "../assets/Secretary_skins/nurse/Secretary_03_Nurse.jpg";
import nurse04 from "../assets/Secretary_skins/nurse/Secretary_04_Nurse.jpg";
import nurse05 from "../assets/Secretary_skins/nurse/Secretary_05_Nurse.jpg";

/** Unlockable skin id (excludes implicit default look). */
export type SecretaryUnlockableSkinId = "nurse" | "skin_02" | "skin_03" | "skin_04";

export const SECRETARY_UNLOCKABLE_SKIN_IDS: SecretaryUnlockableSkinId[] = [
  "nurse",
  "skin_02",
  "skin_03",
  "skin_04",
];

export interface SecretarySkinCatalogEntry {
  id: SecretaryUnlockableSkinId;
  label: string;
  description: string;
  passiveBonusLabel?: string;
  /** False = placeholder in catalogue until content ships. */
  unlockable: boolean;
}

export const SECRETARY_SKIN_CATALOG: SecretarySkinCatalogEntry[] = [
  {
    id: "nurse",
    label: "Field nurse",
    description: "Clinical wardrobe variant with light field-team perks.",
    passiveBonusLabel:
      "Team lead: hospital jobs complete 1% faster when this skin is equipped.",
    unlockable: true,
  },
  {
    id: "skin_02",
    label: "Coming soon",
    description: "Additional wardrobe — not yet available.",
    unlockable: false,
  },
  {
    id: "skin_03",
    label: "Coming soon",
    description: "Additional wardrobe — not yet available.",
    unlockable: false,
  },
  {
    id: "skin_04",
    label: "Coming soon",
    description: "Additional wardrobe — not yet available.",
    unlockable: false,
  },
];

const NURSE_PORTRAIT_SRC: Record<SecretaryId, string> = {
  secretary_01: nurse01,
  secretary_02: nurse02,
  secretary_03: nurse03,
  secretary_04: nurse04,
  secretary_05: nurse05,
};

export function secretarySkinPortraitSrc(
  skinId: SecretaryUnlockableSkinId,
  secretaryId: SecretaryId,
): string | null {
  if (skinId === "nurse") return NURSE_PORTRAIT_SRC[secretaryId] ?? null;
  return null;
}

export function secretarySkinCatalogEntry(
  id: SecretaryUnlockableSkinId,
): SecretarySkinCatalogEntry {
  const found = SECRETARY_SKIN_CATALOG.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown secretary skin: ${id}`);
  return found;
}
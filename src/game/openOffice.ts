import type {
  AxialCoord,
  BranchOfficeSlotSize,
  DevOpenOfficeHex,
  DevOpenOfficePad,
  GameSettings,
  ResourceCost,
} from "./types";

export function axialKey(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseAxialKey(key: string): AxialCoord | null {
  const sep = key.indexOf(",");
  if (sep <= 0) return null;
  const q = Number(key.slice(0, sep));
  const r = Number(key.slice(sep + 1));
  if (!Number.isFinite(q) || !Number.isFinite(r)) return null;
  return { q, r };
}

export function tierLabel(tier: BranchOfficeSlotSize, padIndex: number): string {
  const tierName =
    tier === "compact"
      ? "Compact"
      : tier === "standard"
        ? "Standard"
        : "Campus";
  return `${tierName} · Pad ${padIndex + 1}`;
}

export function defaultOpenOfficePad(
  tier: BranchOfficeSlotSize = "standard",
  _padIndex = 0,
): DevOpenOfficePad {
  const officeSpaceBase =
    tier === "compact" ? 8 : tier === "campus" ? 16 : 12;
  const cash = tier === "compact" ? 2000 : tier === "campus" ? 6000 : 4000;
  return {
    tier,
    officeSpaceBase,
    openingCost: { cash, supply: 0 },
  };
}

export function normalizeOpenOfficeHex(hex: DevOpenOfficeHex): DevOpenOfficeHex {
  const pads = hex.pads.slice(0, 4).map((pad, index) => ({
    ...defaultOpenOfficePad(pad.tier ?? "standard", index),
    ...pad,
    label: pad.label?.trim() || tierLabel(pad.tier ?? "standard", index),
  }));
  return { pads };
}

export function openOfficeHexAt(
  settings: GameSettings | undefined,
  coord: AxialCoord,
): DevOpenOfficeHex | null {
  const key = axialKey(coord);
  const raw = settings?.mapDevOpenOffices?.[key];
  if (!raw || !raw.pads?.length) return null;
  return normalizeOpenOfficeHex(raw);
}

export function allOpenOfficeHexKeys(settings: GameSettings | undefined): string[] {
  if (!settings?.mapDevOpenOffices) return [];
  return Object.keys(settings.mapDevOpenOffices).filter(
    (key) => (settings.mapDevOpenOffices?.[key]?.pads?.length ?? 0) > 0,
  );
}

export function padOpeningCost(pad: DevOpenOfficePad): ResourceCost {
  return { ...pad.openingCost };
}

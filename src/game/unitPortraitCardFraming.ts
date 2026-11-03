import type { UnitId } from "./types";

/** Bottom-anchored portrait strip tuning on Recruit roster cards. */
export interface UnitPortraitCardFraming {
  imgHeightPercent: number;
  imgScale: number;
}

/** Keep in sync with `docs/unit-portrait-review/unit-wire-defaults.js`. */
export const UNIT_PORTRAIT_CARD_FRAMING_DEFAULT: UnitPortraitCardFraming = {
  imgHeightPercent: 152,
  imgScale: 1.1,
};

/** Per-unit tweaks for default roster skins (Pass 2 wire). */
export const UNIT_PORTRAIT_CARD_FRAMING: Partial<
  Record<UnitId, Partial<UnitPortraitCardFraming>>
> = {
  mall_cop: { imgHeightPercent: 158, imgScale: 1.14 },
  call_center_veteran: { imgScale: 1.06 },
  ex_bouncer: { imgScale: 1.12 },
  data_entry_snoop: { imgHeightPercent: 148, imgScale: 1.05 },
  janitor: { imgHeightPercent: 156 },
  branch_manager: { imgScale: 1.08 },
};

/** Overrides when player picks alternate skins in Secretary → Roaster. */
export const UNIT_PORTRAIT_SKIN_FRAMING: Partial<
  Record<UnitId, Partial<Record<string, Partial<UnitPortraitCardFraming>>>>
> = {
  part_timer: {
    "p2-v4": { imgHeightPercent: 148, imgScale: 1.15 },
  },
  office_clerk: {
    "p2-v4": { imgHeightPercent: 148, imgScale: 1.15 },
  },
};

export function unitPortraitCardFraming(
  unitId: UnitId,
  skinId: string | null,
): UnitPortraitCardFraming {
  const merged: UnitPortraitCardFraming = {
    ...UNIT_PORTRAIT_CARD_FRAMING_DEFAULT,
    ...UNIT_PORTRAIT_CARD_FRAMING[unitId],
  };
  if (skinId) {
    const skin = UNIT_PORTRAIT_SKIN_FRAMING[unitId]?.[skinId];
    if (skin) {
      return { ...merged, ...skin };
    }
  }
  return merged;
}

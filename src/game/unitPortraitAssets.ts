import type { GameSettings, UnitId } from "./types";

import fgP2V1 from "../assets/reference/unit-portraits/p2-fresh-grad-v1-clumsy-dark.png";
import fgP2V2 from "../assets/reference/unit-portraits/p2-fresh-grad-v2-sleepy-chroma.png";
import fgP2V3 from "../assets/reference/unit-portraits/p2-fresh-grad-v3-tryhard-dark.png";
import fgP2V4 from "../assets/reference/unit-portraits/p2-fresh-grad-v4-coffee-runner-chroma.png";

import ptP2V1 from "../assets/reference/unit-portraits/p2-part-timer-v1-carefree-dark.png";
import ptP2V2 from "../assets/reference/unit-portraits/p2-part-timer-v2-female-carefree-dark.png";
import ptP2V3 from "../assets/reference/unit-portraits/p2-part-timer-v3-clockout-chroma.png";
import ptP2V4 from "../assets/reference/unit-portraits/p2-part-timer-v4-reframed.png";

import ocP2V1 from "../assets/reference/unit-portraits/p2-office-clerk-v1-chill-dark.png";
import ocP2V2 from "../assets/reference/unit-portraits/p2-office-clerk-v2-clipboard-chroma.png";
import ocP2V4 from "../assets/reference/unit-portraits/p2-office-clerk-v4-reframed.png";

import ccvP2V1 from "../assets/reference/unit-portraits/p2-call-center-v1-operator-dark.png";
import ccvP2V2 from "../assets/reference/unit-portraits/p2-call-center-v2-mute-chroma.png";
import ccvP1V2Clean from "../assets/reference/unit-portraits/call-center-veteran-v2-bust-satire.png";

export interface UnitPortraitSkinOption {
  id: string;
  label: string;
  src: string;
}

/** Pass 2 skin options per unit (shown in Secretary -> Roaster -> Unit skins). */
export const UNIT_PORTRAIT_SKINS: Partial<
  Record<UnitId, UnitPortraitSkinOption[]>
> = {
  fresh_graduate: [
    { id: "p2-v2", label: "P2-V2 · Sleepy Intern", src: fgP2V2 },
    { id: "p2-v1", label: "P2-V1 · Clumsy Rookie", src: fgP2V1 },
    { id: "p2-v3", label: "P2-V3 · Day-1 Tryhard", src: fgP2V3 },
    { id: "p2-v4", label: "P2-V4 · Coffee Runner", src: fgP2V4 },
  ],
  part_timer: [
    { id: "p2-v2", label: "P2-V2 · Carefree Windbreaker", src: ptP2V2 },
    { id: "p2-v1", label: "P2-V1 · Carefree Courier", src: ptP2V1 },
    { id: "p2-v3", label: "P2-V3 · Clocking Out", src: ptP2V3 },
    { id: "p2-v4", label: "P2-V4 · Classic Carefree", src: ptP2V4 },
  ],
  office_clerk: [
    { id: "p2-v1", label: "P2-V1 · Chill Dossier", src: ocP2V1 },
    { id: "p2-v2", label: "P2-V2 · Desk & Mug", src: ocP2V2 },
    { id: "p2-v4", label: "P2-V4 · Reframed Classic", src: ocP2V4 },
  ],
  call_center_veteran: [
    { id: "p2-v1", label: "P2-V1 · Dual Headset Vet", src: ccvP2V1 },
    { id: "p2-v2", label: "P2-V2 · Mute Button Vet", src: ccvP2V2 },
    { id: "p1-v2-clean", label: "P2-V3 · Retro Operator", src: ccvP1V2Clean },
  ],
};

/** Default approved skin id per unit (Chris Oct 29, 2026). */
export const DEFAULT_UNIT_PORTRAIT_SKIN_ID: Partial<Record<UnitId, string>> = {
  fresh_graduate: "p2-v2",
  part_timer: "p2-v2",
  office_clerk: "p2-v1",
  call_center_veteran: "p2-v1",
};

export function selectedUnitPortraitSkinId(
  unitId: UnitId,
  settings?: GameSettings,
): string | null {
  const options = UNIT_PORTRAIT_SKINS[unitId];
  if (!options || options.length === 0) return null;
  const saved = settings?.unitPortraitSkins?.[unitId];
  if (saved && options.some((opt) => opt.id === saved)) {
    return saved;
  }
  return DEFAULT_UNIT_PORTRAIT_SKIN_ID[unitId] ?? options[0]!.id;
}

export function unitPortraitSrc(
  unitId: UnitId,
  settings?: GameSettings,
): string | null {
  const options = UNIT_PORTRAIT_SKINS[unitId];
  if (!options || options.length === 0) return null;
  const activeId = selectedUnitPortraitSkinId(unitId, settings);
  const found = options.find((opt) => opt.id === activeId);
  return (found ?? options[0])?.src ?? null;
}

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

import mallV1 from "../assets/reference/unit-portraits/defense/defense-mall-cop-v1-patrol-dark.png";
import mallV1Alt from "../assets/reference/unit-portraits/defense/defense-mall-cop-v1-alt-chroma.png";
import mallV2 from "../assets/reference/unit-portraits/defense/defense-mall-cop-v2-segway-satire-chroma.png";
import mallV3 from "../assets/reference/unit-portraits/defense/defense-mall-cop-v3-keys-dark.png";
import mallV4 from "../assets/reference/unit-portraits/defense/defense-mall-cop-v4-kiosk-chroma.png";

import watchV1 from "../assets/reference/unit-portraits/defense/defense-night-watch-v1-graveyard-dark.png";
import watchV2 from "../assets/reference/unit-portraits/defense/defense-night-watch-v2-flashlight-chroma.png";
import watchV3 from "../assets/reference/unit-portraits/defense/defense-night-watch-v3-desk-dark.png";
import watchV4 from "../assets/reference/unit-portraits/defense/defense-night-watch-v4-coffee-chroma.png";

import bounceV1 from "../assets/reference/unit-portraits/defense/defense-ex-bouncer-v1-intimidate-dark.png";
import bounceV2 from "../assets/reference/unit-portraits/defense/defense-ex-bouncer-v2-vip-chroma.png";
import bounceV4 from "../assets/reference/unit-portraits/defense/defense-ex-bouncer-v4-gloves-chroma.png";

import corpV1 from "../assets/reference/unit-portraits/defense/defense-corp-sec-v1-detail-dark.png";
import corpV2 from "../assets/reference/unit-portraits/defense/defense-corp-sec-v2-binders-chroma.png";
import corpV3 from "../assets/reference/unit-portraits/defense/defense-corp-sec-v3-holo-dark.png";
import corpV4 from "../assets/reference/unit-portraits/defense/defense-corp-sec-v4-shield-chroma.png";

import surfV1 from "../assets/reference/unit-portraits/intel/intel-internet-surfer-v1-monitor-chroma.png";
import surfV2 from "../assets/reference/unit-portraits/intel/intel-internet-surfer-v2-ramen-chroma.png";
import surfV3 from "../assets/reference/unit-portraits/intel/intel-internet-surfer-v3-phone-chroma.png";
import surfV4 from "../assets/reference/unit-portraits/intel/intel-internet-surfer-v4-energy-chroma.png";

import gossipV1 from "../assets/reference/unit-portraits/intel/intel-office-gossip-v1-whisper-chroma.png";
import gossipV2 from "../assets/reference/unit-portraits/intel/intel-office-gossip-v2-tea-chroma.png";
import gossipV3 from "../assets/reference/unit-portraits/intel/intel-office-gossip-v3-hallway-chroma.png";
import gossipV4 from "../assets/reference/unit-portraits/intel/intel-office-gossip-v4-sticky-chroma.png";

import stalkV1 from "../assets/reference/unit-portraits/intel/intel-linkedin-stalker-v1-profile-chroma.png";
import stalkV2 from "../assets/reference/unit-portraits/intel/intel-linkedin-stalker-v2-cutout-chroma.png";
import stalkV3 from "../assets/reference/unit-portraits/intel/intel-linkedin-stalker-v3-dualphone-chroma.png";
import stalkV4 from "../assets/reference/unit-portraits/intel/intel-linkedin-stalker-v4-binoculars-chroma.png";

import snoopV1 from "../assets/reference/unit-portraits/intel/intel-data-snoop-v1-keyboard-chroma.png";
import snoopV2 from "../assets/reference/unit-portraits/intel/intel-data-snoop-v2-splitscreen-chroma.png";
import snoopV3 from "../assets/reference/unit-portraits/intel/intel-data-snoop-v3-wrist-hud-chroma.png";
import snoopV4 from "../assets/reference/unit-portraits/intel/intel-data-snoop-v4-penmic-chroma.png";

import janV1 from "../assets/reference/unit-portraits/support/support-janitor-v1-mop-chroma.png";
import janV2 from "../assets/reference/unit-portraits/support/support-janitor-v2-cart-chroma.png";
import janV3 from "../assets/reference/unit-portraits/support/support-janitor-v3-night-chroma.png";
import janV4 from "../assets/reference/unit-portraits/support/support-janitor-v4-plant-chroma.png";

import courV1 from "../assets/reference/unit-portraits/support/support-courier-v1-helmet-chroma.png";
import courV2 from "../assets/reference/unit-portraits/support/support-courier-v2-satchel-chroma.png";
import courV3 from "../assets/reference/unit-portraits/support/support-courier-v3-radio-chroma.png";
import courV4 from "../assets/reference/unit-portraits/support/support-courier-v4-skate-chroma.png";

import leadV1 from "../assets/reference/unit-portraits/support/support-lead-v1-huddle-chroma.png";
import leadV2 from "../assets/reference/unit-portraits/support/support-lead-v2-checklist-chroma.png";
import leadV3 from "../assets/reference/unit-portraits/support/support-lead-v3-headset-chroma.png";
import leadV4 from "../assets/reference/unit-portraits/support/support-lead-v4-coffee-run-chroma.png";

import momV1 from "../assets/reference/unit-portraits/support/support-momdad-v1-thermos-chroma.png";
import momV2 from "../assets/reference/unit-portraits/support/support-momdad-v2-snack-chroma.png";
import momV3 from "../assets/reference/unit-portraits/support/support-momdad-v3-cardigan-chroma.png";
import momV4 from "../assets/reference/unit-portraits/support/support-momdad-v4-dad-chroma.png";

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
  mall_cop: [
    { id: "p1-v4", label: "P1-KEEP · Kiosk Bubble Tea", src: mallV4 },
    { id: "p2d-v1", label: "P2d-V1 · Young Mall Guard", src: mallV1 },
    { id: "p2c-v1b", label: "P2c-V1b · Ticket Pad", src: mallV1Alt },
    { id: "p2-v2", label: "P2-V2 · Food Court Map", src: mallV2 },
    { id: "p2d-v3", label: "P2d-V3 · Bucket Hat Scanner", src: mallV3 },
  ],
  night_watchman: [
    { id: "p1-v2", label: "P1-KEEP · Spotlight Onigiri", src: watchV2 },
    { id: "p2b-v1", label: "P2b-V1 · Tired Beanie", src: watchV1 },
    { id: "p2b-v3", label: "P2b-V3 · Desk Clipboard", src: watchV3 },
    { id: "p2b-v4", label: "P2b-V4 · Flood Lamp", src: watchV4 },
  ],
  ex_bouncer: [
    { id: "p2f-v1", label: "P2f-V1 · Aviators · Rope Loop", src: bounceV1 },
    { id: "p2-v2", label: "P2-V2 · Scanner Wand", src: bounceV2 },
    { id: "p2b-v4", label: "P2b-V4 · Traffic Cone Hat", src: bounceV4 },
  ],
  corporate_security: [
    { id: "p2c-v3", label: "P2c-V3 · Peaked Cap", src: corpV3 },
    { id: "p2d-v1", label: "P2d-V1 · Glasses · Tablet", src: corpV1 },
    { id: "p2-v2", label: "P2-V2 · Evidence Envelope", src: corpV2 },
    { id: "p2d-v4", label: "P2d-V4 · Cap · Arms at Sides", src: corpV4 },
  ],
  internet_surfer: [
    { id: "p1-v2", label: "P1-V2 · Ramen Tabs", src: surfV2 },
    { id: "p1-v1", label: "P1-V1 · Phone Slouch", src: surfV1 },
    { id: "p1-v3", label: "P1-V3 · Antenna Beanie", src: surfV3 },
    { id: "p1-v4", label: "P1-V4 · Cat-Ear Headset", src: surfV4 },
  ],
  office_gossip: [
    { id: "p1-v4", label: "P1-V4 · Clipboard Heart", src: gossipV4 },
    { id: "p1-v2", label: "P1-V2 · Tea Mug", src: gossipV2 },
    { id: "p1-v1", label: "P1-V1 · Whisper", src: gossipV1 },
    { id: "p1-v3", label: "P1-V3 · Binoculars", src: gossipV3 },
  ],
  linkedin_stalker: [
    { id: "p1-v1", label: "P1-V1 · Holographic Profile", src: stalkV1 },
    { id: "p1-v3", label: "P1-V3 · Dual Phones", src: stalkV3 },
    { id: "p1-v2", label: "P1-V2 · CEO Cutout", src: stalkV2 },
    { id: "p1-v4", label: "P1-V4 · Org Chart Tablet", src: stalkV4 },
  ],
  data_entry_snoop: [
    { id: "p1-v4", label: "P1-V4 · Pen + Printouts", src: snoopV4 },
    { id: "p1-v1", label: "P1-V1 · Brown Desk", src: snoopV1 },
    { id: "p1-v2", label: "P1-V2 · Reading Tablet", src: snoopV2 },
    { id: "p1-v3", label: "P1-V3 · Soft Clerk", src: snoopV3 },
  ],
  janitor: [
    { id: "p1-v1", label: "P1-V1 · Mop & Bucket", src: janV1 },
    { id: "p1-v2", label: "P1-V2 · Spray Cart", src: janV2 },
    { id: "p1-v3", label: "P1-V3 · Night Shift", src: janV3 },
    { id: "p1-v4", label: "P1-V4 · Office Plant", src: janV4 },
  ],
  bike_courier: [
    { id: "p1-v1", label: "P1-V1 · Helmet & Bag", src: courV1 },
    { id: "p1-v2", label: "P1-V2 · Parcel Satchel", src: courV2 },
    { id: "p1-v3", label: "P1-V3 · Earpiece", src: courV3 },
    { id: "p1-v4", label: "P1-V4 · Skateboard", src: courV4 },
  ],
  junior_team_lead: [
    { id: "p1-v1", label: "P1-V1 · Checklist", src: leadV1 },
    { id: "p1-v2", label: "P1-V2 · Small Board", src: leadV2 },
    { id: "p1-v3", label: "P1-V3 · Headset Wave", src: leadV3 },
    { id: "p1-v4", label: "P1-V4 · Coffee Tray", src: leadV4 },
  ],
  office_mom_dad: [
    { id: "p1-v1", label: "P1-V1 · Thermos", src: momV1 },
    { id: "p1-v2", label: "P1-V2 · Snack Tin", src: momV2 },
    { id: "p1-v3", label: "P1-V3 · Blanket", src: momV3 },
    { id: "p1-v4", label: "P1-V4 · Tea & Kit", src: momV4 },
  ],
};

/** Default approved skin id per unit (Chris Oct 29, 2026). */
export const DEFAULT_UNIT_PORTRAIT_SKIN_ID: Partial<Record<UnitId, string>> = {
  fresh_graduate: "p2-v2",
  part_timer: "p2-v2",
  office_clerk: "p2-v1",
  call_center_veteran: "p2-v1",
  mall_cop: "p1-v4",
  night_watchman: "p1-v2",
  ex_bouncer: "p2f-v1",
  corporate_security: "p2c-v3",
  internet_surfer: "p1-v2",
  office_gossip: "p1-v4",
  linkedin_stalker: "p1-v1",
  data_entry_snoop: "p1-v4",
  janitor: "p1-v1",
  bike_courier: "p1-v1",
  junior_team_lead: "p1-v1",
  office_mom_dad: "p1-v1",
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

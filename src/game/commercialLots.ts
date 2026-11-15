import {
  branchPadFromCatalog,
  normalizeCommercialLotBranchSlots,
} from "./branchCommercial";
import type { AxialCoord, CommercialLotBranchSlot, CommercialLotDefinition, CommercialLotId } from "./types";

export const COMMERCIAL_BRANCH_SLOT_TEMPLATES: CommercialLotBranchSlot[] = [
  branchPadFromCatalog("compact"),
  branchPadFromCatalog("standard"),
  branchPadFromCatalog("campus"),
];

export const COMMERCIAL_REAL_ESTATE: CommercialLotDefinition[] = [
  {
    id: "suburban_strip",
    coord: { q: 5, r: 2 },
    region: "suburban",
    label: "Suburban strip parcel",
    branchSlots: normalizeCommercialLotBranchSlots(
      COMMERCIAL_BRANCH_SLOT_TEMPLATES,
    ),
  },
  {
    id: "rural_highway",
    coord: { q: -1, r: -6 },
    region: "rural",
    label: "Rural highway frontage",
    branchSlots: normalizeCommercialLotBranchSlots(
      COMMERCIAL_BRANCH_SLOT_TEMPLATES,
    ),
  },
  {
    id: "countryside_lot",
    coord: { q: -5, r: 7 },
    region: "countryside",
    label: "Countryside lot",
    branchSlots: normalizeCommercialLotBranchSlots(
      COMMERCIAL_BRANCH_SLOT_TEMPLATES,
    ),
  },
];

export function commercialLotById(id: CommercialLotId): CommercialLotDefinition {
  const lot = COMMERCIAL_REAL_ESTATE.find((entry) => entry.id === id);
  if (!lot) throw new Error(`Unknown commercial lot ${id}`);
  return lot;
}

export function commercialLotAtCoord(
  coord: AxialCoord,
  coordEquals: (a: AxialCoord, b: AxialCoord) => boolean,
): CommercialLotId | null {
  const site = COMMERCIAL_REAL_ESTATE.find((lot) =>
    coordEquals(lot.coord, coord),
  );
  return site?.id ?? null;
}
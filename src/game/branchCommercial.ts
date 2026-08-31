import type {
  BranchOfficeSlotSize,
  BranchPadSpaceRange,
  CommercialLotBranchSlot,
  CommercialLotDefinition,
  ResourceCost,
} from "./types";

/** Max branch pads authored per commercial lot (0–4). */
export const MAX_BRANCH_PADS_PER_LOT = 4;

export interface BranchPadCatalogEntry {
  size: BranchOfficeSlotSize;
  label: string;
  officeSpace: number;
  expansionCap: number;
  openingCost: ResourceCost;
  officeSpaceRange: BranchPadSpaceRange;
  expansionCapRange: BranchPadSpaceRange;
}

/** Default pad definitions — costs and space bands tunable per size tier. */
export const BRANCH_PAD_CATALOG: Record<BranchOfficeSlotSize, BranchPadCatalogEntry> =
  {
    compact: {
      size: "compact",
      label: "Compact",
      officeSpace: 8,
      expansionCap: 12,
      openingCost: { cash: 2000 },
      officeSpaceRange: { min: 6, max: 10 },
      expansionCapRange: { min: 10, max: 14 },
    },
    standard: {
      size: "standard",
      label: "Standard",
      officeSpace: 12,
      expansionCap: 18,
      openingCost: { cash: 4000 },
      officeSpaceRange: { min: 10, max: 14 },
      expansionCapRange: { min: 16, max: 22 },
    },
    campus: {
      size: "campus",
      label: "Campus",
      officeSpace: 16,
      expansionCap: 24,
      openingCost: { cash: 6000 },
      officeSpaceRange: { min: 14, max: 18 },
      expansionCapRange: { min: 22, max: 28 },
    },
  };

export function branchPadFromCatalog(
  size: BranchOfficeSlotSize,
  overrides: Partial<CommercialLotBranchSlot> = {},
): CommercialLotBranchSlot {
  const entry = BRANCH_PAD_CATALOG[size];
  return {
    size: entry.size,
    label: entry.label,
    officeSpace: entry.officeSpace,
    expansionCap: entry.expansionCap,
    openingCost: { ...entry.openingCost },
    officeSpaceRange: { ...entry.officeSpaceRange },
    expansionCapRange: { ...entry.expansionCapRange },
    ...overrides,
  };
}

/** Normalize lot pad list to 0–4 entries (authoring guard). */
export function normalizeCommercialLotBranchSlots(
  branchSlots: CommercialLotBranchSlot[],
): CommercialLotBranchSlot[] {
  return branchSlots.slice(0, MAX_BRANCH_PADS_PER_LOT);
}

export function branchPadCountForLot(lot: CommercialLotDefinition): number {
  return normalizeCommercialLotBranchSlots(lot.branchSlots).length;
}

export function branchSlotAtLot(
  lot: CommercialLotDefinition,
  slotIndex: number,
): CommercialLotBranchSlot | undefined {
  return normalizeCommercialLotBranchSlots(lot.branchSlots)[slotIndex];
}

export function branchOpeningCostForPadOnLot(
  lot: CommercialLotDefinition,
  slotIndex: number,
): ResourceCost {
  return branchSlotAtLot(lot, slotIndex)?.openingCost ?? { cash: 0 };
}

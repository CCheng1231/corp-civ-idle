import type { StructureId, StructureLevels } from "./types";

/** HQ day-one capacity (Phase A). */
export const HQ_BASE_OFFICE_SPACE = 20;
export const HQ_BASE_POWER = 30;

/** Passive rates in state are stored as **per hour**; tick adds rate × (Δt / 3600). */
export const RATE_UNIT_LABEL = "/hr";

/** Structures at level 1 on new HQ (Phase A). */
export const HQ_START_STRUCTURE_LEVELS: Partial<Record<StructureId, number>> = {
  office_desk: 1,
  bank_account: 1,
  office_supply: 1,
  storage_room: 1,
  dept_b2b: 1,
  break_room: 1,
  social_media: 1,
  office_expansion: 1,
  power_panel: 1,
  recruitment_desk: 1,
};

export function hqStartStructureLevels(): StructureLevels {
  return {
    office_desk: 0,
    bank_account: 0,
    office_supply: 0,
    storage_room: 0,
    dept_b2b: 0,
    break_room: 0,
    social_media: 0,
    office_expansion: 0,
    power_panel: 0,
    recruitment_desk: 0,
    ...HQ_START_STRUCTURE_LEVELS,
  };
}

export function branchStartStructureLevels(): StructureLevels {
  return {
    office_desk: 0,
    bank_account: 0,
    office_supply: 0,
    storage_room: 0,
    dept_b2b: 0,
    break_room: 0,
    social_media: 0,
    office_expansion: 0,
    power_panel: 0,
    recruitment_desk: 0,
  };
}

/**
 * Phase A placeholder balance — replace from spreadsheet tab
 * "Phase A Placeholders (engine)" when filled in.
 */
export const PHASE_A_PLACEHOLDER_NOTES =
  "Per-level /hr unless noted. Holders (bank, storage) deferred to later phase.";

export const PHASE_A_PLACEHOLDER_ROWS: {
  structureId: StructureId;
  name: string;
  maxLevel: number;
  upgradeBaseCost: string;
  costScale: number;
  perLevelCashHr: number;
  perLevelSupplyHr: number;
  perLevelConnectionHr: number;
  perLevelMoodHr: number;
  perLevelRepHr: number;
  perLevelGovRepHr: number;
  officeSpacePerLevel: number;
  powerPerLevel: number;
  officeSlots: number;
}[] = [
  {
    structureId: "office_desk",
    name: "Office desk",
    maxLevel: 20,
    upgradeBaseCost: "12.5 cash, 6.25 SUP (L2 sheet ref)",
    costScale: 1.1,
    perLevelCashHr: 200,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "bank_account",
    name: "Bank account",
    maxLevel: 20,
    upgradeBaseCost: "100 cash, 50 SUP (L2 sheet ref)",
    costScale: 1.6,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "office_supply",
    name: "Office supply",
    maxLevel: 20,
    upgradeBaseCost: "TBD from sheet",
    costScale: 1.6,
    perLevelCashHr: 0,
    perLevelSupplyHr: 40,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "storage_room",
    name: "Storage Room",
    maxLevel: 20,
    upgradeBaseCost: "TBD from sheet",
    costScale: 1.6,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "dept_b2b",
    name: "Department of B2B",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.5,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 15,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "break_room",
    name: "Break room",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.5,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 25,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "social_media",
    name: "Social Media",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.5,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 8,
    perLevelMoodHr: 5,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "office_expansion",
    name: "Office Expansion",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.55,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 2,
    powerPerLevel: 0,
    officeSlots: 0,
  },
  {
    structureId: "power_panel",
    name: "Power Panel",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.8,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "recruitment_desk",
    name: "Recruitment Desk",
    maxLevel: 10,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.65,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
];

export function applyPlaceholderRatesForLevels(
  levels: StructureLevels,
  rates: import("./types").ProductionRates,
): void {
  for (const row of PHASE_A_PLACEHOLDER_ROWS) {
    const level = levels[row.structureId];
    if (level <= 0) continue;
    rates.cash += row.perLevelCashHr * level;
    rates.supply += row.perLevelSupplyHr * level;
    rates.connection += row.perLevelConnectionHr * level;
    rates.mood += row.perLevelMoodHr * level;
    rates.reputation += row.perLevelRepHr * level;
    rates.govReputation += row.perLevelGovRepHr * level;
  }
}

export function initialResourcesPhaseA(): import("./types").Resources {
  return {
    cash: 5000,
    supply: 200,
    connection: 200,
    mood: 100,
    reputation: 0,
    govReputation: 0,
  };
}

export function migrateLegacyResources(
  parsed: Partial<import("./types").Resources> & {
    money?: number;
    influence?: number;
  },
): import("./types").Resources {
  const base = initialResourcesPhaseA();
  return {
    cash: parsed.cash ?? parsed.money ?? base.cash,
    supply: parsed.supply ?? base.supply,
    connection: parsed.connection ?? parsed.influence ?? base.connection,
    mood: parsed.mood ?? base.mood,
    reputation: parsed.reputation ?? base.reputation,
    govReputation: parsed.govReputation ?? base.govReputation,
  };
}

export function normalizeResourceCost(
  cost: import("./types").ResourceCost,
): import("./types").ResourceCost {
  const c = { ...cost } as import("./types").ResourceCost & {
    money?: number;
    influence?: number;
  };
  if (c.money !== undefined && c.cash === undefined) {
    c.cash = c.money;
    delete c.money;
  }
  if (c.influence !== undefined && c.connection === undefined) {
    c.connection = c.influence;
    delete c.influence;
  }
  return c;
}

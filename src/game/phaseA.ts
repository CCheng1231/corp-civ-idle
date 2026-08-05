import type { StructureId, StructureLevels } from "./types";

/** HQ day-one capacity (Phase A — Office Concept tab). */
export const HQ_BASE_OFFICE_SPACE = 20;
export const HQ_BASE_POWER = 30;

/** Passive rates in state are stored as **per hour**; tick adds rate × (Δt / 3600). */
export const RATE_UNIT_LABEL = "/hr";

/** HQ starts with six structures at level 1 (Office Concept tab). */
export const HQ_START_STRUCTURE_LEVELS: Partial<Record<StructureId, number>> = {
  office_desk: 1,
  bank_account: 1,
  office_supply: 1,
  storage_room: 1,
  office_expansion: 1,
  power_panel: 1,
};

const ZERO_LEVELS: StructureLevels = {
  office_desk: 0,
  bank_account: 0,
  office_supply: 0,
  storage_room: 0,
  dept_b2b: 0,
  break_room: 0,
  social_media: 0,
  video_production_studio: 0,
  press_room: 0,
  company_statue: 0,
  office_expansion: 0,
  power_panel: 0,
  electricity_generator: 0,
  dept_rnd: 0,
  recruitment_desk: 0,
  mit_room: 0,
};

export function hqStartStructureLevels(): StructureLevels {
  return { ...ZERO_LEVELS, ...HQ_START_STRUCTURE_LEVELS };
}

export function branchStartStructureLevels(): StructureLevels {
  return { ...ZERO_LEVELS };
}

/** Display metadata for structure UI (costs/rates come from structureBalanceData.ts). */
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
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "bank_account",
    name: "Office Vault",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "storage_room",
    name: "Storage Room",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "break_room",
    name: "Break room",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "social_media",
    name: "Social Media",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "video_production_studio",
    name: "Video production studio",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.15,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 5,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "press_room",
    name: "Press Room",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.15,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 5,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 1,
  },
  {
    structureId: "company_statue",
    name: "Company Statue",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.15,
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
    structureId: "office_expansion",
    name: "Office Expansion",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 0,
    officeSlots: 0,
  },
  {
    structureId: "power_panel",
    name: "Electrical Panel",
    maxLevel: 20,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "electricity_generator",
    name: "Electricity Generator",
    maxLevel: 20,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.2,
    perLevelCashHr: 0,
    perLevelSupplyHr: 0,
    perLevelConnectionHr: 0,
    perLevelMoodHr: 0,
    perLevelRepHr: 0,
    perLevelGovRepHr: 0,
    officeSpacePerLevel: 0,
    powerPerLevel: 10,
    officeSlots: 1,
  },
  {
    structureId: "dept_rnd",
    name: "Department of R&D",
    maxLevel: 10,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    name: "Recruitment Desk (RD)",
    maxLevel: 10,
    upgradeBaseCost: "from sheet",
    costScale: 1,
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
    structureId: "mit_room",
    name: "MIT (Management in training) room",
    maxLevel: 10,
    upgradeBaseCost: "PLACEHOLDER",
    costScale: 1.15,
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

export function initialResourcesPhaseA(): import("./types").Resources {
  return {
    cash: 1000,
    supply: 1000,
    connection: 100,
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

import type {
  GameState,
  ProductionRates,
  Resources,
  StructureDefinition,
  ResearchDefinition,
  StructureId,
  StructureLevels,
  OfficeLocationId,
  ContractorTypeId,
  ContractorRoster,
  ContractorTypeDefinition,
  LocationSnapshot,
  ResourceCost,
  ContractorsByLocation,
  StructureQueuesByLocation,
  ProjectDefinition,
  RecruitmentJob,
} from "./types";
import {
  officeSeparationHexes,
} from "./hexLayout";
import {
  HQ_BASE_OFFICE_SPACE,
  HQ_BASE_POWER,
  hqStartStructureLevels,
  branchStartStructureLevels,
  initialResourcesPhaseA,
  PHASE_A_PLACEHOLDER_ROWS,
} from "./phaseA";
import {
  STRUCTURE_EFFECT_KIND,
  effectAtStructureLevel,
  officeSpaceBonusFromLevels,
  powerBonusFromLevels,
  recomputeProductionRates,
  structureMaxLevel,
} from "./structureBalance";
import { RESEARCH_DEFINITIONS } from "./researchData";
import {
  RECRUITMENT_TIER1_COST,
  RECRUITMENT_TIER1_LABEL,
} from "./recruitmentData";

export const SAVE_KEY = "corp-civ-idle-save-v2";
export const TICK_MS = 1000;
export const WIN_NET_WORTH = 100_000_000;
export const BASE_LOCATION_POWER = HQ_BASE_POWER;
export const BASE_OFFICE_SPACE = HQ_BASE_OFFICE_SPACE;
export const MAX_STRUCTURE_QUEUE = 2;
export const STRUCTURE_SELL_MONEY_REFUND_RATE = 0.5;
export const CONTRACTOR_TRANSFER_SEC_PER_HEX = 30;
export const RECRUIT_MS_PER_CONTRACTOR = 1000;
export const MAX_RECRUIT_BATCH = 100;

export function defaultOfficeSiteSections(): GameState["settings"]["officeSiteSections"] {
  return {
    hq: { structuresOpen: false, recruitmentOpen: false },
    branch: { structuresOpen: false, recruitmentOpen: false },
  };
}

export const OFFICE_IDS: OfficeLocationId[] = ["hq", "branch"];

export const OFFICE_LABELS: Record<OfficeLocationId, string> = {
  hq: "HQ",
  branch: "Branch Office",
};

export function emptyStructureQueues(): StructureQueuesByLocation {
  return { hq: [], branch: [] };
}

export function projectedStructureLevels(
  state: GameState,
  locationId: OfficeLocationId,
): StructureLevels {
  const levels = { ...state.structureLevelsByLocation[locationId] };
  for (const job of state.structureQueues[locationId]) {
    levels[job.structureId] += 1;
  }
  return levels;
}

export const OFFICE_EXPANSION_STRUCTURE_ID: StructureId = "office_expansion";

/** Structures shown in the per-site structure panel (office expansion is separate). */
export function structurePanelStructures(): StructureDefinition[] {
  return STRUCTURES.filter((s) => s.id !== OFFICE_EXPANSION_STRUCTURE_ID);
}

export function getStructureDefinition(structureId: StructureId): StructureDefinition {
  const def = STRUCTURES.find((s) => s.id === structureId);
  if (!def) throw new Error(`Unknown structure ${structureId}`);
  return def;
}

/** Total office space bonus from expansion level (see balance table). */
export function officeExpansionBonusSpace(levels: StructureLevels): number {
  return officeSpaceBonusFromLevels(levels);
}

export function officeSpacePerExpansionUpgrade(): number {
  const l1 = effectAtStructureLevel("office_expansion", 1);
  const l2 = effectAtStructureLevel("office_expansion", 2);
  return Math.max(0, l2 - l1);
}

export function officeSpaceUsedForLevels(levels: StructureLevels): number {
  let used = 0;
  for (const def of STRUCTURES) {
    if (levels[def.id] > 0) {
      used += def.officeSlotsWhenBuilt;
    }
  }
  return used;
}

export function officeSpaceCapacityForLevels(levels: StructureLevels): number {
  return BASE_OFFICE_SPACE + officeSpaceBonusFromLevels(levels);
}

export function isStructureQueueFull(
  state: GameState,
  locationId: OfficeLocationId,
): boolean {
  return state.structureQueues[locationId].length >= MAX_STRUCTURE_QUEUE;
}

export function contractorTransferHexDistance(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
): number {
  if (from === "branch" && !state.branchEstablished) return 0;
  if (to === "branch" && !state.branchEstablished) return 0;
  return officeSeparationHexes(from, to, state.branchCoord);
}

export function contractorTransferDurationMs(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
): number {
  const hexes = contractorTransferHexDistance(state, from, to);
  return hexes * CONTRACTOR_TRANSFER_SEC_PER_HEX * 1000;
}

export function otherOffice(officeId: OfficeLocationId): OfficeLocationId {
  return officeId === "hq" ? "branch" : "hq";
}

export function contractorsAvailableAt(
  state: GameState,
  officeId: OfficeLocationId,
  contractorType: ContractorTypeId,
): number {
  return state.contractorsByLocation[officeId][contractorType];
}

export function isStructureQueuedAt(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): boolean {
  return state.structureQueues[locationId].some(
    (job) => job.structureId === structureId,
  );
}

export function canSellStructureLevel(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): boolean {
  const level = state.structureLevelsByLocation[locationId][structureId];
  if (level <= 0) return false;
  return !isStructureQueuedAt(state, locationId, structureId);
}

export function emptyStructureLevels(): StructureLevels {
  return branchStartStructureLevels();
}

export const RESOURCE_LABELS: Record<keyof Resources, string> = {
  cash: "Cash",
  supply: "Supply",
  connection: "Connection",
  mood: "Mood",
  reputation: "REP",
  govReputation: "GREP",
};

/** Order for the top resource bar (Cash + Supply first). */
export const RESOURCE_BAR_KEYS: (keyof Resources)[] = [
  "cash",
  "supply",
  "connection",
  "mood",
  "reputation",
  "govReputation",
];

export function normalizeResourceWallet(
  resources: Partial<Resources> | undefined,
): Resources {
  const base = initialResourcesPhaseA();
  if (!resources) return { ...base };
  return {
    cash: resources.cash ?? base.cash,
    supply: resources.supply ?? base.supply,
    connection: resources.connection ?? base.connection,
    mood: resources.mood ?? base.mood,
    reputation: resources.reputation ?? base.reputation,
    govReputation: resources.govReputation ?? base.govReputation,
  };
}

export const INITIAL_RESOURCES: Resources = initialResourcesPhaseA();

export const INITIAL_RATES: ProductionRates = {
  cash: 0,
  supply: 0,
  connection: 0,
  mood: 0,
  reputation: 0,
  govReputation: 0,
};

function structureDescription(structureId: StructureId, name: string): string {
  const kind = STRUCTURE_EFFECT_KIND[structureId];
  switch (kind) {
    case "cash_per_hour":
      return "Generates Cash/hr (total at level — see balance sheet).";
    case "supply_per_hour":
      return "Generates SUP/hr (total at level).";
    case "connection_per_hour":
      return structureId === "social_media"
        ? "Generates CON/hr; Mood/hr = 5/8 of CON at same level."
        : "Generates CON/hr (total at level).";
    case "mood_per_hour":
      return "Generates Mood/hr (total at level).";
    case "cash_holding":
      return "Raises company Cash holding cap (total at level).";
    case "supply_holding":
      return "Raises company SUP holding cap (total at level).";
    case "office_space_bonus":
      return "Expand via site summary button (instant). Space bonus total at level.";
    case "power_capacity_bonus":
      return "Adds site power capacity (bonus total at level).";
    case "none":
      return structureId === "dept_rnd"
        ? "Unlocks research (R&D level gates research tree)."
        : structureId === "recruitment_desk"
          ? "Required infrastructure for contractor recruitment."
          : "Infrastructure (costs from balance sheet).";
    default:
      return name;
  }
}

export const STRUCTURES: StructureDefinition[] = PHASE_A_PLACEHOLDER_ROWS.map(
  (row) => ({
    id: row.structureId,
    name: row.name,
    description: structureDescription(row.structureId, row.name),
    maxLevel: structureMaxLevel(row.structureId),
    baseCost: { cash: 0 },
    costScale: 1,
    officeSlotsWhenBuilt: row.officeSlots,
    effects: {},
  }),
);

export const RESEARCH: ResearchDefinition[] = RESEARCH_DEFINITIONS;

export const CONTRACTOR_TYPES: ContractorTypeDefinition[] = [
  {
    id: "farming",
    role: "Resource Farming",
    flavorTitle: RECRUITMENT_TIER1_LABEL.farming,
    description:
      "Field crews sent on tower contracts. Jobs consume idle farming staff.",
    baseCost: RECRUITMENT_TIER1_COST.farming,
    moneyScalePerUnit: 0,
  },
  {
    id: "defense",
    role: "Protection / Defense",
    flavorTitle: RECRUITMENT_TIER1_LABEL.defense,
    description:
      "Guards HQ and branch offices. Each unit reduces espionage risk in Phase 2.",
    baseCost: RECRUITMENT_TIER1_COST.defense,
    moneyScalePerUnit: 0,
  },
  {
    id: "intel",
    role: "Intel Gathering",
    flavorTitle: RECRUITMENT_TIER1_LABEL.intel,
    description:
      "Scouts new leads. More intel staff unlock additional company projects.",
    baseCost: RECRUITMENT_TIER1_COST.intel,
    moneyScalePerUnit: 0,
  },
  {
    id: "support",
    role: "Support Units",
    flavorTitle: RECRUITMENT_TIER1_LABEL.support,
    description:
      "Deploy with farming crews to finish jobs faster and improve payouts.",
    baseCost: RECRUITMENT_TIER1_COST.support,
    moneyScalePerUnit: 0,
  },
];

export const PHASE_LABELS: Record<GameState["phase"], string> = {
  1: "Phase 1 — Learn the ropes (solo)",
  2: "Phase 2 — Rival bids & espionage",
  3: "Phase 3 — Companies & megaprojects",
};

export function createInitialState(now = Date.now()): GameState {
  const structureLevelsByLocation = {
    hq: hqStartStructureLevels(),
    branch: branchStartStructureLevels(),
  };
  const researchLevels = Object.fromEntries(
    RESEARCH.map((r) => [r.id, 0]),
  ) as GameState["researchLevels"];
  const contractorsByLocation: ContractorsByLocation = {
    hq: emptyContractorRoster({ farming: 2 }),
    branch: emptyContractorRoster(),
  };
  const locationStats = computeLocationStats({
    structureLevelsByLocation,
    contractorsByLocation,
    previous: undefined,
  });
  const derived = recomputeDerivedStats({
    structureLevelsByLocation,
    researchLevels,
  });

  const state: GameState = {
    resources: { ...INITIAL_RESOURCES },
    rates: derived.rates,
    netWorth: 0,
    locationStats,
    contractorsByLocation,
    contractorTransfers: [],
    recruitmentJobs: [],
    structureLevelsByLocation,
    structureQueues: emptyStructureQueues(),
    researchLevels,
    selectedOffice: "hq",
    branchEstablished: false,
    branchCoord: null,
    selectedTowerId: "metro_central",
    selectedCommercialHex: null,
    won: false,
    activeProject: null,
    completedProjects: 0,
    phase: 1,
    view: "operations",
    playerNotes: "",
    activityLog: [],
    lastTickAt: now,
    settings: {
      masterVolume: 0.6,
      musicMuted: false,
      uiScale: 1,
      notifications: true,
      ignoreTimers: false,
      officeSiteSections: defaultOfficeSiteSections(),
    },
  };

  state.netWorth = computeNetWorth(state.resources, state.locationStats);
  return state;
}

export function emptyContractorsByLocation(
  overrides: Partial<ContractorsByLocation> = {},
): ContractorsByLocation {
  return {
    hq: emptyContractorRoster(),
    branch: emptyContractorRoster(),
    ...overrides,
  };
}

export function computeLocationStats(input: {
  structureLevelsByLocation: GameState["structureLevelsByLocation"];
  contractorsByLocation: ContractorsByLocation;
  previous?: GameState["locationStats"];
}): Record<OfficeLocationId, LocationSnapshot> {
  const stats = {} as Record<OfficeLocationId, LocationSnapshot>;

  for (const officeId of OFFICE_IDS) {
    let power = BASE_LOCATION_POWER + powerBonusFromLevels(
      input.structureLevelsByLocation[officeId],
    );
    let officeSpace =
      BASE_OFFICE_SPACE +
      officeSpaceBonusFromLevels(input.structureLevelsByLocation[officeId]);
    let officeSpaceUsed = 0;

    officeSpaceUsed = officeSpaceUsedForLevels(
      input.structureLevelsByLocation[officeId],
    );

    const prevUsed = input.previous?.[officeId]?.powerUsed ?? 0;
    stats[officeId] = {
      power,
      officeSpace,
      officeSpaceUsed,
      powerUsed: Math.min(prevUsed, power),
    };
  }

  return stats;
}

export function recomputeDerivedStats(state: {
  structureLevelsByLocation: GameState["structureLevelsByLocation"];
  researchLevels: GameState["researchLevels"];
}): { rates: ProductionRates } {
  const rates = recomputeProductionRates(state);

  for (const def of RESEARCH) {
    const level = state.researchLevels[def.id];
    if (level <= 0) continue;

    if (def.effects.rates) {
      for (const [key, delta] of Object.entries(def.effects.rates)) {
        const k = key as keyof ProductionRates;
        rates[k] += (delta ?? 0) * level;
      }
    }

    if (def.effects.ratePercentPerLevel) {
      for (const [key, pct] of Object.entries(def.effects.ratePercentPerLevel)) {
        const k = key as keyof ProductionRates;
        rates[k] *= 1 + (pct ?? 0) * level;
      }
    }
  }

  return { rates };
}

/** Highest built Department of R&D level across all sites. */
export function deptRndLevel(state: GameState): number {
  return Math.max(
    state.structureLevelsByLocation.hq.dept_rnd,
    state.structureLevelsByLocation.branch.dept_rnd,
  );
}

export function totalStructureLevel(
  state: GameState,
  structureId: StructureId,
): number {
  return OFFICE_IDS.reduce(
    (sum, officeId) =>
      sum + state.structureLevelsByLocation[officeId][structureId],
    0,
  );
}

export function emptyContractorRoster(
  overrides: Partial<ContractorRoster> = {},
): ContractorRoster {
  return {
    farming: 0,
    defense: 0,
    intel: 0,
    support: 0,
    ...overrides,
  };
}

export function totalWorkforce(roster: ContractorRoster): number {
  return roster.farming + roster.defense + roster.intel + roster.support;
}

export function aggregateRoster(
  byLocation: ContractorsByLocation,
): ContractorRoster {
  const total = emptyContractorRoster();
  for (const officeId of OFFICE_IDS) {
    for (const type of Object.keys(total) as (keyof ContractorRoster)[]) {
      total[type] += byLocation[officeId][type];
    }
  }
  return total;
}

export function rosterAt(
  state: GameState,
  officeId: OfficeLocationId,
): ContractorRoster {
  return state.contractorsByLocation[officeId];
}

export function staffAtLocation(state: GameState, officeId: OfficeLocationId) {
  return totalWorkforce(state.contractorsByLocation[officeId]);
}

export function officeSpaceAvailable(snapshot: LocationSnapshot): number {
  return snapshot.officeSpace - snapshot.officeSpaceUsed;
}

export function canBuildStructure(
  state: GameState,
  locationId: OfficeLocationId,
  structureId: StructureId,
): boolean {
  const def = STRUCTURES.find((s) => s.id === structureId);
  if (!def) return false;
  const levels = projectedStructureLevels(state, locationId);
  const level = levels[structureId];
  if (level >= def.maxLevel) return false;
  const capacity = officeSpaceCapacityForLevels(levels);
  const used = officeSpaceUsedForLevels(levels);
  return used <= capacity;
}

export function powerAvailable(snapshot: LocationSnapshot): number {
  return snapshot.power - snapshot.powerUsed;
}

export function splitResourceCost(cost: ResourceCost): {
  global: Partial<Resources>;
  power: number;
} {
  const { electricity, ...global } = cost;
  return { global, power: electricity ?? 0 };
}

export function canAffordAtOffice(
  state: GameState,
  officeId: OfficeLocationId,
  cost: ResourceCost,
): boolean {
  const { global, power } = splitResourceCost(cost);
  if (!canAfford(state.resources, global)) return false;
  if (power > powerAvailable(state.locationStats[officeId])) return false;
  return true;
}

export function applyOfficeCost(
  state: GameState,
  officeId: OfficeLocationId,
  cost: ResourceCost,
): GameState {
  const { global, power } = splitResourceCost(cost);
  const next = structuredClone(state);
  next.resources = subtractCost(next.resources, global);
  if (power > 0) {
    next.locationStats[officeId].powerUsed += power;
  }
  return next;
}

export function recruitCost(
  _state: GameState,
  contractorType: ContractorTypeId,
): ResourceCost {
  const def = CONTRACTOR_TYPES.find((c) => c.id === contractorType);
  if (!def) throw new Error(`Unknown contractor type ${contractorType}`);
  return { ...def.baseCost };
}

/** Total cost to hire `count` units at the flat per-unit rate. */
export function recruitBatchCost(
  state: GameState,
  contractorType: ContractorTypeId,
  count: number,
): ResourceCost {
  if (count < 1) return {};
  const unit = recruitCost(state, contractorType);
  const total: ResourceCost = {};
  for (const [key, val] of Object.entries(unit)) {
    const k = key as keyof ResourceCost;
    total[k] = (val ?? 0) * count;
  }
  return total;
}

export function recruitmentJobsAtOffice(
  state: GameState,
  officeId: OfficeLocationId,
): RecruitmentJob[] {
  return state.recruitmentJobs.filter((j) => j.officeId === officeId);
}

export function isProjectUnlocked(
  state: GameState,
  project: ProjectDefinition,
): boolean {
  return aggregateRoster(state.contractorsByLocation).intel >=
    project.intelRequired;
}

export function supportStaffForMission(
  state: GameState,
  officeId: OfficeLocationId,
  farmingRequired: number,
): number {
  return Math.min(
    state.contractorsByLocation[officeId].support,
    farmingRequired,
  );
}

export function supportMissionBonuses(supportCount: number): {
  durationMult: number;
  payoutMult: number;
} {
  if (supportCount <= 0) return { durationMult: 1, payoutMult: 1 };
  return {
    durationMult: Math.max(0.65, 1 - 0.05 * supportCount),
    payoutMult: 1 + 0.07 * supportCount,
  };
}

export function espionageDefensePercent(defenseCount: number): number {
  return Math.min(75, defenseCount * 8);
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(value < 10 ? 1 : 0);
}

export function formatResourceCost(cost: ResourceCost): string {
  return resourceCostParts(cost)
    .map((part) => `${part.label} ${formatNumber(part.amount)}`)
    .join(" · ");
}

export interface ResourceCostPart {
  key: string;
  label: string;
  amount: number;
}

export function resourceCostParts(cost: ResourceCost): ResourceCostPart[] {
  const parts: ResourceCostPart[] = [];
  for (const [key, val] of Object.entries(cost)) {
    const amount = val ?? 0;
    if (amount <= 0) continue;
    if (key === "electricity") {
      parts.push({ key, label: "Power", amount });
      continue;
    }
    const label =
      RESOURCE_LABELS[key as keyof Resources] ??
      key.charAt(0).toUpperCase() + key.slice(1);
    parts.push({ key, label, amount });
  }
  return parts;
}

export function canAffordCostPart(
  state: GameState,
  officeId: OfficeLocationId,
  part: ResourceCostPart,
): boolean {
  if (part.key === "electricity") {
    return powerAvailable(state.locationStats[officeId]) >= part.amount;
  }
  const k = part.key as keyof Resources;
  return state.resources[k] >= part.amount;
}

/** Top resource bar — no K/M shortening; locale grouping for readability. */
export function formatResourceFull(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const n = Math.abs(value) < 1e-9 ? 0 : value;
  if (Math.abs(n - Math.round(n)) < 1e-6) {
    return Math.round(n).toLocaleString();
  }
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function canAfford(
  resources: Resources,
  cost: Partial<Resources>,
): boolean {
  return Object.entries(cost).every(([key, amount]) => {
    if (key === "electricity") return true;
    const k = key as keyof Resources;
    return resources[k] >= (amount ?? 0);
  });
}

export function subtractCost(
  resources: Resources,
  cost: Partial<Resources>,
): Resources {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(cost)) {
    if (key === "electricity") continue;
    const k = key as keyof Resources;
    next[k] = Math.max(0, next[k] - (amount ?? 0));
  }
  return next;
}

export function addResources(
  resources: Resources,
  gain: ResourceCost,
): Resources {
  const next = { ...resources };
  for (const [key, amount] of Object.entries(gain)) {
    if (key === "electricity") continue;
    const k = key as keyof Resources;
    if (k in next) next[k] += amount ?? 0;
  }
  return next;
}

export function computeNetWorth(
  resources: Resources,
  locationStats: GameState["locationStats"],
): number {
  const totalPower = OFFICE_IDS.reduce(
    (sum, id) => sum + locationStats[id].power,
    0,
  );
  return (
    resources.cash +
    resources.supply +
    totalPower * 2 +
    resources.reputation * 5 +
    resources.govReputation * 10
  );
}

export function isResearchUnlocked(
  state: GameState,
  research: ResearchDefinition,
): boolean {
  const rndRequired = research.rndLevelRequired ?? 0;
  if (rndRequired > 0 && deptRndLevel(state) < rndRequired) {
    return false;
  }
  if (!research.requires?.length) return true;
  return research.requires.every(
    (req) => state.researchLevels[req.id] >= req.minLevel,
  );
}

export function researchRequirementLabel(research: ResearchDefinition): string {
  const parts: string[] = [];
  const rndRequired = research.rndLevelRequired ?? 0;
  if (rndRequired > 0) {
    parts.push(`Department of R&D Lv ${rndRequired}`);
  }
  if (research.requires?.length) {
    for (const req of research.requires) {
      const name = RESEARCH.find((r) => r.id === req.id)?.name ?? req.id;
      parts.push(`${name} Lv ${req.minLevel}`);
    }
  }
  return parts.join(" + ");
}

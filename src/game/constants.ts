import type {
  GameState,
  ProductionRates,
  Resources,
  StructureDefinition,
  ResearchDefinition,
  ResearchId,
  ResearchCategory,
  StructureCategory,
  StructureId,
  StructureLevels,
  OfficeLocationId,
  ContractorCategoryId,
  ContractorRoster,
  ContractorTypeDefinition,
  LocationSnapshot,
  ResourceCost,
  ContractorsByLocation,
  StructureQueuesByLocation,
  ResearchQueuesByLocation,
  ResearchJob,
  ProjectDefinition,
  RecruitmentJob,
  UnitId,
  UnitRoster,
} from "./types";
import {
  branchOfficeIdForSite,
  branchSiteCoordForOffice,
  ownedOfficeIds,
} from "./branchSites";
import { axialDistance } from "./hexLayout";
import { hqCoordForState } from "../multiplayer/playerHq";
import { travelDurationMs } from "./mapTravel";
import {
  HQ_BASE_OFFICE_SPACE,
  HQ_BASE_POWER,
  hqStartStructureLevels,
  branchStartStructureLevels,
  initialResourcesPhaseA,
  PHASE_A_PLACEHOLDER_ROWS,
} from "./phaseA";
import {
  effectAtStructureLevel,
  officeSpaceBonusFromLevels,
  powerBonusFromLevels,
  recomputeProductionRates,
  structureMaxLevel,
} from "./structureBalance";
import { initializeJobPostings } from "./jobs";
import { RESEARCH_DEFINITIONS } from "./researchData";
import {
  DEFAULT_TIER1_UNIT,
  RECRUITMENT_TIER1_COST,
  RECRUITMENT_TIER1_LABEL,
  UNIT_IDS,
} from "./recruitmentData";
import {
  firmEspionageDefensePoints,
  firmIntelPoints,
  officePassiveRatesForLocation,
  transferHexBonus,
  unitDefinition,
  unitsInCategory,
} from "./unitEffects";

export const SAVE_KEY = "corp-civ-idle-save-v2";
export const TICK_MS = 1000;

/** Layout is designed at 100%. Slider range is for accessibility, not a second layout. */
export const UI_SCALE_MIN = 0.85;
export const UI_SCALE_DEFAULT = 1;
export const UI_SCALE_MAX = 1.25;

export function clampUiScale(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return UI_SCALE_DEFAULT;
  const stepped = Math.round(n / 0.05) * 0.05;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, stepped));
}
/** Max real-time seconds of passive production applied after being away. */
export const OFFLINE_CATCHUP_CAP_SEC = 24 * 60 * 60;
export const WIN_NET_WORTH = 100_000_000;
export const BASE_LOCATION_POWER = HQ_BASE_POWER;
export const BASE_OFFICE_SPACE = HQ_BASE_OFFICE_SPACE;
export const MAX_STRUCTURE_QUEUE = 2;
export const MAX_RESEARCH_QUEUE = 2;
export const MAX_RECRUIT_QUEUE = 2;
export const STRUCTURE_SELL_MONEY_REFUND_RATE = 0.5;
/** @deprecated Use TRAVEL_SEC_PER_HEX from mapTravel — same value. */
export { TRAVEL_SEC_PER_HEX as CONTRACTOR_TRANSFER_SEC_PER_HEX } from "./mapTravel";
export const RECRUIT_MS_PER_CONTRACTOR = 1000;

/** Game hours per unit (1 sec per hire from balance sheet = 1/3600 hr; game hr = real hr). */
export const RECRUIT_HOURS_PER_UNIT = RECRUIT_MS_PER_CONTRACTOR / (3600 * 1000);

/** Total game hours for a hire order. */
export function recruitmentOrderBuildTimeHours(count: number): number {
  return Math.max(1, count) * RECRUIT_HOURS_PER_UNIT;
}

/** Real-time ms for a hire order of `count` units. */
export function recruitmentOrderDurationMs(count: number): number {
  return recruitmentOrderBuildTimeHours(count) * 3600 * 1000;
}
export const MAX_RECRUIT_BATCH = 100;

export function defaultOfficeSiteSections(): GameState["settings"]["officeSiteSections"] {
  return {
    hq: { structuresOpen: false },
  };
}

export const OFFICE_IDS: OfficeLocationId[] = ["hq"];

export const OFFICE_LABELS: Record<"hq", string> = {
  hq: "HQ",
};

export function officeSiteLabel(
  state: GameState,
  officeId: OfficeLocationId,
): string {
  if (officeId === "hq") return OFFICE_LABELS.hq;
  const site = state.branchSites.find(
    (entry) => branchOfficeIdForSite(entry) === officeId,
  );
  return site?.name ?? "Branch Office";
}

export function emptyStructureQueues(): StructureQueuesByLocation {
  return { hq: [] };
}

export function emptyResearchQueues(): ResearchQueuesByLocation {
  return { hq: [] };
}

export function projectedResearchLevels(
  state: GameState,
): GameState["researchLevels"] {
  const levels = { ...state.researchLevels };
  for (const officeId of ownedOfficeIds(state)) {
    for (const job of state.researchQueues[officeId] ?? []) {
      levels[job.researchId] += 1;
    }
  }
  return levels;
}

export function researchJobsAtOffice(
  state: GameState,
  officeId: OfficeLocationId,
): ResearchJob[] {
  return state.researchQueues[officeId] ?? [];
}

export function isResearchQueued(
  state: GameState,
  researchId: ResearchId,
): boolean {
  for (const officeId of ownedOfficeIds(state)) {
    if (
      state.researchQueues[officeId]?.some(
        (job) => job.researchId === researchId,
      )
    ) {
      return true;
    }
  }
  return false;
}

/** Card copy — player-facing text from researchData (build script). */
export function researchDisplayDescription(
  research: ResearchDefinition,
): string {
  return research.description;
}

export function isResearchQueueFull(
  state: GameState,
  officeId: OfficeLocationId,
): boolean {
  return (state.researchQueues[officeId] ?? []).length >= MAX_RESEARCH_QUEUE;
}

export function isRecruitmentQueueFull(
  state: GameState,
  officeId: OfficeLocationId,
): boolean {
  return recruitmentJobsAtOffice(state, officeId).length >= MAX_RECRUIT_QUEUE;
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

export function isStructureCompletedAtSite(
  state: GameState,
  officeId: OfficeLocationId,
  structure: StructureDefinition,
): boolean {
  const level = state.structureLevelsByLocation[officeId][structure.id];
  return level >= structure.maxLevel;
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
  if (from === to) return 0;
  const hq = hqCoordForState(state);
  const coordFor = (officeId: OfficeLocationId) => {
    if (officeId === "hq") return hq;
    return branchSiteCoordForOffice(state, officeId) ?? hq;
  };
  return axialDistance(coordFor(from), coordFor(to));
}

export function contractorTransferDurationMs(
  state: GameState,
  from: OfficeLocationId,
  to: OfficeLocationId,
  unitId?: UnitId,
  count = 1,
): number {
  let hexes = contractorTransferHexDistance(state, from, to);
  hexes = Math.max(1, hexes - transferHexBonus(unitId ?? "janitor", count));
  return travelDurationMs(hexes);
}

export function otherOffice(
  state: GameState,
  officeId: OfficeLocationId,
): OfficeLocationId {
  const offices = ownedOfficeIds(state);
  if (offices.length <= 1) return "hq";
  const index = offices.indexOf(officeId);
  if (index < 0) return offices[1] ?? "hq";
  return offices[(index + 1) % offices.length];
}

export function emptyUnitRoster(
  overrides: Partial<UnitRoster> = {},
): UnitRoster {
  const roster = Object.fromEntries(
    UNIT_IDS.map((id) => [id, 0]),
  ) as UnitRoster;
  return { ...roster, ...overrides };
}

export function isLegacyCategoryRoster(value: unknown): value is ContractorRoster {
  return (
    typeof value === "object" &&
    value !== null &&
    "farming" in value &&
    !("fresh_graduate" in value)
  );
}

export function migrateLegacyCategoryRoster(
  legacy: ContractorRoster,
): UnitRoster {
  const roster = emptyUnitRoster();
  for (const category of [
    "farming",
    "defense",
    "intel",
    "support",
    "special",
  ] as ContractorCategoryId[]) {
    const count = legacy[category] ?? 0;
    if (count > 0) {
      roster[DEFAULT_TIER1_UNIT[category]] += count;
    }
  }
  return roster;
}

/** @deprecated Use emptyUnitRoster */
export function emptyContractorRoster(
  overrides: Partial<ContractorRoster> = {},
): UnitRoster {
  return migrateLegacyCategoryRoster({
    farming: 0,
    defense: 0,
    intel: 0,
    support: 0,
    special: 0,
    ...overrides,
  });
}

export function unitAvailableAt(
  state: GameState,
  officeId: OfficeLocationId,
  unitId: UnitId,
): number {
  return state.contractorsByLocation[officeId][unitId] ?? 0;
}

/** @deprecated Use unitAvailableAt */
export function contractorsAvailableAt(
  state: GameState,
  officeId: OfficeLocationId,
  category: ContractorCategoryId,
): number {
  return countInCategory(state.contractorsByLocation[officeId], category);
}

export function countInCategory(
  roster: UnitRoster,
  category: ContractorCategoryId,
): number {
  return unitsInCategory(category).reduce(
    (sum, def) => sum + (roster[def.id] ?? 0),
    0,
  );
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

/** Compact labels on the top bar. Tooltips still use `RESOURCE_LABELS`. */
export const RESOURCE_BAR_LABELS: Record<keyof Resources, string> = {
  cash: "Cash",
  supply: "Supply",
  connection: "Con",
  mood: "MD",
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

function structurePlayerDescription(structureId: StructureId): string {
  const copy: Partial<Record<StructureId, string>> = {
    office_desk:
      "Desks and workstations — your main source of Cash/hr at this site.",
    bank_account:
      "Corporate vault — raises how much Cash you can hold before gains stop.",
    office_supply:
      "Supply closets and vendors — generates SUP/hr for builds and jobs.",
    storage_room:
      "Overflow shelving — raises your SUP holding cap.",
    dept_b2b:
      "Business development floor — generates Connection/hr for outreach.",
    break_room:
      "Coffee, couches, and water-cooler talk — generates Mood/hr.",
    social_media:
      "Brand accounts and engagement — Connection/hr plus a Mood boost.",
    video_production_studio:
      "In-house filming crew — generates REP/hr for your reputation.",
    press_room:
      "Media desk and press releases — generates GREP/hr.",
    company_statue:
      "Lobby monument to your ambition — raises REP and GREP holding caps.",
    power_panel:
      "Electrical service panel — adds power capacity for builds and bids.",
    electricity_generator:
      "On-site generator bank — more power capacity once discovered.",
    dept_rnd:
      "Research department — higher levels unlock more of the tech tree.",
    recruitment_desk:
      "HR desk — required before you can queue contractor hires.",
    mit_room:
      "Management trainee program — required for senior unit recruitment.",
  };
  return copy[structureId] ?? "Office infrastructure at this site.";
}

function structureCategoryForId(structureId: StructureId): StructureCategory {
  switch (structureId) {
    case "office_desk":
    case "bank_account":
    case "office_supply":
    case "storage_room":
    case "company_statue":
      return "essentials";
    case "dept_b2b":
    case "break_room":
    case "social_media":
    case "video_production_studio":
    case "press_room":
      return "departments";
    case "power_panel":
    case "electricity_generator":
    case "dept_rnd":
      return "infrastructure";
    case "recruitment_desk":
    case "mit_room":
      return "staffing";
    default:
      return "departments";
  }
}

export const STRUCTURE_CATEGORY_ORDER = [
  "essentials",
  "departments",
  "infrastructure",
  "staffing",
] as const satisfies readonly StructureCategory[];

export const STRUCTURE_CATEGORY_LABELS: Record<StructureCategory, string> = {
  essentials: "Essentials",
  departments: "Departments",
  infrastructure: "Power & research",
  staffing: "Recruitment",
};

export const STRUCTURES: StructureDefinition[] = PHASE_A_PLACEHOLDER_ROWS.map(
  (row) => ({
    id: row.structureId,
    name: row.name,
    description: structurePlayerDescription(row.structureId),
    category: structureCategoryForId(row.structureId),
    maxLevel: structureMaxLevel(row.structureId),
    baseCost: { cash: 0 },
    costScale: 1,
    officeSlotsWhenBuilt: row.officeSlots,
    effects: {},
  }),
);

export const RESEARCH: ResearchDefinition[] = RESEARCH_DEFINITIONS;

export const RESEARCH_CATEGORY_ORDER = [
  "resources",
  "mult",
  "discover",
  "unlock",
] as const satisfies readonly ResearchCategory[];

export const RESEARCH_CATEGORY_LABELS: Record<ResearchCategory, string> = {
  resources: "Resource efficiency",
  mult: "Project payouts",
  discover: "Discover structures",
  unlock: "Operations",
};
export { RECRUITMENT_UNITS } from "./recruitmentData";

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

export function officeIdsInStructureState(
  structureLevelsByLocation: GameState["structureLevelsByLocation"],
): OfficeLocationId[] {
  return Object.keys(structureLevelsByLocation) as OfficeLocationId[];
}

export function createInitialState(now = Date.now()): GameState {
  const structureLevelsByLocation = {
    hq: hqStartStructureLevels(),
  };
  const researchLevels = Object.fromEntries(
    RESEARCH.map((r) => [r.id, 0]),
  ) as GameState["researchLevels"];
  const contractorsByLocation: ContractorsByLocation = {
    hq: emptyUnitRoster({ fresh_graduate: 2 }),
  };
  const locationStats = computeLocationStats({
    structureLevelsByLocation,
    contractorsByLocation,
    previous: undefined,
    branchSites: [],
  });
  const derived = recomputeDerivedStats({
    structureLevelsByLocation,
    contractorsByLocation,
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
    researchQueues: emptyResearchQueues(),
    researchLevels,
    selectedOffice: "hq",
    lastSelectedOffice: "hq",
    branchSites: [],
    selectedTowerId: null,
    selectedCommercialHex: null,
    won: false,
    jobPostings: initializeJobPostings(now),
    jobEngagements: [],
    completedProjects: 0,
    phase: 1,
    view: "operations",
    playerNotes: "",
    activityLog: [],
    dismissedJobReportIds: [],
    logbookFilterId: "all",
    lastTickAt: now,
    pendingOfflineSummary: null,
    pendingCompletionAlerts: [],
    recruitFocusUnitId: null,
    logbookHighlightEntryId: null,
    jobFocusPostingId: null,
    settings: {
      masterVolume: 0.1,
      musicMuted: false,
      uiScale: UI_SCALE_DEFAULT,
      notifications: true,
      alertAutoDismiss: true,
      alertAutoDismissSec: 7,
      viewportPreview: "auto",
      ignoreTimers: false,
      ignoreCosts: false,
      officeSiteSections: defaultOfficeSiteSections(),
      mapPresentation: "dev",
      mapPlayerGround: "hybrid",
      mapRegionOutlines: true,
      mapMainOffice: "hq",
    },
  };

  state.netWorth = computeNetWorth(state.resources, state.locationStats);
  return state;
}

export function emptyContractorsByLocation(
  overrides: Partial<ContractorsByLocation> = {},
): ContractorsByLocation {
  return {
    hq: emptyUnitRoster(),
    ...overrides,
  };
}

export function computeLocationStats(input: {
  structureLevelsByLocation: GameState["structureLevelsByLocation"];
  contractorsByLocation: ContractorsByLocation;
  previous?: GameState["locationStats"];
  branchSites?: GameState["branchSites"];
}): Record<OfficeLocationId, LocationSnapshot> {
  const stats = {} as Record<OfficeLocationId, LocationSnapshot>;
  const officeIds: OfficeLocationId[] = [
    "hq",
    ...(input.branchSites ?? []).map(branchOfficeIdForSite),
  ];

  for (const officeId of officeIds) {
    const levels =
      input.structureLevelsByLocation[officeId] ?? hqStartStructureLevels();
    let power = BASE_LOCATION_POWER + powerBonusFromLevels(levels);
    const spaceBonus = officeSpaceBonusFromLevels(levels);
    const site = input.branchSites?.find(
      (entry) => branchOfficeIdForSite(entry) === officeId,
    );
    let officeSpace =
      site != null
        ? site.officeSpaceBase + spaceBonus
        : BASE_OFFICE_SPACE + spaceBonus;
    let officeSpaceUsed = 0;

    officeSpaceUsed = officeSpaceUsedForLevels(levels);

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
  contractorsByLocation: ContractorsByLocation;
  researchLevels: GameState["researchLevels"];
  /** Region site bonus on structure passives; defaults to countryside HQ (0%). */
  siteRateBonusByOffice?: Partial<Record<OfficeLocationId, number>>;
}): { rates: ProductionRates } {
  const rates = recomputeProductionRates({
    ...state,
    siteRateBonusByOffice: state.siteRateBonusByOffice ?? {
      hq: 0,
    },
  });

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

  for (const officeId of Object.keys(
    state.contractorsByLocation,
  ) as OfficeLocationId[]) {
    const passive = officePassiveRatesForLocation(
      state.contractorsByLocation[officeId],
    );
    for (const [key, delta] of Object.entries(passive)) {
      const k = key as keyof ProductionRates;
      rates[k] += delta ?? 0;
    }
  }

  return { rates };
}

/** Highest built Department of R&D level across all sites. */
export function deptRndLevel(state: GameState): number {
  return Math.max(
    0,
    ...officeIdsInStructureState(state.structureLevelsByLocation).map(
      (officeId) => state.structureLevelsByLocation[officeId]?.dept_rnd ?? 0,
    ),
  );
}

export function totalStructureLevel(
  state: GameState,
  structureId: StructureId,
): number {
  return officeIdsInStructureState(state.structureLevelsByLocation).reduce(
    (sum, officeId) =>
      sum + (state.structureLevelsByLocation[officeId]?.[structureId] ?? 0),
    0,
  );
}

export function totalWorkforce(roster: UnitRoster | null | undefined): number {
  if (!roster) return 0;
  return UNIT_IDS.reduce((sum, id) => sum + (roster[id] ?? 0), 0);
}

export function aggregateCategoryRoster(
  byLocation: ContractorsByLocation,
): ContractorRoster {
  const total: ContractorRoster = {
    farming: 0,
    defense: 0,
    intel: 0,
    support: 0,
    special: 0,
  };
  for (const officeId of Object.keys(byLocation) as OfficeLocationId[]) {
    for (const category of Object.keys(total) as ContractorCategoryId[]) {
      total[category] += countInCategory(byLocation[officeId], category);
    }
  }
  return total;
}

/** @deprecated Use aggregateCategoryRoster */
export function aggregateRoster(
  byLocation: ContractorsByLocation,
): ContractorRoster {
  return aggregateCategoryRoster(byLocation);
}

export function rosterAt(
  state: GameState,
  officeId: OfficeLocationId,
): UnitRoster {
  return state.contractorsByLocation[officeId] ?? emptyUnitRoster();
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
  if (!isStructureUnlocked(state, structureId)) return false;
  const def = STRUCTURES.find((s) => s.id === structureId);
  if (!def) return false;
  const levels = projectedStructureLevels(state, locationId);
  const level = levels[structureId];
  if (level >= def.maxLevel) return false;
  const capacity = officeSpaceCapacityForLevels(levels);
  const used = officeSpaceUsedForLevels(levels);
  return used <= capacity;
}

export function researchUnlockForStructure(
  structureId: StructureId,
): ResearchDefinition | undefined {
  return RESEARCH.find((r) => r.effects.unlocksStructure === structureId);
}

export function isStructureUnlocked(
  state: GameState,
  structureId: StructureId,
): boolean {
  if (ignoreCosts(state)) return true;
  const unlockResearch = researchUnlockForStructure(structureId);
  if (!unlockResearch) return true;
  return (state.researchLevels[unlockResearch.id] ?? 0) >= 1;
}

export function structureUnlockRequirementLabel(
  structureId: StructureId,
): string | null {
  const unlockResearch = researchUnlockForStructure(structureId);
  if (!unlockResearch) return null;
  return unlockResearch.name;
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

export function ignoreCosts(state: GameState): boolean {
  return state.settings.ignoreCosts === true;
}

export function canAffordAtOffice(
  state: GameState,
  officeId: OfficeLocationId,
  cost: ResourceCost,
): boolean {
  if (ignoreCosts(state)) return true;
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
  if (ignoreCosts(state)) return structuredClone(state);
  const { global, power } = splitResourceCost(cost);
  const next = structuredClone(state);
  next.resources = subtractCost(next.resources, global);
  if (power > 0) {
    next.locationStats[officeId].powerUsed += power;
  }
  return next;
}

export function applyOfficeRefund(
  state: GameState,
  officeId: OfficeLocationId,
  refund: ResourceCost,
): GameState {
  const { global, power } = splitResourceCost(refund);
  const next = structuredClone(state);
  next.resources = addResources(next.resources, global);
  if (power > 0) {
    next.locationStats[officeId].powerUsed = Math.max(
      0,
      next.locationStats[officeId].powerUsed - power,
    );
  }
  return next;
}

export function recruitUnitCost(unitId: UnitId): ResourceCost {
  return { ...unitDefinition(unitId).cost };
}

/** @deprecated Use recruitUnitCost */
export function recruitCost(
  _state: GameState,
  category: ContractorCategoryId,
): ResourceCost {
  return { ...RECRUITMENT_TIER1_COST[category] };
}

export function recruitBatchCost(
  unitId: UnitId,
  count: number,
): ResourceCost {
  if (count < 1) return {};
  const unit = recruitUnitCost(unitId);
  const total: ResourceCost = {};
  for (const [key, val] of Object.entries(unit)) {
    const k = key as keyof ResourceCost;
    total[k] = (val ?? 0) * count;
  }
  return total;
}

/** @deprecated */
export function recruitBatchCostLegacy(
  _state: GameState,
  category: ContractorCategoryId,
  count: number,
): ResourceCost {
  if (count < 1) return {};
  const unit = RECRUITMENT_TIER1_COST[category];
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
  return firmIntelPoints(state.contractorsByLocation) >= project.intelRequired;
}

export function espionageDefensePercent(state: GameState): number {
  return firmEspionageDefensePoints(state.contractorsByLocation);
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
  if (ignoreCosts(state)) return true;
  if (part.key === "electricity") {
    return powerAvailable(state.locationStats[officeId]) >= part.amount;
  }
  const k = part.key as keyof Resources;
  return state.resources[k] >= part.amount;
}

/** Resource bar & compact UI — 1000 → 1.00k, 100000 → 100.00k */
export function formatResourceShort(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const n = Math.abs(value) < 1e-9 ? 0 : value;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)}k`;
  if (Math.abs(abs - Math.round(abs)) < 1e-6) return `${sign}${Math.round(abs)}`;
  return `${sign}${abs.toFixed(abs < 10 ? 1 : 0)}`;
}

/** Top resource bar detail / sheets — locale grouping, no shortening. */
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
  const totalPower = Object.values(locationStats).reduce(
    (sum, snapshot) => sum + snapshot.power,
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
  if (ignoreCosts(state)) return true;
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

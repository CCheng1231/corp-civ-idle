export type ResourceKey =
  | "cash"
  | "supply"
  | "connection"
  | "mood"
  | "reputation"
  | "govReputation";

export type Resources = Record<ResourceKey, number>;

export type ProductionRates = Record<ResourceKey, number>;

/** Costs may include `electricity` — spent as power at a specific office. */
export type ResourceCost = Partial<Resources & { electricity: number }>;

export type OfficeLocationId = "hq" | "branch";

export interface LocationSnapshot {
  /** Total power capacity at this site (not passive). */
  power: number;
  /** Power allocated to bids / builds. */
  powerUsed: number;
  /** Total office space capacity (for structures). */
  officeSpace: number;
  /** Office space used by built structures at this site. */
  officeSpaceUsed: number;
}

export type StructureId =
  | "office_desk"
  | "bank_account"
  | "office_supply"
  | "storage_room"
  | "dept_b2b"
  | "break_room"
  | "social_media"
  | "office_expansion"
  | "power_panel"
  | "dept_rnd"
  | "recruitment_desk";

export type StructureLevels = Record<StructureId, number>;
export type StructureLevelsByLocation = Record<
  OfficeLocationId,
  StructureLevels
>;

export interface StructureDefinition {
  id: StructureId;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: ResourceCost;
  costScale: number;
  /**
   * Office slots consumed while this structure exists (level ≥ 1).
   * Upgrades do not add slots (balance sheet: 1 space regardless of level).
   */
  officeSlotsWhenBuilt: number;
  effects: ProgressionEffects;
}

export type ResearchId =
  | "eff_manuals_cash"
  | "eff_manuals_sup"
  | "eff_manuals_con"
  | "eff_manuals_mood"
  | "eff_manuals_rep"
  | "eff_manuals_grep"
  | "planning_ahead"
  | "branch_management"
  | "bid_modeling";

export type MapRegion = "metropolis" | "suburban" | "rural" | "countryside";

export type TowerId =
  | "metro_central"
  | "suburban_park"
  | "rural_crossing"
  | "country_estate";

export interface AxialCoord {
  q: number;
  r: number;
}

export interface OfficeTowerDefinition {
  id: TowerId;
  name: string;
  coord: AxialCoord;
  region: MapRegion;
  /** Host company scale — drives hidden optimal field crew for max payout. */
  companyCrewCapacity: number;
}

export interface ProgressionEffects {
  rates?: Partial<ProductionRates>;
  ratePercentPerLevel?: Partial<Record<ResourceKey, number>>;
  storagePercentPerLevel?: number;
  bidBonus?: number;
  projectDurationMultPerLevel?: number;
  projectPayoutMultPerLevel?: number;
  officeSpacePerLevel?: number;
  powerCapacityPerLevel?: number;
}

export interface ResearchRequirement {
  id: ResearchId;
  minLevel: number;
}

export interface ResearchDefinition {
  id: ResearchId;
  name: string;
  description: string;
  maxLevel: number;
  rndLevelRequired?: number;
  baseCost: ResourceCost;
  costScale: number;
  requires?: ResearchRequirement[];
  effects: ProgressionEffects;
}

export type ProjectId = string;

export type ProjectTag = "service" | "official" | "highRisk";

export type ContractorCategoryId = "farming" | "defense" | "intel" | "support";

/** @deprecated Use ContractorCategoryId — kept for migration labels. */
export type ContractorTypeId = ContractorCategoryId;

export type UnitId =
  | "fresh_graduate"
  | "part_timer"
  | "office_clerk"
  | "call_center_veteran"
  | "mall_cop"
  | "night_watchman"
  | "ex_bouncer"
  | "corporate_security"
  | "internet_surfer"
  | "office_gossip"
  | "linkedin_stalker"
  | "data_entry_snoop"
  | "janitor"
  | "bike_courier"
  | "junior_team_lead"
  | "office_mom_dad";

export type UnitRoster = Record<UnitId, number>;

/** Units assigned to an active tower contract. */
export type UnitAssignment = Partial<Record<UnitId, number>>;

export type ContractorsByLocation = Record<OfficeLocationId, UnitRoster>;

export interface ContractorTransfer {
  id: string;
  from: OfficeLocationId;
  to: OfficeLocationId;
  unitId: UnitId;
  count: number;
  arrivesAt: number;
}

export interface RecruitmentJob {
  id: string;
  officeId: OfficeLocationId;
  unitId: UnitId;
  completesAt: number;
}

/** @deprecated Aggregate category roster — use UnitRoster. */
export type ContractorRoster = Record<ContractorCategoryId, number>;

export interface ContractorTypeDefinition {
  id: ContractorCategoryId;
  role: string;
  flavorTitle: string;
  description: string;
  baseCost: ResourceCost;
  moneyScalePerUnit: number;
}

export interface ProjectDefinition {
  id: ProjectId;
  towerId: TowerId;
  name: string;
  client: string;
  durationSec: number;
  minBid: ResourceCost;
  totalPayout: ResourceCost;
  reputationGain: number;
  /** Fraction of tower company capacity for full payout (hidden from player). */
  crewDemand: number;
  intelRequired: number;
  tags?: ProjectTag[];
}

export interface ActiveProject {
  projectId: ProjectId;
  towerId: TowerId;
  bid: ResourceCost;
  endsAt: number;
  crewAssigned: UnitAssignment;
  officeId: OfficeLocationId;
  /** Stored at job start for payout scaling (not shown in UI). */
  optimalCrew: number;
}

export interface StructureBuildJob {
  structureId: StructureId;
  /** Level after this job finishes (used for sheet build time). */
  targetLevel?: number;
  /** When the active timer started; null while waiting in queue. */
  startedAt?: number | null;
  /** null while waiting behind another job in the queue */
  completesAt: number | null;
}

export type StructureQueuesByLocation = Record<
  OfficeLocationId,
  StructureBuildJob[]
>;

export interface GameState {
  resources: Resources;
  rates: ProductionRates;
  netWorth: number;
  locationStats: Record<OfficeLocationId, LocationSnapshot>;
  contractorsByLocation: ContractorsByLocation;
  contractorTransfers: ContractorTransfer[];
  recruitmentJobs: RecruitmentJob[];
  structureLevelsByLocation: StructureLevelsByLocation;
  structureQueues: StructureQueuesByLocation;
  researchLevels: Record<ResearchId, number>;
  selectedOffice: OfficeLocationId;
  branchEstablished: boolean;
  branchCoord: AxialCoord | null;
  selectedTowerId: TowerId | null;
  selectedCommercialHex: AxialCoord | null;
  won: boolean;
  activeProject: ActiveProject | null;
  completedProjects: number;
  phase: 1 | 2 | 3;
  view: MainView;
  /** Free-form notes saved with the game. */
  playerNotes: string;
  activityLog: LogEntry[];
  lastTickAt: number;
  settings: GameSettings;
}

export interface GameSettings {
  masterVolume: number;
  musicMuted: boolean;
  uiScale: number;
  notifications: boolean;
  /** Dev: complete builds, recruitment, travel, and contracts immediately. */
  ignoreTimers: boolean;
  /** Dev: allow purchases and bids without spending resources or power. */
  ignoreCosts: boolean;
  /** Office sites: Structure upgrades / Recruitment sections expanded per site. */
  officeSiteSections: Record<
    OfficeLocationId,
    { structuresOpen: boolean; recruitmentOpen: boolean }
  >;
}

export type MainView =
  | "world"
  | "overview"
  | "operations"
  | "research"
  | "office"
  | "logbook"
  | "notes"
  | "settings";

export type LogCategory =
  | "structure_upgrade"
  | "structure_complete"
  | "structure_sell"
  | "research"
  | "recruit"
  | "transfer"
  | "transfer_arrival"
  | "bid_start"
  | "bid_complete"
  | "phase";

export interface LogEntry {
  id: string;
  at: number;
  category: LogCategory;
  summary: string;
  detail?: string;
  officeId?: OfficeLocationId;
  spent?: ResourceCost;
  gained?: ResourceCost;
  impacts?: string[];
}

export type GameAction =
  | { type: "TICK"; now: number }
  | { type: "BUY_STRUCTURE"; structureId: StructureId; locationId: OfficeLocationId }
  | { type: "DOWNGRADE_STRUCTURE"; structureId: StructureId; locationId: OfficeLocationId }
  | { type: "BUY_RESEARCH"; researchId: ResearchId }
  | { type: "SELECT_OFFICE"; officeId: OfficeLocationId }
  | { type: "SELECT_TOWER"; towerId: TowerId | null }
  | { type: "SELECT_COMMERCIAL_HEX"; coord: AxialCoord | null }
  | { type: "ESTABLISH_BRANCH"; coord?: AxialCoord | null }
  | { type: "RECRUIT_CONTRACTOR"; unitId: UnitId }
  | {
      type: "START_RECRUITMENT";
      officeId: OfficeLocationId;
      unitId: UnitId;
      count: number;
    }
  | {
      type: "START_CONTRACTOR_TRANSFER";
      from: OfficeLocationId;
      to: OfficeLocationId;
      unitId: UnitId;
      count?: number;
    }
  | {
      type: "START_PROJECT";
      projectId: ProjectId;
      bid: ResourceCost;
      crewAssigned: UnitAssignment;
    }
  | { type: "COMPLETE_PROJECT" }
  | { type: "SET_VIEW"; view: MainView }
  | { type: "UPDATE_PLAYER_NOTES"; notes: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<GameSettings> }
  | { type: "DEV_SKIP_TIME"; minutes: number }
  | { type: "LOAD"; state: GameState };

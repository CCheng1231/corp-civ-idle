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
  | "video_production_studio"
  | "press_room"
  | "company_statue"
  | "office_expansion"
  | "power_panel"
  | "electricity_generator"
  | "dept_rnd"
  | "recruitment_desk"
  | "mit_room";

export type StructureLevels = Record<StructureId, number>;
export type StructureLevelsByLocation = Record<
  OfficeLocationId,
  StructureLevels
>;

export type StructureCategory =
  | "essentials"
  | "departments"
  | "infrastructure"
  | "staffing";

export interface StructureDefinition {
  id: StructureId;
  name: string;
  description: string;
  /** Office tab section — grouped by role, not research gate. */
  category: StructureCategory;
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
  | "bid_modeling"
  | "discover_video_studio"
  | "discover_press_room"
  | "discover_company_statue"
  | "discover_electricity_generator"
  | "discover_mit_room"
  | "portfolio_management"
  | "massive_expansion";

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
  engagementCapPerLevel?: number;
  /** Extra branch office slots beyond the first (Massive Expansion). */
  branchSlotPerLevel?: number;
  /** Discover research — structure buildable after first level of this node. */
  unlocksStructure?: StructureId;
  officeSpacePerLevel?: number;
  powerCapacityPerLevel?: number;
}

export interface ResearchRequirement {
  id: ResearchId;
  minLevel: number;
}

/** Workbook Research tab type — Discover unlocks use category `discover`. */
export type ResearchCategory = "resources" | "mult" | "discover" | "unlock";

export interface ResearchDefinition {
  id: ResearchId;
  name: string;
  description: string;
  category: ResearchCategory;
  maxLevel: number;
  rndLevelRequired?: number;
  baseCost: ResourceCost;
  costScale: number;
  /** Per-level build time in game hours (Research Cost tab, column E). */
  buildTimeHoursPerLevel?: number[];
  requires?: ResearchRequirement[];
  effects: ProgressionEffects;
}

export interface ResearchJob {
  id: string;
  researchId: ResearchId;
  officeId: OfficeLocationId;
  targetLevel: number;
  startedAt?: number | null;
  completesAt: number | null;
  spentCost: ResourceCost;
}

export type ResearchQueuesByLocation = Record<OfficeLocationId, ResearchJob[]>;

export type ProjectId = string;

export type ProjectTag = "service" | "official" | "highRisk";

export type ContractorCategoryId =
  | "farming"
  | "defense"
  | "intel"
  | "support"
  | "special";

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
  | "office_mom_dad"
  | "branch_manager";

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
  /** Units in this hire order (one queue slot). */
  count: number;
  startedAt?: number | null;
  completesAt: number | null;
  spentCost: ResourceCost;
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

/** @deprecated Legacy tower contracts — migrated to job engagements. */
export type { ActiveProject as LegacyActiveProject };

export type BusinessType =
  | "theme_park"
  | "hospital"
  | "science_lab"
  | "restaurant"
  | "retail_shop"
  | "research_lab"
  | "big_corp"
  | "start_up"
  | "gov"
  | "family_business"
  | "mall_management";

export type JobTier = 1 | 2;
export type JobSize = "small" | "mid" | "huge";
export type JobPostingStatus = "open" | "completed" | "expired";
export type CompletionBand =
  | "none"
  | "minimal"
  | "in_progress"
  | "midway"
  | "almost"
  | "finishing";

export interface JobDefinition {
  id: string;
  towerId: TowerId;
  businessType: BusinessType;
  tier: JobTier;
  size: JobSize;
  title: string;
  description: string;
  /** Units on site for this many seconds per engagement, then return to office. */
  durationSec: number;
  expirationSec: number;
  /** Visible on T1 — cash earned per unit-hour of effective work. */
  cashPerUnitHour: number;
  /** Hidden total work capacity (unit-hours). */
  unitHoursTotal: number;
  bonusPercent: number;
  requiredCategory: ContractorCategoryId;
  minUnitTier: number;
  optionalIntelBoost: boolean;
  completionPayout: Partial<Resources>;
}

/** Shared tower posting — multiplayer-ready contributor ledger. */
export interface JobContributor {
  playerId: string;
  unitHours: number;
}

export interface JobPosting {
  id: string;
  definitionId: string;
  towerId: TowerId;
  spawnedAt: number;
  expiresAt: number;
  unitHoursCompleted: number;
  status: JobPostingStatus;
  contributors: JobContributor[];
}

export type JobEngagementPhase = "outbound" | "working" | "returning";

export interface JobEngagement {
  id: string;
  postingId: string;
  definitionId: string;
  towerId: TowerId;
  officeId: OfficeLocationId;
  crewAssigned: UnitAssignment;
  phase: JobEngagementPhase;
  /** Current travel leg (outbound / returning); null while working. */
  travelStartedAt: number | null;
  travelArrivesAt: number | null;
  /** Work window — set when outbound arrives. */
  startedAt: number;
  /** Work shift end — set when outbound arrives. */
  endsAt: number;
  lastAccruedAt: number;
  /** Unpaid effective earnings for this engagement (paid when shift ends or on cancel). */
  earnedSoFar: number;
  unitHoursApplied: number;
  /** True after shift pay is banked and crew is walking home. */
  shiftPaid?: boolean;
  /** Payout banked at shift end; echoed on the return-to-base log row. */
  shiftPayoutGained?: ResourceCost;
}

export interface StructureBuildJob {
  id: string;
  structureId: StructureId;
  /** Level after this job finishes (used for sheet build time). */
  targetLevel?: number;
  /** When the active timer started; null while waiting in queue. */
  startedAt?: number | null;
  /** null while waiting behind another job in the queue */
  completesAt: number | null;
  spentCost: ResourceCost;
}

export type StructureQueuesByLocation = Record<
  OfficeLocationId,
  StructureBuildJob[]
>;

/** One-shot UI payload after offline catch-up (not persisted). */
export interface OfflineWelcomeSummary {
  awaySec: number;
  gained: ResourceCost;
  structures: string[];
  research: string[];
  hires: string[];
  jobsFinished: number;
}

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
  researchQueues: ResearchQueuesByLocation;
  researchLevels: Record<ResearchId, number>;
  selectedOffice: OfficeLocationId;
  branchEstablished: boolean;
  branchCoord: AxialCoord | null;
  /** Player-renameable; default e.g. "Branch 1 @ Suburban". */
  branchName: string | null;
  selectedTowerId: TowerId | null;
  selectedCommercialHex: AxialCoord | null;
  won: boolean;
  /** @deprecated Migrated to jobEngagements on load. */
  activeProject?: ActiveProject | null;
  jobPostings: JobPosting[];
  jobEngagements: JobEngagement[];
  completedProjects: number;
  phase: 1 | 2 | 3;
  view: MainView;
  /** Free-form notes saved with the game. */
  playerNotes: string;
  activityLog: LogEntry[];
  /** Log entry ids the player dismissed from the Secretary job report box. */
  dismissedJobReportIds: string[];
  /** Active filter on Notes & logbook (LOG_FILTER_GROUPS id). */
  logbookFilterId: string;
  lastTickAt: number;
  settings: GameSettings;
  /** Shown once after load catch-up; stripped from saves. */
  pendingOfflineSummary?: OfflineWelcomeSummary | null;
  /** Live completion toasts; stripped from saves. */
  pendingCompletionAlerts?: CompletionAlert[];
  /** Scroll/highlight target on Recruitment; stripped from saves. */
  recruitFocusUnitId?: UnitId | null;
  /** Scroll/highlight target on Notes & logbook; stripped from saves. */
  logbookHighlightEntryId?: string | null;
}

export type CompletionAlertKind = "structure" | "research" | "recruitment" | "job";

export interface CompletionAlert {
  id: string;
  kind: CompletionAlertKind;
  title: string;
  /** e.g. what the queue started next, or that the queue is empty */
  detail?: string;
}

export type ViewportPreview = "auto" | "desktop" | "mobile";
export type MapPresentation = "dev" | "player";
/** Player map ground look (Google Maps–like variants in game palette). */
export type MapPlayerGround = "streets" | "terrain" | "hybrid";

export interface GameSettings {
  masterVolume: number;
  musicMuted: boolean;
  uiScale: number;
  /** Show completion toasts for structure / research / recruitment. */
  notifications: boolean;
  /** Auto-hide completion toasts after a delay. */
  alertAutoDismiss: boolean;
  /** Seconds before auto-dismiss (used when alertAutoDismiss is on). */
  alertAutoDismissSec: number;
  /** Force desktop or mobile layout for UI testing (auto = match window width). */
  viewportPreview: ViewportPreview;
  /** Dev: complete builds, recruitment, travel, and contracts immediately. */
  ignoreTimers: boolean;
  /** Dev: allow purchases and bids without spending resources or power. */
  ignoreCosts: boolean;
  /** Office sites: Structure upgrades / Recruitment sections expanded per site. */
  officeSiteSections: Record<
    OfficeLocationId,
    { structuresOpen: boolean }
  >;
  /** World map: hex developer view vs player soft-region presentation. */
  mapPresentation: MapPresentation;
  /** Player-only map ground style for A/B comparison. */
  mapPlayerGround: MapPlayerGround;
  /** Player map: show soft closed outlines around each region band. */
  mapRegionOutlines: boolean;
}

export type MainView =
  | "world"
  | "overview"
  | "operations"
  | "recruitment"
  | "research"
  | "office"
  | "logbook"
  | "settings";

export type LogCategory =
  | "structure_upgrade"
  | "structure_complete"
  | "structure_sell"
  | "structure_cancel"
  | "research"
  | "research_complete"
  | "research_cancel"
  | "recruit"
  | "recruit_cancel"
  | "transfer"
  | "transfer_arrival"
  | "bid_start"
  | "bid_complete"
  | "job_engage"
  | "job_cancel"
  | "job_complete"
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
  | { type: "BUY_RESEARCH"; researchId: ResearchId; officeId?: OfficeLocationId }
  | { type: "CANCEL_STRUCTURE_JOB"; locationId: OfficeLocationId; jobId: string }
  | { type: "CANCEL_RESEARCH_JOB"; officeId: OfficeLocationId; jobId: string }
  | { type: "CANCEL_RECRUITMENT_JOB"; jobId: string }
  | { type: "SELECT_OFFICE"; officeId: OfficeLocationId }
  | { type: "SELECT_TOWER"; towerId: TowerId | null }
  | { type: "SELECT_COMMERCIAL_HEX"; coord: AxialCoord | null }
  | { type: "ESTABLISH_BRANCH"; coord?: AxialCoord | null }
  | { type: "RENAME_BRANCH"; name: string }
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
      type: "ENGAGE_JOB";
      postingId: string;
      crewAssigned: UnitAssignment;
    }
  | { type: "CANCEL_JOB_ENGAGEMENT"; engagementId: string }
  | {
      type: "START_PROJECT";
      projectId: ProjectId;
      bid: ResourceCost;
      crewAssigned: UnitAssignment;
    }
  | { type: "COMPLETE_PROJECT" }
  | {
      type: "SET_VIEW";
      view: MainView;
      logbookFilter?: string;
      recruitFocusUnitId?: UnitId | null;
      logbookHighlightEntryId?: string | null;
    }
  | { type: "SET_LOGBOOK_FILTER"; filterId: string }
  | { type: "CLEAR_LOGBOOK_HIGHLIGHT" }
  | { type: "DISMISS_JOB_REPORT"; logEntryId: string }
  | { type: "CLEAR_ALL_JOB_REPORTS" }
  | { type: "DISMISS_OFFLINE_SUMMARY" }
  | { type: "DISMISS_COMPLETION_ALERT"; alertId: string }
  | { type: "UPDATE_PLAYER_NOTES"; notes: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<GameSettings> }
  | { type: "DEV_SKIP_TIME"; minutes: number }
  | { type: "LOAD"; state: GameState };

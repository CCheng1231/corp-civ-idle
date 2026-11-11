import type {
  CompanyPresence,
  MarketLeaderboardEntry,
  OnlineSession,
  PlayerId,
} from "../multiplayer/types";
import type { WorldMapDevLayoutStore } from "./worldMapDevLayoutStore";

export type { PlayerId };

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

export type OfficeLocationId = "hq" | `branch:${string}`;

export type OfficeSelectionId = OfficeLocationId | "all";

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
  | "dept_finance"
  | "office_supply"
  | "dept_logistics"
  | "outreach_program"
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
export type StructureLevelsByLocation = Record<string, StructureLevels>;

export type StructureCategory =
  | "essentials"
  | "departments"
  | "infrastructure"
  | "staffing";

export interface StructureDefinition {
  id: StructureId;
  name: string;
  description: string;
  /** Build tab section — grouped by role, not research gate. */
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

/** Canon Z1 major hub supertall sites (`major-hub-1` … `major-hub-6`). */
export type MajorHubId =
  | "major-hub-1"
  | "major-hub-2"
  | "major-hub-3"
  | "major-hub-4"
  | "major-hub-5"
  | "major-hub-6";

export type CommercialLotId =
  | "suburban_strip"
  | "rural_highway"
  | "countryside_lot";

export type BranchOfficeSlotSize = "compact" | "standard" | "campus";

/** Authoring band for future rolled pad space (not used at runtime yet). */
export interface BranchPadSpaceRange {
  min: number;
  max: number;
}

export interface CommercialLotBranchSlot {
  size: BranchOfficeSlotSize;
  label: string;
  /** Starting office space when this pad opens. */
  officeSpace: number;
  /** Max office space if fully expanded on this pad. */
  expansionCap: number;
  openingCost: ResourceCost;
  /** Future: roll or pick space inside this band per lot. */
  officeSpaceRange?: BranchPadSpaceRange;
  /** Future: roll or pick expansion cap inside this band per lot. */
  expansionCapRange?: BranchPadSpaceRange;
}

export interface CommercialLotDefinition {
  id: CommercialLotId;
  coord: AxialCoord;
  region: MapRegion;
  label: string;
  /** 0–4 branch pads offered at this lot (see MAX_BRANCH_PADS_PER_LOT). */
  branchSlots: CommercialLotBranchSlot[];
}

export interface EstablishedBranchSite {
  /** Legacy commercial lot id; open-office hex uses `hexKey` instead. */
  commercialLotId?: CommercialLotId;
  /** Axial key `q,r` for dev open-office pads. */
  hexKey?: string;
  slotIndex?: number;
  padIndex?: number;
  name: string;
  officeSpaceBase: number;
  ownerPlayerId?: string;
  establishedAt?: number;
  /** Owner-only close timer start (ms); pad blocked while set. */
  closingStartedAt?: number | null;
}

export interface DevOpenOfficePad {
  tier: BranchOfficeSlotSize;
  label?: string;
  officeSpaceBase: number;
  openingCost: ResourceCost;
}

export interface DevOpenOfficeHex {
  pads: DevOpenOfficePad[];
}

export type BranchEstablishmentPhase = "outbound" | "returning";

export interface BranchEstablishmentTransit {
  id: string;
  ownerPlayerId: string;
  fromOfficeId: OfficeLocationId;
  hexKey: string;
  padIndex: number;
  openingCostSpent: ResourceCost;
  /** Player-chosen name applied when the branch opens on arrival. */
  plannedBranchName?: string;
  phase?: BranchEstablishmentPhase;
  departedAt: number;
  arrivesAt: number;
}

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

export type ResearchQueuesByLocation = Record<string, ResearchJob[]>;

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

export type ContractorsByLocation = Record<string, UnitRoster>;

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
  towerId?: TowerId;
  majorHubId?: MajorHubId;
  commercialLotId?: CommercialLotId;
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
  towerId?: TowerId | null;
  majorHubId?: MajorHubId | null;
  commercialLotId?: CommercialLotId | null;
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
  towerId?: TowerId | null;
  majorHubId?: MajorHubId | null;
  commercialLotId?: CommercialLotId | null;
  officeId: OfficeLocationId;
  crewAssigned: UnitAssignment;
  /** Field team lead for this engagement (not the Chief of Staff). */
  teamLeadSecretaryId?: SecretaryId | null;
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
  /** Online: unit-hours not yet flushed to shared Firestore posting. */
  pendingSyncUnitHours?: number;
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

export type StructureQueuesByLocation = Record<string, StructureBuildJob[]>;

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
  locationStats: Record<string, LocationSnapshot>;
  contractorsByLocation: ContractorsByLocation;
  contractorTransfers: ContractorTransfer[];
  recruitmentJobs: RecruitmentJob[];
  structureLevelsByLocation: StructureLevelsByLocation;
  structureQueues: StructureQueuesByLocation;
  researchQueues: ResearchQueuesByLocation;
  researchLevels: Record<ResearchId, number>;
  selectedOffice: OfficeSelectionId;
  /** Last HQ/Branch when viewing all offices. */
  lastSelectedOffice: OfficeLocationId;
  /** Open branch offices (one per established commercial-lot pad). */
  branchSites: EstablishedBranchSite[];
  /** Branch Managers traveling to open a pad (charged on send; refund on fail). */
  branchEstablishmentTransits: BranchEstablishmentTransit[];
  /** Global branch default name sequence (Tim's branch 001). */
  worldBranchNameSeq: number;
  /** Earliest time (ms) this player may switch active office again. */
  officeSwitchAvailableAt: number;
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
  /** Home hub: COS landing vs HQ overview dashboard. */
  homePanel: HomePanel;
  /** Last Home hub destination — restored on bottom-nav Home tap. */
  homeHubResume: HomeHubResume;
  /** Secretary hub: Chief of Staff landing vs full secretary roster list. */
  secretaryPanel: SecretaryPanel;
  /** Last Secretary hub destination — restored on bottom-nav Secretary tap. */
  secretaryHubResume: SecretaryHubResume;
  /** Active Chief of Staff (Secretary roster). */
  chiefOfStaffId: SecretaryId;
  /** Owned secretaries (roster + chief / team-lead eligibility). */
  secretaryUnlocks: SecretaryUnlocks;
  /** Per-secretary level, EXP, and skill ranks. */
  secretaryProgress: Partial<Record<SecretaryId, SecretaryProgress>>;
  /** Milestone recruitment offers (gacha pool). */
  secretaryRecruitment: SecretaryRecruitmentState;
  /** Free-form notes saved with the game. */
  playerNotes: string;
  activityLog: LogEntry[];
  /** Log entry ids the player dismissed from the Secretary job report box. */
  dismissedJobReportIds: string[];
  /** Active filter on Notes & logbook (LOG_FILTER_GROUPS id). */
  logbookFilterId: string;
  /** Government Program — tutorial, executive path, calendar (private save). */
  govProgram: GovProgramState;
  lastTickAt: number;
  /** Monotonic counter — queue/build actions bump this so tick-only saves cannot clobber them. */
  persistRevision?: number;
  /** Economy/world actions bump this to trigger immediate online Firestore sync. */
  worldPersistRevision?: number;
  settings: GameSettings;
  /** Shown once after load catch-up; stripped from saves. */
  pendingOfflineSummary?: OfflineWelcomeSummary | null;
  /** Live completion toasts; stripped from saves. */
  pendingCompletionAlerts?: CompletionAlert[];
  /** Scroll/highlight target on Recruitment; stripped from saves. */
  recruitFocusUnitId?: UnitId | null;
  /** Scroll/highlight target on Structure; stripped from saves. */
  structureFocusStructureId?: StructureId | null;
  /** Scroll/highlight target on Research; stripped from saves. */
  researchFocusResearchId?: ResearchId | null;
  /** Scroll/highlight target on Notes & logbook; stripped from saves. */
  logbookHighlightEntryId?: string | null;
  /** Scroll/highlight target on Secretary job board; stripped from saves. */
  jobFocusPostingId?: string | null;
  /** Active Tim/Chris session — not persisted in offline blob. */
  onlineSession?: OnlineSession | null;
  /** Other companies on the shared map (Online). */
  companyPresence?: Record<string, CompanyPresence>;
  /** Shared world net-worth board (Secretary → Market Research). */
  marketLeaderboard?: Record<string, MarketLeaderboardEntry>;
  /** Online: posting ids this client already paid out for. */
  completedPostingPayouts?: string[];
  /** Online Firestore listener status (UI only). */
  onlineConnectionStatus?: "connecting" | "connected" | "error" | "disconnected";
  /** Online: last applied account-reset generation (must match before saving). */
  onlineResetGeneration?: number;
  /** Online: save session id from last reset/load (must match meta before saving). */
  onlineSaveSessionId?: string;
  /** Set when offline save failed to parse/migrate — blocks auto-save from overwriting the blob. */
  saveLoadFailed?: boolean;
  /** Shown once when loaded from `-backup` localStorage; stripped from saves. */
  saveRestoredFromBackup?: boolean;
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
  /** Force desktop, mobile, or a device frame for UI testing (auto = match window width). */
  viewportPreview: ViewportPreview;
  /** Dev: complete builds, recruitment, travel, and contracts immediately. */
  ignoreTimers: boolean;
  /** Dev: allow purchases and bids without spending resources or power. */
  ignoreCosts: boolean;
  /** Office sites: Structure upgrades / Recruitment sections expanded per site. */
  officeSiteSections: Record<string, { structuresOpen: boolean }>;
  /** World map: hex developer view vs player soft-region presentation. */
  mapPresentation: MapPresentation;
  /** Player-only map ground style for A/B comparison. */
  mapPlayerGround: MapPlayerGround;
  /** Player map: show soft closed outlines around each region band. */
  mapRegionOutlines: boolean;
  /** World map: distance rings and Home button anchor (HQ or a branch). */
  mapMainOffice: "hq" | "branch";
  /** Preferred office for map distance / Home focus; falls back from legacy mapMainOffice. */
  mapReferenceOfficeId?: OfficeLocationId;
  /** Z1 layer stack visibility (v0.2 filters); omitted groups default to visible. */
  mapZ1LayerFilters?: Partial<
    Record<
      "base" | "geography" | "hubs" | "roads" | "flavor",
      boolean
    >
  >;
  /** Player map: show canon world landmark art (Gov, hubs). Per-account only — does not affect other players. Default on. */
  mapShowWorldLandmarkArt?: boolean;
  /** Per-unit portrait skin id (Secretary -> Roster -> Unit skins). */
  unitPortraitSkins?: Partial<Record<UnitId, string>>;
  /** Z1 pass-1 raster: locked v5 (ship) or engine-aligned v6 draft (try). */
  mapZ1BakeVariant?: "v5" | "v6-draft";
  /** Dev: overlay pass-2 align guide on Z1 bake. */
  mapZ1AlignGuide?: boolean;
  /** Dev: drag Z1 bake over hex grid to tune alignment. */
  mapZ1AlignDrag?: boolean;
  /** Persisted Z1 bake transform (dev tuning → player view). */
  mapZ1RasterAlign?: Partial<{
    offsetX: number;
    offsetY: number;
    scale: number;
    rotationDeg: number;
  }>;
  /** v6 draft bake tuning (separate from v5 `mapZ1RasterAlign`). */
  mapZ1RasterAlignV6?: Partial<{
    offsetX: number;
    offsetY: number;
    scale: number;
    rotationDeg: number;
  }>;
  /** Dev: click map to place six major hub target positions (content pixels). */
  mapZ1PlaceMajorHubs?: boolean;
  mapZ1MajorHubMarkers?: Array<{ x: number; y: number }>;
  /** Dev: click/drag hex layout against Z1 bake. */
  mapDevHexEdit?: boolean;
  /** Dev: add hex cells outside the default MAP_RADIUS patch. */
  mapDevExtraHexes?: Array<{ q: number; r: number }>;
  /** Dev: landmark id → axial coord (see mapDevLayout.ts keys). */
  mapDevLandmarkCoords?: Record<string, { q: number; r: number }>;
  /** Dev: move landmark | create hex | paint region | open office pads */
  mapDevHexEditMode?: "move" | "create" | "region" | "open_office";
  /** Dev: authored open-office pads per axial key `q,r`. */
  mapDevOpenOffices?: Record<string, DevOpenOfficeHex>;
  /** Player map filter: highlight hexes with a free open-office pad. */
  mapFilterAvailableOpenOffices?: boolean;
  /** Dev: selected hex for open-office pad editing. */
  mapDevOpenOfficeEditTarget?: { q: number; r: number };
  /** Dev: region brush for paint mode */
  mapDevRegionBrush?: MapRegion;
  /** Dev: axialKey → region override (paint tool) */
  mapDevRegionOverrides?: Record<string, MapRegion>;
  /** Dev: selected landmark key for move mode. */
  mapDevHexEditLandmark?: string;
  /** Dev: shift entire hex grid vs Z1 bake (viewBox px). */
  mapDevGridNudge?: { dx: number; dy: number };
  /** Dev: per axial cell (axialKey) pixel offset — moves hex tile + content at q,r. */
  mapDevHexNudges?: Record<string, { dx: number; dy: number }>;
  /** Dev: last hex selected for per-cell nudge (when map click did not inspect). */
  mapDevHexNudgeTarget?: { q: number; r: number };
  /** Dev: per-landmark pixel offset (viewBox px); legacy — prefer mapDevHexNudges. */
  mapDevSiteNudges?: Record<string, { dx: number; dy: number }>;
}

export type MainView =
  | "world"
  | "overview"
  | "operations"
  | "recruitment"
  | "research"
  | "secretary"
  | "office"
  | "logbook"
  | "settings";

/** Playable secretary roster id (sheet code Secretary_XX). */
export type SecretaryId =
  | "secretary_01"
  | "secretary_02"
  | "secretary_03"
  | "secretary_04"
  | "secretary_05";

/** Chief bonus system target (Secretary Stat: Chief effect target). */
export type ChiefOfStaffEffectKind =
  | "officeProduction"
  | "jobWorkTime"
  | "recruitCost"
  | "recruitTime"
  | "travelTime";

/** Team-lead identity perk on field engagements (maps to team skill trees). */
export type TeamLeadEffectKind =
  | "travelTime"
  | "jobWorkTime"
  | "jobIncome"
  | "jobSupplyCost"
  | "jobUnitHours";

export type SecretaryUnlocks = Record<SecretaryId, boolean>;

export interface SecretaryProgress {
  level: number;
  exp: number;
  unspentSkillPoints: number;
  chiefSkillRanks: Record<
    import("./secretarySkillData").ChiefSkillNodeId,
    number
  >;
  teamLeadSkillRanks: Record<
    import("./secretarySkillData").TeamLeadSkillNodeId,
    number
  >;
}

export type SecretaryRecruitMilestoneId =
  | "recruit_first_branch"
  | "recruit_net_worth_250k"
  | "recruit_secretary_mastery";

export interface SecretaryRecruitmentOffer {
  milestoneId: SecretaryRecruitMilestoneId;
  phase: "offer" | "animating" | "revealed";
  revealedId?: SecretaryId;
}

export interface SecretaryRecruitmentState {
  completedMilestones: SecretaryRecruitMilestoneId[];
  pendingOffer: SecretaryRecruitmentOffer | null;
  offerQueue: SecretaryRecruitMilestoneId[];
}

export type SecretaryPanel =
  | "landing"
  | "roster"
  | "job"
  | "log"
  | "govProgram"
  | "marketResearch";

export type HomePanel = "landing" | "overview";

export type HomeHubResume =
  | "landing"
  | "overview"
  | "operations"
  | "recruitment"
  | "research";

export type SecretaryHubResume =
  | "landing"
  | "roster"
  | "job"
  | "log"
  | "govProgram"
  | "marketResearch";

export type GovProgramModalKind =
  | "xaihi_intro"
  | "surtr_beat"
  | "decline_growth"
  | "structure_queue_intro"
  | "structure_queue_coach"
  | "recruit_set_qty_intro"
  | "recruit_queue_intro"
  | "recruit_first_queue_coach"
  | "recruit_step_coach";

export type GovGrowthRecruitCoachPhase = "set_qty" | "pick_queue";

export type GovGrowthStructureCoachPhase = "pick_upgrade";

export interface GovProgramCalendarState {
  activeDailyQuestId: string | null;
  activeWeeklyQuestId: string | null;
  activeMonthlyQuestId: string | null;
  lastDailyClaimAt: number | null;
  lastWeeklyClaimAt: number | null;
  lastMonthlyClaimAt: number | null;
  dailyProgress: number;
  weeklyProgress: number;
  monthlyProgress: number;
}

export interface GovProgramState {
  growthDeclined: boolean;
  growthAccepted: boolean;
  growthStepId: string | null;
  growthCompletedStepIds: string[];
  charterSkipped: boolean;
  charterCompleted: boolean;
  executiveStepId: string | null;
  executiveCompletedStepIds: string[];
  lifetimeRecruits: number;
  xaihiUnlocked: boolean;
  xaihiIntroSeen: boolean;
  pendingModal: GovProgramModalKind | null;
  chiefLessonPending: boolean;
  mapSiteInspected: boolean;
  /** When set, growth steps count only actions after this replay, not older progress. */
  growthReplayAt: number | null;
  /** lifetimeRecruits at replay start. Null when not replaying. */
  growthReplayRecruitBaseline: number | null;
  /** Start of the current growth step during a replay. */
  growthStepStartedAt: number | null;
  /** Dismissed-report count when the current growth step started. */
  growthReportDismissedBaseline: number | null;
  /** In-tab coach: arrow on first affordable upgrade before queue explainer modal. */
  growthStructureCoach: GovGrowthStructureCoachPhase | null;
  growthRecruitCoach: GovGrowthRecruitCoachPhase | null;
  growthRecruitFirstQueueCoachDone: boolean;
  /** Queue job row to pulse while structure_queue_coach modal is open. */
  structureQueueCoachJobId: string | null;
  /** Step 1 stipend copy for the queue coach modal (before step may complete). */
  structureQueueCoachRewardCash: number | null;
  structureQueueCoachRewardSupply: number | null;
  structureQueueCoachRewardConnection: number | null;
  calendar: GovProgramCalendarState;
}

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
  | "phase"
  | "secretary";

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
  | { type: "SELECT_OFFICE"; officeId: OfficeSelectionId }
  | { type: "SELECT_TOWER"; towerId: TowerId | null }
  | { type: "SELECT_COMMERCIAL_HEX"; coord: AxialCoord | null }
  | {
      type: "ESTABLISH_BRANCH";
      coord?: AxialCoord | null;
      slotIndex?: number;
      branchName?: string;
    }
  | {
      type: "SEND_BRANCH_ESTABLISH";
      coord: AxialCoord;
      padIndex: number;
      fromOfficeId: OfficeLocationId;
      openingCost: ResourceCost;
      branchName?: string;
    }
  | { type: "CANCEL_BRANCH_ESTABLISHMENT"; transitId: string }
  | { type: "CANCEL_BRANCH_CLOSE"; officeId: OfficeLocationId }
  | { type: "START_BRANCH_CLOSE"; officeId: OfficeLocationId }
  | { type: "SET_ACTIVE_OFFICE"; officeId: OfficeLocationId }
  | { type: "SYNC_WORLD_BRANCHES"; branchSites: EstablishedBranchSite[]; worldBranchNameSeq: number }
  | { type: "SYNC_SHARED_WORLD_MAP_LAYOUT"; layout: WorldMapDevLayoutStore | null }
  | { type: "RENAME_BRANCH"; name: string; officeId?: OfficeLocationId }
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
      teamLeadSecretaryId?: SecretaryId | null;
    }
  | {
      type: "SECRETARY_SPEND_SKILL_POINT";
      secretaryId: SecretaryId;
      tree: "chief" | "teamLead";
      nodeId: string;
    }
  | { type: "SECRETARY_RECRUIT_DISMISS" }
  | { type: "SECRETARY_RECRUIT_COMMIT" }
  | { type: "SECRETARY_RECRUIT_ANIMATION_DONE" }
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
      structureFocusStructureId?: StructureId | null;
      researchFocusResearchId?: ResearchId | null;
      logbookHighlightEntryId?: string | null;
      jobFocusPostingId?: string | null;
    }
  | { type: "CLEAR_JOB_FOCUS" }
  | { type: "SET_LOGBOOK_FILTER"; filterId: string }
  | { type: "CLEAR_LOGBOOK_HIGHLIGHT" }
  | { type: "CLEAR_ACTIVITY_LOG" }
  | { type: "DISMISS_JOB_REPORT"; logEntryId: string }
  | { type: "CLEAR_ALL_JOB_REPORTS" }
  | { type: "SELECT_CHIEF_OF_STAFF"; secretaryId: SecretaryId }
  | { type: "SET_SECRETARY_PANEL"; panel: SecretaryPanel; logbookFilter?: string; logbookHighlightEntryId?: string | null }
  | { type: "GOV_ACCEPT_GROWTH" }
  | { type: "GOV_DECLINE_GROWTH" }
  | { type: "GOV_SKIP_CHARTER" }
  | { type: "GOV_DISMISS_MODAL" }
  | { type: "GOV_ENGAGE_CHARTER"; officeId?: OfficeLocationId }
  | { type: "GOV_CLAIM_DAILY"; now: number }
  | { type: "GOV_MAP_SITE_INSPECTED" }
  | { type: "GOV_RESET_GROWTH_TRACK" }
  | { type: "GOV_START_STRUCTURE_COACH" }
  | { type: "GOV_START_RECRUIT_COACH" }
  | { type: "GOV_ADVANCE_RECRUIT_COACH" }
  | { type: "SET_HOME_PANEL"; panel: HomePanel }
  | { type: "RESTORE_HOME_HUB" }
  | { type: "GO_HOME_LANDING" }
  | { type: "RESTORE_SECRETARY_HUB" }
  | { type: "GO_SECRETARY_LANDING" }
  | { type: "DISMISS_OFFLINE_SUMMARY" }
  | { type: "DISMISS_COMPLETION_ALERT"; alertId: string }
  | { type: "UPDATE_PLAYER_NOTES"; notes: string }
  | { type: "UPDATE_SETTINGS"; settings: Partial<GameSettings> }
  | { type: "DEV_SKIP_TIME"; minutes: number }
  | { type: "DEV_REMOVE_BRANCH"; officeId: OfficeLocationId }
  | { type: "LOAD"; state: GameState }
  | {
      type: "SYNC_SHARED_JOBS";
      jobPostings: JobPosting[];
    }
  | {
      type: "SYNC_COMPANY_PRESENCE";
      companyPresence: Record<string, CompanyPresence>;
    }
  | {
      type: "SYNC_MARKET_LEADERBOARD";
      marketLeaderboard: Record<string, MarketLeaderboardEntry>;
    }
  | { type: "SET_ONLINE_SESSION"; session: OnlineSession | null }
  | {
      type: "SET_ONLINE_CONNECTION_STATUS";
      status: GameState["onlineConnectionStatus"];
    }
  | { type: "SET_ONLINE_RESET_GENERATION"; generation: number }
  | { type: "SET_ONLINE_SAVE_SESSION"; sessionId: string | undefined }
  | { type: "ONLINE_HANDLE_COMPLETED_POSTING"; postingId: string; now: number }
  | { type: "MARK_POSTING_PAYOUT_DONE"; postingId: string }
  | { type: "CLEAR_PENDING_SYNC"; engagementId: string; hours: number };

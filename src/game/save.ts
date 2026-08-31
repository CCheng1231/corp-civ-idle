import {
  SAVE_KEY,
  createInitialState,
  emptyStructureLevels,
  emptyStructureQueues,
  emptyResearchQueues,
  OFFICE_IDS,
  recruitBatchCost,
  emptyUnitRoster,
  emptyContractorsByLocation,
  migrateLegacyCategoryRoster,
  isLegacyCategoryRoster,
  recomputeDerivedStats,
  computeNetWorth,
  computeLocationStats,
  WIN_NET_WORTH,
  staffAtLocation,
  clampUiScale,
} from "./constants";
import { DEFAULT_TIER1_UNIT, UNIT_IDS } from "./recruitmentData";
import { finalizeLoadedState } from "./engine";
import { trimSecretaryJobReports } from "./logbook";
import { applyOnlineDevRestrictions } from "../multiplayer/playerHq";
import { structureUpgradeCostForTargetLevel } from "./structureBalance";
import { initializeJobPostings, jobDefinitionById } from "./jobs";
import { MAP_BRANCH } from "./hexLayout";
import {
  commercialSiteAt,
  defaultBranchSiteName,
  siteRateBonusesForState,
} from "./mapWorld";
import {
  branchOfficeIdForSite,
  branchSiteForOfficeId,
  hasBranchOffices,
  isBranchOfficeId,
} from "./branchSites";
import {
  migrateLegacyResources,
  hqStartStructureLevels,
  branchStartStructureLevels,
} from "./phaseA";
import type {
  AxialCoord,
  GameState,
  StructureId,
  EstablishedBranchSite,
  OfficeLocationId,
  ContractorRoster,
  ContractorsByLocation,
  MainView,
  ResearchId,
  UnitId,
  UnitRoster,
  ContractorCategoryId,
  JobEngagement,
} from "./types";
import type { OnlineSession, PlayerId } from "../multiplayer/types";
import {
  offlineSaveKey,
  onlineCacheKey,
  deserializePrivateState,
  serializePrivateState,
} from "../multiplayer/companySave";

export const ALERT_AUTO_DISMISS_SEC_MIN = 2;
export const ALERT_AUTO_DISMISS_SEC_MAX = 30;
export const ALERT_AUTO_DISMISS_SEC_DEFAULT = 7;

export function clampAlertAutoDismissSec(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return ALERT_AUTO_DISMISS_SEC_DEFAULT;
  return Math.min(
    ALERT_AUTO_DISMISS_SEC_MAX,
    Math.max(ALERT_AUTO_DISMISS_SEC_MIN, Math.round(n)),
  );
}

const VALID_VIEWS = new Set<MainView>([
  "overview",
  "world",
  "operations",
  "recruitment",
  "research",
  "office",
  "logbook",
  "settings",
]);

function normalizeView(view: unknown): MainView {
  if (view === "notes") return "logbook";
  if (typeof view === "string" && VALID_VIEWS.has(view as MainView)) {
    return view as MainView;
  }
  return "operations";
}

function migrateStructureQueues(
  parsed: LegacySave,
  structureLevelsByLocation: GameState["structureLevelsByLocation"],
): GameState["structureQueues"] {
  const queues = {
    ...emptyStructureQueues(),
    ...parsed.structureQueues,
  };
  for (const officeId of OFFICE_IDS) {
    const built = { ...structureLevelsByLocation[officeId] };
    queues[officeId] = (queues[officeId] ?? []).map((job, index) => {
      let targetLevel = job.targetLevel;
      if (targetLevel == null) {
        targetLevel = built[job.structureId] + 1;
      }
      built[job.structureId] = Math.max(built[job.structureId], targetLevel);
      return {
        ...job,
        id: job.id ?? `${officeId}-${job.structureId}-${index}`,
        targetLevel,
        spentCost:
          job.spentCost ??
          structureUpgradeCostForTargetLevel(job.structureId, targetLevel),
        completesAt: job.completesAt ?? null,
      };
    });
  }
  return queues;
}

function migrateResearchQueues(parsed: LegacySave): GameState["researchQueues"] {
  return {
    ...emptyResearchQueues(),
    ...(parsed.researchQueues ?? {}),
  };
}

function migrateRecruitmentJobs(parsed: LegacySave): GameState["recruitmentJobs"] {
  return (parsed.recruitmentJobs ?? []).map((job, index) => {
    const unitId = migrateUnitId(
      (job as { unitId?: UnitId; contractorType?: ContractorCategoryId }).unitId ??
        (job as { contractorType?: ContractorCategoryId }).contractorType,
    );
    const count = Math.max(1, (job as { count?: number }).count ?? 1);
    return {
      ...job,
      id: job.id ?? `recruit-${index}-${job.officeId}`,
      unitId,
      count,
      spentCost: job.spentCost ?? recruitBatchCost(unitId, count),
      completesAt: job.completesAt ?? null,
      startedAt: job.startedAt ?? null,
    };
  });
}

type LegacySave = Omit<
  Partial<GameState>,
  "selectedOffice" | "lastSelectedOffice"
> & {
  upgradeLevels?: Record<StructureId, number>;
  structureLevels?: Record<StructureId, number>;
  contractors?: number | ContractorRoster;
  maxContractors?: number;
  branchEstablished?: boolean;
  branchCoord?: AxialCoord | null;
  branchName?: string | null;
  branchSlotIndex?: number | null;
  branchOfficeSpaceBase?: number | null;
  selectedOffice?: GameState["selectedOffice"] | "branch";
  lastSelectedOffice?: GameState["lastSelectedOffice"] | "branch";
};

const LEGACY_OFFICE_KEYS = ["hq", "branch"] as const;

const LEGACY_STRUCTURE_IDS = [
  "office_power",
  "market_research",
  "grid_upgrade",
] as const;

function isLegacyStructureSave(parsed: LegacySave): boolean {
  const check = (levels: Partial<Record<string, number>> | undefined) => {
    if (!levels) return false;
    return LEGACY_STRUCTURE_IDS.some((id) => (levels[id] ?? 0) > 0);
  };
  if (parsed.structureLevels && check(parsed.structureLevels)) return true;
  if (parsed.upgradeLevels && check(parsed.upgradeLevels)) return true;
  if (parsed.structureLevelsByLocation) {
    for (const officeId of LEGACY_OFFICE_KEYS) {
      if (check(parsed.structureLevelsByLocation[officeId])) return true;
    }
  }
  return false;
}

function migrateResearchLevels(
  parsed: LegacySave,
  base: GameState,
): GameState["researchLevels"] {
  const levels = { ...base.researchLevels };
  const old = parsed.researchLevels as Record<string, number> | undefined;
  if (!old) return levels;

  if (old.efficiency_manuals) {
    levels.eff_manuals_cash = Math.max(
      levels.eff_manuals_cash,
      old.efficiency_manuals,
    );
  }

  for (const [key, val] of Object.entries(old)) {
    if (key in levels && typeof val === "number") {
      levels[key as ResearchId] = Math.max(levels[key as ResearchId], val);
    }
  }

  return levels;
}

function migrateStructureLevels(parsed: LegacySave): GameState["structureLevelsByLocation"] {
  if (isLegacyStructureSave(parsed)) {
    return {
      hq: hqStartStructureLevels(),
      branch: branchStartStructureLevels(),
    };
  }

  const base: GameState["structureLevelsByLocation"] = {
    hq: branchStartStructureLevels(),
    branch: branchStartStructureLevels(),
  };

  if (parsed.structureLevelsByLocation) {
    for (const officeId of LEGACY_OFFICE_KEYS) {
      const incoming = parsed.structureLevelsByLocation[officeId] ?? {};
      base[officeId] = { ...base[officeId], ...incoming };
    }
    return base;
  }

  const legacy =
    parsed.structureLevels ?? parsed.upgradeLevels ?? emptyStructureLevels();
  base.hq = { ...base.hq, ...legacy };
  return base;
}

function normalizeUnitRoster(raw: unknown): UnitRoster {
  if (isLegacyCategoryRoster(raw)) {
    return migrateLegacyCategoryRoster(raw);
  }
  return {
    ...emptyUnitRoster(),
    ...(raw as Partial<UnitRoster>),
  };
}

function migrateContractors(parsed: LegacySave): ContractorsByLocation {
  if (parsed.contractorsByLocation) {
    return {
      hq: normalizeUnitRoster(parsed.contractorsByLocation.hq),
      branch: normalizeUnitRoster(parsed.contractorsByLocation.branch),
    };
  }
  if (
    parsed.contractors &&
    typeof parsed.contractors === "object" &&
    "farming" in parsed.contractors
  ) {
    return emptyContractorsByLocation({
      hq: migrateLegacyCategoryRoster(parsed.contractors),
    });
  }
  if (typeof parsed.contractors === "number") {
    return emptyContractorsByLocation({
      hq: emptyUnitRoster({
        [DEFAULT_TIER1_UNIT.farming]: parsed.contractors,
      }),
    });
  }
  return emptyContractorsByLocation({
    hq: emptyUnitRoster({ fresh_graduate: 2 }),
  });
}

function migrateUnitId(
  raw: unknown,
  fallbackCategory?: ContractorCategoryId,
): UnitId {
  if (typeof raw === "string") {
    if (UNIT_IDS.includes(raw as UnitId)) return raw as UnitId;
    if (
      raw === "farming" ||
      raw === "defense" ||
      raw === "intel" ||
      raw === "support"
    ) {
      return DEFAULT_TIER1_UNIT[raw];
    }
  }
  return DEFAULT_TIER1_UNIT[fallbackCategory ?? "farming"];
}

function migrateEngagementRow(engagement: JobEngagement): JobEngagement {
  let endsAt = engagement.endsAt;
  if (!endsAt) {
    try {
      const def = jobDefinitionById(engagement.definitionId);
      endsAt = engagement.startedAt + def.durationSec * 1000;
    } catch {
      endsAt = engagement.startedAt + 3600 * 1000;
    }
  }
  const phase = engagement.phase ?? "working";
  return {
    ...engagement,
    endsAt,
    phase,
    travelStartedAt: engagement.travelStartedAt ?? null,
    travelArrivesAt: engagement.travelArrivesAt ?? null,
    shiftPaid: engagement.shiftPaid ?? false,
  };
}

function migrateJobFields(
  parsed: LegacySave,
  now: number,
): Pick<GameState, "jobPostings" | "jobEngagements"> {
  const engagements = (parsed.jobEngagements ?? []).map(migrateEngagementRow);

  // Online private saves omit shared jobPostings — still restore task forces.
  if (engagements.length > 0) {
    return {
      jobPostings: parsed.jobPostings?.length ? parsed.jobPostings : [],
      jobEngagements: engagements,
    };
  }

  if (parsed.jobPostings?.length) {
    return {
      jobPostings: parsed.jobPostings,
      jobEngagements: [],
    };
  }

  return {
    jobPostings: initializeJobPostings(now),
    jobEngagements: [],
  };
}

function migrateBranchFields(
  parsed: LegacySave,
  merged: GameState,
): Pick<GameState, "branchSites" | "selectedTowerId" | "selectedCommercialHex"> {
  if (Array.isArray(parsed.branchSites) && parsed.branchSites.length > 0) {
    return {
      branchSites: parsed.branchSites as EstablishedBranchSite[],
      selectedTowerId: null,
      selectedCommercialHex: parsed.selectedCommercialHex ?? null,
    };
  }

  let branchEstablished = parsed.branchEstablished;
  if (branchEstablished === undefined) {
    const legacyBranch = merged.structureLevelsByLocation.branch;
    branchEstablished =
      Boolean(legacyBranch) ||
      staffAtLocation(merged, "branch" as OfficeLocationId) > 0 ||
      parsed.selectedOffice === "branch";
  }

  if (!branchEstablished) {
    return {
      branchSites: [],
      selectedTowerId: null,
      selectedCommercialHex: parsed.selectedCommercialHex ?? null,
    };
  }

  const branchCoord = parsed.branchCoord ?? MAP_BRANCH;
  const commercial = commercialSiteAt(branchCoord);
  const commercialLotId =
    commercial?.id ??
    ("suburban_strip" as EstablishedBranchSite["commercialLotId"]);
  const slotIndex =
    typeof parsed.branchSlotIndex === "number" ? parsed.branchSlotIndex : 1;
  const site: EstablishedBranchSite = {
    commercialLotId,
    slotIndex,
    name:
      typeof parsed.branchName === "string" && parsed.branchName.trim()
        ? parsed.branchName.trim().slice(0, 48)
        : defaultBranchSiteName(commercialLotId, slotIndex, 1),
    officeSpaceBase:
      typeof parsed.branchOfficeSpaceBase === "number"
        ? parsed.branchOfficeSpaceBase
        : commercial?.branchSlots[slotIndex]?.officeSpace ?? 12,
  };
  const officeId = branchOfficeIdForSite(site);

  if (merged.structureLevelsByLocation.branch) {
    merged.structureLevelsByLocation[officeId] =
      merged.structureLevelsByLocation.branch;
    delete merged.structureLevelsByLocation.branch;
  }
  if (merged.contractorsByLocation.branch) {
    merged.contractorsByLocation[officeId] = merged.contractorsByLocation.branch;
    delete merged.contractorsByLocation.branch;
  }
  if (merged.structureQueues.branch) {
    merged.structureQueues[officeId] = merged.structureQueues.branch;
    delete merged.structureQueues.branch;
  }
  if (merged.researchQueues.branch) {
    merged.researchQueues[officeId] = merged.researchQueues.branch;
    delete merged.researchQueues.branch;
  }

  return {
    branchSites: [site],
    selectedTowerId: null,
    selectedCommercialHex: parsed.selectedCommercialHex ?? null,
  };
}

function normalizeSave(parsed: LegacySave): GameState {
  const base = createInitialState();
  const now = Date.now();
  const rawSelectedOffice = parsed.selectedOffice;
  const rawLastSelectedOffice = parsed.lastSelectedOffice;
  const structureLevelsByLocation = migrateStructureLevels(parsed);
  const researchLevels = migrateResearchLevels(parsed, base);
  const contractorsByLocation = migrateContractors(parsed);

  const merged: GameState = {
    ...base,
    ...parsed,
    resources: migrateLegacyResources({
      ...parsed.resources,
      cash: parsed.resources?.cash,
      money: (parsed.resources as { money?: number } | undefined)?.money,
      supply: parsed.resources?.supply,
      connection: parsed.resources?.connection,
      influence: (parsed.resources as { influence?: number } | undefined)
        ?.influence,
      mood: parsed.resources?.mood,
      reputation: parsed.resources?.reputation,
      govReputation: parsed.resources?.govReputation,
    }),
    settings: {
      ...base.settings,
      ...parsed.settings,
      uiScale: clampUiScale(parsed.settings?.uiScale ?? base.settings.uiScale),
      notifications: parsed.settings?.notifications ?? true,
      alertAutoDismiss: parsed.settings?.alertAutoDismiss ?? true,
      alertAutoDismissSec: clampAlertAutoDismissSec(
        parsed.settings?.alertAutoDismissSec,
      ),
      viewportPreview:
        parsed.settings?.viewportPreview === "mobile" ||
        parsed.settings?.viewportPreview === "desktop" ||
        parsed.settings?.viewportPreview === "auto"
          ? parsed.settings.viewportPreview
          : parsed.settings?.viewportPreview === "galaxy-s24"
            ? "mobile"
            : "auto",
      officeSiteSections: {
        hq: {
          structuresOpen:
            parsed.settings?.officeSiteSections?.hq?.structuresOpen ?? false,
        },
      },
      mapPresentation:
        parsed.settings?.mapPresentation === "player" ||
        parsed.settings?.mapPresentation === "dev"
          ? parsed.settings.mapPresentation
          : "dev",
      mapPlayerGround:
        parsed.settings?.mapPlayerGround === "streets" ||
        parsed.settings?.mapPlayerGround === "terrain" ||
        parsed.settings?.mapPlayerGround === "hybrid"
          ? parsed.settings.mapPlayerGround
          : "hybrid",
      mapRegionOutlines: parsed.settings?.mapRegionOutlines ?? true,
      mapMainOffice:
        parsed.settings?.mapMainOffice === "branch" &&
        (parsed.branchEstablished ?? (parsed.branchSites?.length ?? 0) > 0)
          ? "branch"
          : "hq",
    },
    structureLevelsByLocation,
    structureQueues: migrateStructureQueues(parsed, structureLevelsByLocation),
    researchQueues: migrateResearchQueues(parsed),
    researchLevels,
    contractorsByLocation,
    contractorTransfers: (parsed.contractorTransfers ?? []).map((transfer) => {
      const unitId = migrateUnitId(
        (transfer as { unitId?: UnitId; contractorType?: ContractorCategoryId })
          .unitId ??
          (transfer as { contractorType?: ContractorCategoryId }).contractorType,
      );
      return { ...transfer, unitId };
    }),
    recruitmentJobs: migrateRecruitmentJobs(parsed),
    selectedOffice:
      rawSelectedOffice === "all" || rawSelectedOffice === "hq"
        ? rawSelectedOffice
        : rawSelectedOffice === "branch"
          ? "hq"
          : typeof rawSelectedOffice === "string" &&
              rawSelectedOffice.startsWith("branch:")
            ? (rawSelectedOffice as OfficeLocationId)
            : "hq",
    lastSelectedOffice:
      rawLastSelectedOffice === "hq"
        ? "hq"
        : rawLastSelectedOffice === "branch"
          ? "hq"
          : typeof rawLastSelectedOffice === "string" &&
              rawLastSelectedOffice.startsWith("branch:")
            ? (rawLastSelectedOffice as OfficeLocationId)
            : rawSelectedOffice === "hq"
              ? "hq"
              : typeof rawSelectedOffice === "string" &&
                  rawSelectedOffice.startsWith("branch:")
                ? (rawSelectedOffice as OfficeLocationId)
                : "hq",
    playerNotes: parsed.playerNotes ?? "",
    activityLog: parsed.activityLog ?? [],
    dismissedJobReportIds: parsed.dismissedJobReportIds ?? [],
    logbookFilterId:
      typeof parsed.logbookFilterId === "string" ? parsed.logbookFilterId : "all",
    view: normalizeView(parsed.view),
    won: parsed.won ?? false,
    // Keep wall-clock last tick so reopen can catch up offline production.
    lastTickAt:
      typeof parsed.lastTickAt === "number" && Number.isFinite(parsed.lastTickAt)
        ? parsed.lastTickAt
        : now,
  };

  Object.assign(merged, migrateBranchFields(parsed, merged));
  Object.assign(merged, migrateJobFields(parsed, now));

  const legacyOfficeSections = parsed.settings?.officeSiteSections as
    | Record<string, { structuresOpen?: boolean }>
    | undefined;
  const legacyBranchSectionsOpen =
    legacyOfficeSections?.branch?.structuresOpen ?? false;
  merged.settings.officeSiteSections = {
    hq: {
      structuresOpen: legacyOfficeSections?.hq?.structuresOpen ?? false,
    },
  };
  for (const site of merged.branchSites) {
    const officeId = branchOfficeIdForSite(site);
    merged.settings.officeSiteSections[officeId] = {
      structuresOpen:
        legacyOfficeSections?.[officeId]?.structuresOpen ??
        (merged.branchSites.length === 1 ? legacyBranchSectionsOpen : false),
    };
  }

  if (rawSelectedOffice === "branch") {
    merged.selectedOffice =
      merged.branchSites.length > 0
        ? branchOfficeIdForSite(merged.branchSites[0])
        : "hq";
  }
  if (rawLastSelectedOffice === "branch") {
    merged.lastSelectedOffice =
      merged.branchSites.length > 0
        ? branchOfficeIdForSite(merged.branchSites[0])
        : "hq";
  }
  if (merged.selectedOffice === "all" && !hasBranchOffices(merged)) {
    merged.selectedOffice = "hq";
  }
  if (
    merged.lastSelectedOffice !== "hq" &&
    isBranchOfficeId(merged.lastSelectedOffice) &&
    !branchSiteForOfficeId(merged, merged.lastSelectedOffice)
  ) {
    merged.lastSelectedOffice =
      merged.branchSites.length > 0
        ? branchOfficeIdForSite(merged.branchSites[0])
        : "hq";
  }
  if (
    merged.selectedOffice !== "all" &&
    merged.selectedOffice !== "hq" &&
    isBranchOfficeId(merged.selectedOffice) &&
    !branchSiteForOfficeId(merged, merged.selectedOffice)
  ) {
    merged.selectedOffice = "hq";
  }

  merged.locationStats = computeLocationStats({
    structureLevelsByLocation: merged.structureLevelsByLocation,
    contractorsByLocation: merged.contractorsByLocation,
    previous: parsed.locationStats,
    branchSites: merged.branchSites,
  });

  const derived = recomputeDerivedStats({
    structureLevelsByLocation: merged.structureLevelsByLocation,
    contractorsByLocation: merged.contractorsByLocation,
    researchLevels: merged.researchLevels,
    siteRateBonusByOffice: siteRateBonusesForState(merged),
  });
  merged.rates = derived.rates;
  merged.netWorth = computeNetWorth(merged.resources, merged.locationStats);
  if (merged.netWorth >= WIN_NET_WORTH) {
    merged.won = true;
  }

  const trimmed = trimSecretaryJobReports(merged);
  return finalizeLoadedState(trimmed, Date.now());
}

export function loadOnlineStateFromRemote(
  session: OnlineSession,
  remote: Record<string, unknown>,
): GameState {
  const merged = normalizeSave({
    ...createInitialState(),
    ...deserializePrivateState(remote, session),
  } as LegacySave);
  merged.onlineSession = session;
  return applyOnlineDevRestrictions(finalizeLoadedState(merged, Date.now()));
}

export function loadGameState(session?: OnlineSession | null): GameState {
  if (session?.playMode === "online") {
    try {
      const cached = localStorage.getItem(onlineCacheKey(session));
      if (cached) {
        const parsed = JSON.parse(cached) as LegacySave;
        return applyOnlineDevRestrictions(
          normalizeSave({
            ...parsed,
            ...deserializePrivateState(parsed as Record<string, unknown>, session),
          }),
        );
      }
    } catch {
      /* fall through */
    }
    const fresh = createInitialState();
    fresh.onlineSession = session;
    fresh.jobPostings = [];
    fresh.companyPresence = {};
    fresh.completedPostingPayouts = [];
    return applyOnlineDevRestrictions(fresh);
  }

  const key = session?.playerId
    ? offlineSaveKey(session.playerId)
    : SAVE_KEY;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const fresh = createInitialState();
      if (session) fresh.onlineSession = session;
      return fresh;
    }
    const parsed = JSON.parse(raw) as LegacySave;
    const normalized = normalizeSave(parsed);
    if (session) normalized.onlineSession = session;
    return normalized;
  } catch {
    const fresh = createInitialState();
    if (session) fresh.onlineSession = session;
    return fresh;
  }
}

export function saveGameState(state: GameState): void {
  const session = state.onlineSession;
  if (session?.playMode === "online") {
    localStorage.setItem(
      onlineCacheKey(session),
      JSON.stringify(serializePrivateState(state)),
    );
    return;
  }

  const key =
    session?.playerId != null
      ? offlineSaveKey(session.playerId)
      : SAVE_KEY;

  const {
    pendingOfflineSummary: _welcome,
    pendingCompletionAlerts: _alerts,
    recruitFocusUnitId: _recruitFocus,
    logbookHighlightEntryId: _logHighlight,
    jobFocusPostingId: _jobFocus,
    companyPresence: _presence,
    onlineConnectionStatus: _conn,
    onlineSession: _session,
    ...persistable
  } = state;
  localStorage.setItem(key, JSON.stringify(persistable));
}

export function resetGameState(
  preserveSettings?: GameState["settings"],
  playerId?: PlayerId,
): GameState {
  const key = playerId ? offlineSaveKey(playerId) : SAVE_KEY;
  localStorage.removeItem(key);
  const fresh = createInitialState();
  if (preserveSettings) {
    fresh.settings = {
      ...fresh.settings,
      ...preserveSettings,
      officeSiteSections: {
        ...fresh.settings.officeSiteSections,
        ...preserveSettings.officeSiteSections,
        hq: {
          ...fresh.settings.officeSiteSections.hq,
          ...preserveSettings.officeSiteSections?.hq,
        },
      },
    };
  }
  return fresh;
}

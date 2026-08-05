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
} from "./constants";
import { DEFAULT_TIER1_UNIT, UNIT_IDS } from "./recruitmentData";
import { finalizeLoadedState } from "./engine";
import { structureUpgradeCostForTargetLevel } from "./structureBalance";
import { initializeJobPostings, jobDefinitionById } from "./jobs";
import { MAP_BRANCH } from "./hexLayout";
import { defaultBranchName, siteRateBonusesForState } from "./mapWorld";
import {
  migrateLegacyResources,
  hqStartStructureLevels,
  branchStartStructureLevels,
} from "./phaseA";
import type {
  GameState,
  StructureId,
  OfficeLocationId,
  ContractorRoster,
  ContractorsByLocation,
  MainView,
  ResearchId,
  UnitId,
  UnitRoster,
  ContractorCategoryId,
} from "./types";

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

type LegacySave = Partial<GameState> & {
  upgradeLevels?: Record<StructureId, number>;
  structureLevels?: Record<StructureId, number>;
  contractors?: number | ContractorRoster;
  maxContractors?: number;
};

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
    for (const officeId of ["hq", "branch"] as OfficeLocationId[]) {
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
    for (const officeId of ["hq", "branch"] as OfficeLocationId[]) {
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

function migrateJobFields(
  parsed: LegacySave,
  now: number,
): Pick<GameState, "jobPostings" | "jobEngagements"> {
  if (parsed.jobPostings?.length && parsed.jobEngagements) {
    return {
      jobPostings: parsed.jobPostings,
      jobEngagements: parsed.jobEngagements.map((engagement) => {
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
      }),
    };
  }

  const jobPostings = initializeJobPostings(now);
  return {
    jobPostings,
    jobEngagements: [],
  };
}

function migrateBranchFields(
  parsed: LegacySave,
  merged: GameState,
): Pick<
  GameState,
  | "branchEstablished"
  | "branchCoord"
  | "branchName"
  | "selectedTowerId"
  | "selectedCommercialHex"
> {
  let branchEstablished = parsed.branchEstablished;
  if (branchEstablished === undefined) {
    const branchBuilt = Object.values(
      merged.structureLevelsByLocation.branch,
    ).some((level) => level > 0);
    branchEstablished =
      branchBuilt ||
      staffAtLocation(merged, "branch") > 0 ||
      parsed.selectedOffice === "branch";
  }

  const branchCoord =
    parsed.branchCoord ??
    (branchEstablished ? { ...MAP_BRANCH } : null);

  let branchName =
    typeof parsed.branchName === "string" && parsed.branchName.trim()
      ? parsed.branchName.trim().slice(0, 48)
      : null;
  if (branchEstablished && !branchName && branchCoord) {
    branchName = defaultBranchName(branchCoord, 1);
  }

  return {
    branchEstablished,
    branchCoord,
    branchName: branchEstablished ? branchName : null,
    // Map/job-board tower focus is session UI — don't restore a stale filter.
    selectedTowerId: null,
    selectedCommercialHex: parsed.selectedCommercialHex ?? null,
  };
}

function normalizeSave(parsed: LegacySave): GameState {
  const base = createInitialState();
  const now = Date.now();
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
          : "auto",
      officeSiteSections: {
        hq: {
          structuresOpen:
            parsed.settings?.officeSiteSections?.hq?.structuresOpen ?? false,
        },
        branch: {
          structuresOpen:
            parsed.settings?.officeSiteSections?.branch?.structuresOpen ??
            false,
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
    selectedOffice: parsed.selectedOffice ?? "hq",
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

  if (merged.selectedOffice === "branch" && !merged.branchEstablished) {
    merged.selectedOffice = "hq";
  }

  merged.locationStats = computeLocationStats({
    structureLevelsByLocation: merged.structureLevelsByLocation,
    contractorsByLocation: merged.contractorsByLocation,
    previous: parsed.locationStats,
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

  return finalizeLoadedState(merged, Date.now());
}

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as LegacySave;
    return normalizeSave(parsed);
  } catch {
    return createInitialState();
  }
}

export function saveGameState(state: GameState): void {
  const {
    pendingOfflineSummary: _welcome,
    pendingCompletionAlerts: _alerts,
    recruitFocusUnitId: _recruitFocus,
    ...persistable
  } = state;
  localStorage.setItem(SAVE_KEY, JSON.stringify(persistable));
}

export function resetGameState(preserveSettings?: GameState["settings"]): GameState {
  localStorage.removeItem(SAVE_KEY);
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
        branch: {
          ...fresh.settings.officeSiteSections.branch,
          ...preserveSettings.officeSiteSections?.branch,
        },
      },
    };
  }
  return fresh;
}

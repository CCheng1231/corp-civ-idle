import {
  SAVE_KEY,
  createInitialState,
  defaultOfficeSiteSections,
  emptyStructureLevels,
  emptyStructureQueues,
  emptyContractorRoster,
  emptyContractorsByLocation,
  recomputeDerivedStats,
  computeNetWorth,
  computeLocationStats,
  WIN_NET_WORTH,
  staffAtLocation,
} from "./constants";
import { finalizeLoadedState } from "./engine";
import { MAP_BRANCH } from "./hexLayout";
import {
  optimalCrewForProject,
  projectById,
  towerById,
} from "./mapWorld";
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
} from "./types";

const VALID_VIEWS = new Set<MainView>([
  "overview",
  "world",
  "operations",
  "research",
  "office",
  "logbook",
  "notes",
  "settings",
]);

function normalizeView(view: unknown): MainView {
  if (typeof view === "string" && VALID_VIEWS.has(view as MainView)) {
    return view as MainView;
  }
  return "operations";
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

function migrateContractors(parsed: LegacySave): ContractorsByLocation {
  if (parsed.contractorsByLocation) {
    return {
      hq: {
        ...emptyContractorRoster(),
        ...parsed.contractorsByLocation.hq,
      },
      branch: {
        ...emptyContractorRoster(),
        ...parsed.contractorsByLocation.branch,
      },
    };
  }
  if (
    parsed.contractors &&
    typeof parsed.contractors === "object" &&
    "farming" in parsed.contractors
  ) {
    return emptyContractorsByLocation({ hq: parsed.contractors });
  }
  if (typeof parsed.contractors === "number") {
    return emptyContractorsByLocation({
      hq: emptyContractorRoster({ farming: parsed.contractors }),
    });
  }
  return emptyContractorsByLocation({
    hq: emptyContractorRoster({ farming: 2 }),
  });
}

function migrateBranchFields(
  parsed: LegacySave,
  merged: GameState,
): Pick<
  GameState,
  | "branchEstablished"
  | "branchCoord"
  | "selectedTowerId"
  | "selectedCommercialHex"
  | "activeProject"
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

  let activeProject = parsed.activeProject ?? null;
  if (activeProject) {
    try {
      const project = projectById(activeProject.projectId);
      const tower = towerById(project.towerId);
      activeProject = {
        ...activeProject,
        towerId: project.towerId,
        optimalCrew:
          activeProject.optimalCrew ??
          optimalCrewForProject(tower, project),
      };
    } catch {
      activeProject = null;
    }
  }

  return {
    branchEstablished,
    branchCoord,
    selectedTowerId: parsed.selectedTowerId ?? "metro_central",
    selectedCommercialHex: parsed.selectedCommercialHex ?? null,
    activeProject,
  };
}

function normalizeSave(parsed: LegacySave): GameState {
  const base = createInitialState();
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
      officeSiteSections: {
        ...defaultOfficeSiteSections(),
        ...parsed.settings?.officeSiteSections,
        hq: {
          ...defaultOfficeSiteSections().hq,
          ...parsed.settings?.officeSiteSections?.hq,
        },
        branch: {
          ...defaultOfficeSiteSections().branch,
          ...parsed.settings?.officeSiteSections?.branch,
        },
      },
    },
    structureLevelsByLocation,
    structureQueues: {
      ...emptyStructureQueues(),
      ...parsed.structureQueues,
    },
    researchLevels,
    contractorsByLocation,
    contractorTransfers: parsed.contractorTransfers ?? [],
    recruitmentJobs: parsed.recruitmentJobs ?? [],
    selectedOffice: parsed.selectedOffice ?? "hq",
    playerNotes: parsed.playerNotes ?? "",
    activityLog: parsed.activityLog ?? [],
    view: normalizeView(parsed.view),
    won: parsed.won ?? false,
    lastTickAt: Date.now(),
  };

  Object.assign(merged, migrateBranchFields(parsed, merged));

  merged.locationStats = computeLocationStats({
    structureLevelsByLocation: merged.structureLevelsByLocation,
    contractorsByLocation: merged.contractorsByLocation,
    previous: parsed.locationStats,
  });

  const derived = recomputeDerivedStats(merged);
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
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetGameState(): GameState {
  localStorage.removeItem(SAVE_KEY);
  return createInitialState();
}

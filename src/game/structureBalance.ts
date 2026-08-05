import type {
  GameState,
  ResourceKey,
  OfficeLocationId,
  ProductionRates,
  ResourceCost,
  StructureId,
  StructureLevels,
} from "./types";
import {
  STRUCTURE_BALANCE_TABLES,
  STRUCTURE_EFFECT_KIND,
  type StructureLevelBalanceRow,
} from "./structureBalanceData";
import { RESEARCH_DEFINITIONS } from "./researchData";

const OFFICE_IDS: OfficeLocationId[] = ["hq", "branch"];

export { STRUCTURE_BALANCE_TABLES, STRUCTURE_EFFECT_KIND };

export function structureMaxLevel(structureId: StructureId): number {
  return STRUCTURE_BALANCE_TABLES[structureId].length;
}

export function getStructureLevelRow(
  structureId: StructureId,
  level: number,
): StructureLevelBalanceRow | null {
  const table = STRUCTURE_BALANCE_TABLES[structureId];
  if (level < 1 || level > table.length) return null;
  return table[level - 1];
}

/** Cost to upgrade from level `currentLevel` to `currentLevel + 1`. */
export function structureUpgradeCostForTargetLevel(
  structureId: StructureId,
  targetLevel: number,
): ResourceCost {
  const row = getStructureLevelRow(structureId, targetLevel);
  if (!row) return {};
  const cost: ResourceCost = {};
  if (row.cash > 0) cost.cash = Math.ceil(row.cash);
  if (row.supply > 0) cost.supply = Math.ceil(row.supply);
  if (row.connection > 0) cost.connection = Math.ceil(row.connection);
  if (row.reputation > 0) cost.reputation = Math.ceil(row.reputation);
  if (row.govReputation > 0) cost.govReputation = Math.ceil(row.govReputation);
  if (row.electricity > 0 && structureId !== "power_panel") {
    cost.electricity = Math.ceil(row.electricity);
  }
  return cost;
}

/** Real-time build duration for upgrade to `targetLevel` (buildTimeHours = Excel C × 24). */
export function structureBuildTimeMs(
  structureId: StructureId,
  targetLevel: number,
): number {
  const row = getStructureLevelRow(structureId, targetLevel);
  if (!row || row.buildTimeHours <= 0) return 0;
  return row.buildTimeHours * 3600 * 1000;
}

export function effectAtStructureLevel(
  structureId: StructureId,
  level: number,
): number {
  const row = getStructureLevelRow(structureId, level);
  return row?.effect ?? 0;
}

export interface StructureUpgradePreviewLine {
  label: string;
  from: number | null;
  to: number;
  unit: string;
}

function pushPreviewLine(
  lines: StructureUpgradePreviewLine[],
  label: string,
  fromLevel: number,
  toLevel: number,
  structureId: StructureId,
  unit: string,
  effectAtLevel: (level: number) => number = (lvl) =>
    effectAtStructureLevel(structureId, lvl),
) {
  const from = fromLevel > 0 ? effectAtLevel(fromLevel) : null;
  const to = effectAtLevel(toLevel);
  if (from === to && fromLevel > 0) return;
  lines.push({ label, from, to, unit });
}

/** Stat lines for upgrading from `currentLevel` to `targetLevel`. */
export function structureUpgradePreviewLines(
  structureId: StructureId,
  currentLevel: number,
  targetLevel: number,
): StructureUpgradePreviewLine[] {
  if (targetLevel <= currentLevel) return [];

  const lines: StructureUpgradePreviewLine[] = [];
  const buildRow = getStructureLevelRow(structureId, targetLevel);
  if (buildRow && buildRow.buildTimeHours > 0) {
    lines.push({
      label: "Build time",
      from: null,
      to: buildRow.buildTimeHours,
      unit: " hr",
    });
  }

  const kind = STRUCTURE_EFFECT_KIND[structureId];
  switch (kind) {
    case "cash_per_hour":
      pushPreviewLine(lines, "Cash/hr", currentLevel, targetLevel, structureId, "/hr");
      break;
    case "supply_per_hour":
      pushPreviewLine(lines, "SUP/hr", currentLevel, targetLevel, structureId, "/hr");
      break;
    case "connection_per_hour":
      pushPreviewLine(lines, "CON/hr", currentLevel, targetLevel, structureId, "/hr");
      if (structureId === "social_media") {
        pushPreviewLine(
          lines,
          "Mood/hr",
          currentLevel,
          targetLevel,
          structureId,
          "/hr",
          (lvl) => (effectAtStructureLevel(structureId, lvl) * 5) / 8,
        );
      }
      break;
    case "mood_per_hour":
      pushPreviewLine(lines, "Mood/hr", currentLevel, targetLevel, structureId, "/hr");
      break;
    case "cash_holding":
      pushPreviewLine(lines, "Cash cap", currentLevel, targetLevel, structureId, "");
      break;
    case "supply_holding":
      pushPreviewLine(lines, "SUP cap", currentLevel, targetLevel, structureId, "");
      break;
    case "office_space_bonus":
      pushPreviewLine(lines, "Office space", currentLevel, targetLevel, structureId, "");
      break;
    case "power_capacity_bonus":
      pushPreviewLine(lines, "Power capacity", currentLevel, targetLevel, structureId, "");
      break;
    case "none":
      if (structureId === "dept_rnd") {
        lines.push({
          label: "R&D gate level",
          from: currentLevel > 0 ? currentLevel : null,
          to: targetLevel,
          unit: "",
        });
      }
      break;
  }

  return lines;
}

export function structureUpgradeCostFromCurrentLevel(
  structureId: StructureId,
  currentLevel: number,
): ResourceCost {
  return structureUpgradeCostForTargetLevel(structureId, currentLevel + 1);
}

/** 50% refund for removing one level (cost paid to reach current level). */
export function structureSellRefundCost(
  structureId: StructureId,
  currentLevel: number,
): ResourceCost {
  if (currentLevel <= 0) return {};
  const paid = structureUpgradeCostForTargetLevel(structureId, currentLevel);
  const refund: ResourceCost = {};
  for (const [key, val] of Object.entries(paid)) {
    if (key === "electricity") {
      refund.electricity = Math.floor((val ?? 0) * 0.5);
    } else {
      const k = key as keyof ResourceCost;
      refund[k] = Math.floor((val ?? 0) * 0.5);
    }
  }
  return refund;
}

export function applyRatesForStructureLevels(
  levels: StructureLevels,
  rates: ProductionRates,
): void {
  for (const structureId of Object.keys(levels) as StructureId[]) {
    const level = levels[structureId];
    if (level <= 0) continue;
    const kind = STRUCTURE_EFFECT_KIND[structureId];
    const value = effectAtStructureLevel(structureId, level);
    switch (kind) {
      case "cash_per_hour":
        rates.cash += value;
        break;
      case "supply_per_hour":
        rates.supply += value;
        break;
      case "connection_per_hour":
        rates.connection += value;
        break;
      case "mood_per_hour":
        rates.mood += value;
        break;
      case "none":
      case "cash_holding":
      case "supply_holding":
      case "office_space_bonus":
      case "power_capacity_bonus":
        break;
    }
    if (structureId === "social_media" && value > 0) {
      rates.mood += (value * 5) / 8;
    }
  }
}

export function recomputeProductionRates(state: {
  structureLevelsByLocation: GameState["structureLevelsByLocation"];
  researchLevels?: GameState["researchLevels"];
  /** Per-site multiplier on structure passives (region site bonus). */
  siteRateBonusByOffice?: Partial<Record<OfficeLocationId, number>>;
}): ProductionRates {
  const rates: ProductionRates = {
    cash: 0,
    supply: 0,
    connection: 0,
    mood: 0,
    reputation: 0,
    govReputation: 0,
  };
  for (const officeId of OFFICE_IDS) {
    const siteRates: ProductionRates = {
      cash: 0,
      supply: 0,
      connection: 0,
      mood: 0,
      reputation: 0,
      govReputation: 0,
    };
    applyRatesForStructureLevels(
      state.structureLevelsByLocation[officeId],
      siteRates,
    );
    const mult = 1 + (state.siteRateBonusByOffice?.[officeId] ?? 0);
    for (const key of Object.keys(rates) as (keyof ProductionRates)[]) {
      rates[key] += siteRates[key] * mult;
    }
  }
  return rates;
}

export function computeResourceCaps(state: {
  structureLevelsByLocation: GameState["structureLevelsByLocation"];
  researchLevels?: GameState["researchLevels"];
}): {
  cashCap: number;
  supplyCap: number;
} {
  let cashCap = 0;
  let supplyCap = 0;

  for (const officeId of OFFICE_IDS) {
    const levels = state.structureLevelsByLocation[officeId];
    const bankLevel = levels.bank_account;
    if (bankLevel > 0) {
      cashCap += effectAtStructureLevel("bank_account", bankLevel);
    }
    const storageLevel = levels.storage_room;
    if (storageLevel > 0) {
      supplyCap += effectAtStructureLevel("storage_room", storageLevel);
    }
  }

  if (state.researchLevels) {
    const planningLevel = state.researchLevels.planning_ahead ?? 0;
    const storagePct =
      (RESEARCH_DEFINITIONS.find((r) => r.id === "planning_ahead")?.effects
        .storagePercentPerLevel ?? 0) * planningLevel;
    if (storagePct > 0) {
      const mult = 1 + storagePct;
      cashCap *= mult;
      supplyCap *= mult;
    }
  }

  if (cashCap <= 0) cashCap = Number.POSITIVE_INFINITY;
  if (supplyCap <= 0) supplyCap = Number.POSITIVE_INFINITY;

  return { cashCap, supplyCap };
}

/** Holding cap for top-bar display; null if uncapped. */
export function resourceCapForKey(
  caps: { cashCap: number; supplyCap: number },
  key: ResourceKey,
): number | null {
  if (key === "cash" && Number.isFinite(caps.cashCap)) return caps.cashCap;
  if (key === "supply" && Number.isFinite(caps.supplyCap)) return caps.supplyCap;
  return null;
}

export function resourceCapFillClass(percentOfCap: number): string {
  if (percentOfCap >= 90) return "resource-cap-fill--high";
  if (percentOfCap >= 50) return "resource-cap-fill--mid";
  return "resource-cap-fill--low";
}

export function clampResourcesToCaps(
  resources: GameState["resources"],
  caps: { cashCap: number; supplyCap: number },
): GameState["resources"] {
  return {
    ...resources,
    cash: Math.min(resources.cash, caps.cashCap),
    supply: Math.min(resources.supply, caps.supplyCap),
  };
}

export function officeSpaceBonusFromLevels(levels: StructureLevels): number {
  const level = levels.office_expansion;
  if (level <= 0) return 0;
  return effectAtStructureLevel("office_expansion", level);
}

export function targetLevelForStructureQueueJob(
  state: GameState,
  officeId: OfficeLocationId,
  queueIndex: number,
): number {
  const queue = state.structureQueues[officeId];
  const job = queue[queueIndex];
  if (!job) throw new Error("Invalid queue index");
  const built = state.structureLevelsByLocation[officeId][job.structureId];
  let pending = 0;
  for (let i = 0; i <= queueIndex; i++) {
    if (queue[i].structureId === job.structureId) pending += 1;
  }
  return built + pending;
}

export function powerBonusFromLevels(levels: StructureLevels): number {
  const level = levels.power_panel;
  if (level <= 0) return 0;
  return effectAtStructureLevel("power_panel", level);
}

export function buildTimeMsForQueueJob(
  state: GameState,
  officeId: OfficeLocationId,
  queueIndex: number,
): number {
  const job = state.structureQueues[officeId][queueIndex];
  const targetLevel =
    job.targetLevel ??
    targetLevelForStructureQueueJob(state, officeId, queueIndex);
  return structureBuildTimeMs(job.structureId, targetLevel);
}

const LEGACY_STRUCTURE_BUILD_MS = 5000;

/** Re-sync in-flight build timers from column C (fixes saves queued at old 5s placeholder). */
export function reconcileStructureBuildTimers(
  state: GameState,
  now: number,
): GameState {
  const next = structuredClone(state);

  for (const officeId of OFFICE_IDS) {
    const queue = next.structureQueues[officeId];
    if (queue.length === 0) continue;

    const built = { ...next.structureLevelsByLocation[officeId] };
    next.structureQueues[officeId] = queue.map((job) => {
      let targetLevel = job.targetLevel;
      if (targetLevel == null) {
        targetLevel = built[job.structureId] + 1;
      }
      built[job.structureId] = Math.max(built[job.structureId], targetLevel);

      if (job.completesAt === null) {
        return { ...job, targetLevel, startedAt: null };
      }

      const buildMs = structureBuildTimeMs(job.structureId, targetLevel);
      let startedAt = job.startedAt;
      if (startedAt == null) {
        const remaining = job.completesAt - now;
        if (remaining > buildMs + 500) {
          startedAt = job.completesAt - LEGACY_STRUCTURE_BUILD_MS;
        } else {
          startedAt = job.completesAt - buildMs;
        }
      }

      return {
        ...job,
        targetLevel,
        startedAt,
        completesAt: startedAt + buildMs,
      };
    });
  }

  return next;
}

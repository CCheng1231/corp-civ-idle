import {
  formatResourceCost,
  isResearchUnlocked,
  isStructureUnlocked,
  projectedResearchLevels,
  projectedStructureLevels,
  researchDisplayDescription,
  researchRequirementLabel,
  structureUnlockRequirementLabel,
} from "../game/constants";
import { researchUpgradeCostForLevel } from "../game/engine";
import { researchBuildTimeHours } from "../game/researchBalance";
import { researchCompletedResultLines } from "../game/researchPreview";
import {
  structureBuildTimeMs,
  structureCompletedResultLines,
  structureUpgradeCostForTargetLevel,
} from "../game/structureBalance";
import type {
  GameState,
  OfficeLocationId,
  ResearchDefinition,
  ResourceCost,
  StructureDefinition,
} from "../game/types";
import { formatCompactBonus } from "./upgradePreviewFormat";

export type ProgressionTreeRowStatus = "done" | "queued" | "next" | "future";

export interface ProgressionUpgradeTreeRow {
  level: number;
  cost: ResourceCost;
  buildHours: number;
  effectSummary: string;
  status: ProgressionTreeRowStatus;
}

export interface ProgressionDetailModel {
  title: string;
  description?: string;
  currentLevel: number;
  projectedLevel: number;
  maxLevel: number;
  maxed: boolean;
  locked: boolean;
  requirement?: string;
  rows: ProgressionUpgradeTreeRow[];
}

function treeRowStatus(
  level: number,
  built: number,
  projected: number,
): ProgressionTreeRowStatus {
  if (level <= built) return "done";
  if (level <= projected) return "queued";
  if (level === projected + 1) return "next";
  return "future";
}

function effectSummaryAtLevel(
  lines: ReturnType<typeof researchCompletedResultLines>,
): string {
  if (lines.length === 0) return "—";
  return formatCompactBonus(lines) || "—";
}

function buildRows(
  maxLevel: number,
  built: number,
  projected: number,
  rowForLevel: (level: number) => Omit<ProgressionUpgradeTreeRow, "status">,
): ProgressionUpgradeTreeRow[] {
  const rows: ProgressionUpgradeTreeRow[] = [];
  for (let level = 1; level <= maxLevel; level += 1) {
    rows.push({
      ...rowForLevel(level),
      status: treeRowStatus(level, built, projected),
    });
  }
  return rows;
}

export function buildResearchDetailModel(
  state: GameState,
  research: ResearchDefinition,
): ProgressionDetailModel {
  const built = state.researchLevels[research.id];
  const projected = projectedResearchLevels(state)[research.id];
  const unlocked = isResearchUnlocked(state, research);

  return {
    title: research.name,
    description: researchDisplayDescription(research),
    currentLevel: built,
    projectedLevel: projected,
    maxLevel: research.maxLevel,
    maxed: built >= research.maxLevel,
    locked: !unlocked,
    requirement: unlocked ? undefined : researchRequirementLabel(research),
    rows: buildRows(research.maxLevel, built, projected, (level) => ({
      level,
      cost: researchUpgradeCostForLevel(research.id, level - 1),
      buildHours: researchBuildTimeHours(research.id, level),
      effectSummary: effectSummaryAtLevel(
        researchCompletedResultLines(research, level),
      ),
    })),
  };
}

export function buildStructureDetailModel(
  state: GameState,
  officeId: OfficeLocationId,
  structure: StructureDefinition,
): ProgressionDetailModel {
  const built = state.structureLevelsByLocation[officeId][structure.id];
  const projected = projectedStructureLevels(state, officeId)[structure.id];
  const unlocked = isStructureUnlocked(state, structure.id);

  return {
    title: structure.name,
    description: structure.description,
    currentLevel: built,
    projectedLevel: projected,
    maxLevel: structure.maxLevel,
    maxed: built >= structure.maxLevel,
    locked: !unlocked,
    requirement: unlocked
      ? undefined
      : structureUnlockRequirementLabel(structure.id) ?? undefined,
    rows: buildRows(structure.maxLevel, built, projected, (level) => ({
      level,
      cost: structureUpgradeCostForTargetLevel(structure.id, level),
      buildHours: structureBuildTimeMs(structure.id, level) / (3600 * 1000),
      effectSummary: effectSummaryAtLevel(
        structureCompletedResultLines(structure.id, level),
      ),
    })),
  };
}

export function formatTreeRowCost(cost: ResourceCost): string {
  const text = formatResourceCost(cost);
  return text || "—";
}

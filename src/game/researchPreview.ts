import { RESOURCE_LABELS, STRUCTURES } from "./constants";
import type { ResearchDefinition } from "./types";

export interface ResearchUpgradePreviewLine {
  label: string;
  from: number | null;
  to: number;
  unit: string;
  text?: string;
}

export function researchUpgradePreviewLines(
  research: ResearchDefinition,
  currentLevel: number,
  targetLevel: number,
): ResearchUpgradePreviewLine[] {
  if (targetLevel <= currentLevel) return [];
  return researchResultLinesAtLevel(research, targetLevel, currentLevel);
}

/** Final bonuses at `level` — used for completed / maxed research cards. */
export function researchCompletedResultLines(
  research: ResearchDefinition,
  level: number,
): ResearchUpgradePreviewLine[] {
  return researchResultLinesAtLevel(research, level, level);
}

function researchResultLinesAtLevel(
  research: ResearchDefinition,
  level: number,
  fromLevel = 0,
): ResearchUpgradePreviewLine[] {
  if (level <= 0) return [];

  const lines: ResearchUpgradePreviewLine[] = [];
  const { effects } = research;
  const previewingUpgrade = fromLevel < level;

  if (effects.ratePercentPerLevel) {
    for (const [key, pctPerLevel] of Object.entries(effects.ratePercentPerLevel)) {
      const pct = pctPerLevel ?? 0;
      if (pct <= 0) continue;
      const label =
        RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS] ?? key;
      lines.push({
        label: `${label} bonus`,
        from: previewingUpgrade && fromLevel > 0 ? pct * fromLevel * 100 : null,
        to: pct * level * 100,
        unit: "%",
      });
    }
  }

  if (effects.storagePercentPerLevel) {
    const pct = effects.storagePercentPerLevel;
    lines.push({
      label: "Storage bonus",
      from: previewingUpgrade && fromLevel > 0 ? pct * fromLevel * 100 : null,
      to: pct * level * 100,
      unit: "%",
    });
  }

  if (effects.projectPayoutMultPerLevel) {
    const pct = effects.projectPayoutMultPerLevel;
    lines.push({
      label: "Project payout",
      from: previewingUpgrade && fromLevel > 0 ? pct * fromLevel * 100 : null,
      to: pct * level * 100,
      unit: "%",
    });
  }

  if (
    (lines.length === 0 || !previewingUpgrade) &&
    research.id === "branch_management" &&
    level >= 1
  ) {
    lines.push({
      label: "Unlock",
      from: null,
      to: 0,
      unit: "",
      text: previewingUpgrade
        ? "Branch Manager recruitment + first branch slot"
        : "Branch Manager recruitment and first branch slot",
    });
  }

  if (research.id === "massive_expansion" && level >= 1) {
    const per = research.effects.branchSlotPerLevel ?? 1;
    lines.push({
      label: "Branch slots",
      from: previewingUpgrade && fromLevel > 0 ? 1 + fromLevel * per : null,
      to: 1 + level * per,
      unit: "",
    });
  }

  if (
    (lines.length === 0 || !previewingUpgrade) &&
    research.id === "portfolio_management" &&
    level >= 1
  ) {
    lines.push({
      label: "Engagement cap",
      from: previewingUpgrade && fromLevel > 0 ? 3 + fromLevel : null,
      to: 3 + level,
      unit: " jobs",
    });
  }

  if (effects.unlocksStructure && level >= 1) {
    const structure = STRUCTURES.find((s) => s.id === effects.unlocksStructure);
    lines.push({
      label: "Unlock",
      from: null,
      to: 0,
      unit: "",
      text: structure
        ? previewingUpgrade
          ? `Build ${structure.name}`
          : `Unlocked ${structure.name}`
        : previewingUpgrade
          ? `Build ${effects.unlocksStructure}`
          : `Unlocked ${effects.unlocksStructure}`,
    });
  }

  return lines;
}

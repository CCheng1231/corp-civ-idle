import { RESOURCE_LABELS } from "./constants";
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

  const lines: ResearchUpgradePreviewLine[] = [];
  const { effects } = research;

  if (effects.ratePercentPerLevel) {
    for (const [key, pctPerLevel] of Object.entries(effects.ratePercentPerLevel)) {
      const pct = pctPerLevel ?? 0;
      if (pct <= 0) continue;
      const label =
        RESOURCE_LABELS[key as keyof typeof RESOURCE_LABELS] ?? key;
      lines.push({
        label: `${label} bonus`,
        from: currentLevel > 0 ? pct * currentLevel * 100 : null,
        to: pct * targetLevel * 100,
        unit: "%",
      });
    }
  }

  if (effects.storagePercentPerLevel) {
    const pct = effects.storagePercentPerLevel;
    lines.push({
      label: "Storage bonus",
      from: currentLevel > 0 ? pct * currentLevel * 100 : null,
      to: pct * targetLevel * 100,
      unit: "%",
    });
  }

  if (effects.projectPayoutMultPerLevel) {
    const pct = effects.projectPayoutMultPerLevel;
    lines.push({
      label: "Project payout",
      from: currentLevel > 0 ? pct * currentLevel * 100 : null,
      to: pct * targetLevel * 100,
      unit: "%",
    });
  }

  if (
    lines.length === 0 &&
    research.id === "branch_management" &&
    currentLevel === 0
  ) {
    lines.push({
      label: "Unlock",
      from: null,
      to: 0,
      unit: "",
      text: "Branch manager unit",
    });
  }

  return lines;
}

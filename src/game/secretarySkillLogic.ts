import type { SecretaryId } from "./types";
import {
  MAX_SKILL_RANK,
  skillTreesFor,
  type SkillNodeDef,
  type SkillTreeDef,
} from "./secretarySkillData";

export type SecretarySkillTreeKey = "chief" | "teamLead" | "onSite";

export function fmtSkillPct(pct: number): string {
  const n = pct * 100;
  const abs = Math.abs(n);
  const shown = Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 10) / 10);
  if (n > 0) return `+${shown}%`;
  if (n < 0) return `−${shown}%`;
  return "0%";
}

export function effectTargetLabel(effectKind: string): string {
  if (effectKind === "officeProduction") return "cash & supply";
  if (effectKind === "onSiteReputation") return "REP";
  if (effectKind === "onSiteRecruitTime") return "contractor hire time";
  if (effectKind === "onSiteRecruitCost") return "contractor hire cost";
  if (effectKind === "onSiteStructureBuildTime") return "structure build time";
  if (effectKind === "onSiteStructureBuildCost") return "structure build cost";
  if (effectKind === "structureBuildTime") return "structure build time";
  if (effectKind === "structureBuildCost") return "structure build cost";
  if (effectKind === "researchBuildTime") return "research time";
  if (effectKind === "researchBuildCost") return "research cash";
  if (effectKind === "jobWorkTime") return "work time";
  if (effectKind === "travelTime") return "travel time";
  if (effectKind === "jobSupplyCost") return "travel supply";
  if (effectKind === "jobIncome") return "job payout";
  if (effectKind === "jobUnitHours") return "unit hours";
  return effectKind;
}

export function perRankEffectLine(node: SkillNodeDef): string {
  if (node.effectKind === "onSiteReputation") {
    return `${fmtSkillPct(node.pctPerRank)} REP per rank`;
  }
  return `${fmtSkillPct(node.pctPerRank)} per rank · ${effectTargetLabel(node.effectKind)}`;
}

export function totalEffectLine(rank: number, node: SkillNodeDef): string {
  return `Total ${fmtSkillPct(node.pctPerRank * rank)}`;
}

export function onSiteDetailSuffix(officeLabel: string): string {
  return ` · ${officeLabel} only`;
}

function ranksForTree(
  treeKey: SecretarySkillTreeKey,
  progress: {
    chiefSkillRanks: Record<string, number>;
    teamLeadSkillRanks: Record<string, number>;
    onSiteSkillRanks: Record<string, number>;
  },
): Record<string, number> {
  if (treeKey === "chief") return progress.chiefSkillRanks;
  if (treeKey === "teamLead") return progress.teamLeadSkillRanks;
  return progress.onSiteSkillRanks;
}

function parentOk(
  tree: SkillTreeDef,
  ranks: Record<string, number>,
  item: SkillNodeDef,
): boolean {
  if (!item.requires) return true;
  const parent = tree.nodes.find((n) => n.id === item.requires);
  if (!parent) return false;
  return (ranks[parent.id] ?? 0) >= (item.gateRank || 1);
}

export function canIncreaseSkillRank(
  tree: SkillTreeDef,
  ranks: Record<string, number>,
  node: SkillNodeDef,
  unspent: number,
): boolean {
  const rank = ranks[node.id] ?? 0;
  if (rank >= node.maxRank || rank >= MAX_SKILL_RANK) return false;
  if (unspent <= 0) return false;
  if (!parentOk(tree, ranks, node)) return false;
  return true;
}

export function canDecreaseSkillRank(
  tree: SkillTreeDef,
  ranks: Record<string, number>,
  node: SkillNodeDef,
): boolean {
  const rank = ranks[node.id] ?? 0;
  if (rank <= 0) return false;
  const next = rank - 1;
  const blocked = tree.nodes.some(
    (other) =>
      other.requires === node.id &&
      (other.gateRank || 1) > next &&
      (ranks[other.id] ?? 0) > 0,
  );
  return !blocked;
}

export function gateLabel(
  tree: SkillTreeDef,
  ranks: Record<string, number>,
  item: SkillNodeDef,
): string {
  if (!item.requires) return "";
  const parent = tree.nodes.find((n) => n.id === item.requires);
  const name = parent?.label ?? "skill";
  const need = item.gateRank || 1;
  if (parent && (ranks[parent.id] ?? 0) >= need) return "";
  return `Needs ${name} ${need}`;
}

export function nodeDepth(
  node: SkillNodeDef,
  byId: Record<string, SkillNodeDef>,
  seen = new Set<string>(),
): number {
  if (!node.requires) return 0;
  if (seen.has(node.id)) return 0;
  seen.add(node.id);
  const parent = byId[node.requires];
  if (!parent) return 0;
  return 1 + nodeDepth(parent, byId, seen);
}

export function diagramTiers(tree: SkillTreeDef): SkillNodeDef[][] {
  const byId = Object.fromEntries(tree.nodes.map((n) => [n.id, n]));
  const colOrder = { left: 0, root: 1, right: 2 };
  const depths = tree.nodes.map((n) => nodeDepth(n, byId));
  const maxD = Math.max(0, ...depths);
  const tiers: SkillNodeDef[][] = [];
  for (let d = 0; d <= maxD; d += 1) {
    tiers.push(
      tree.nodes
        .filter((n) => nodeDepth(n, byId) === d)
        .sort(
          (a, b) =>
            (colOrder[a.column] ?? 1) - (colOrder[b.column] ?? 1) ||
            a.label.localeCompare(b.label),
        ),
    );
  }
  return tiers;
}

export function treeFullyMastered(
  level: number,
  tree: SkillTreeDef,
  ranks: Record<string, number>,
  maxLevel: number,
): boolean {
  if (level < maxLevel) return false;
  for (const node of tree.nodes) {
    if ((ranks[node.id] ?? 0) < node.maxRank) return false;
  }
  return true;
}

export function anySkillTreeMastered(
  secretaryId: SecretaryId,
  level: number,
  progress: {
    chiefSkillRanks: Record<string, number>;
    teamLeadSkillRanks: Record<string, number>;
    onSiteSkillRanks: Record<string, number>;
  },
  maxLevel: number,
): boolean {
  const trees = skillTreesFor(secretaryId);
  return (
    treeFullyMastered(level, trees.chief, progress.chiefSkillRanks, maxLevel) ||
    treeFullyMastered(level, trees.teamLead, progress.teamLeadSkillRanks, maxLevel) ||
    treeFullyMastered(level, trees.onSite, progress.onSiteSkillRanks, maxLevel)
  );
}

export function treeRanks(
  treeKey: SecretarySkillTreeKey,
  progress: {
    chiefSkillRanks: Record<string, number>;
    teamLeadSkillRanks: Record<string, number>;
    onSiteSkillRanks: Record<string, number>;
  },
): Record<string, number> {
  return ranksForTree(treeKey, progress);
}
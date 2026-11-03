import {
  deptRndLevel,
  getStructureDefinition,
  isResearchUnlocked,
  isStructureUnlocked,
  RESEARCH,
  researchUnlockForStructure,
} from "./constants";
import type { GameState, ResearchDefinition, ResearchId, StructureId, UnitId } from "./types";

export type ProgressionLockNavTarget =
  | { kind: "research"; researchId: ResearchId; label: string }
  | { kind: "structure"; structureId: StructureId; label: string };

/** Research level required before a unit can be hired. Extend when adding gated recruits. */
const RECRUITMENT_UNIT_RESEARCH_GATES: Partial<
  Record<UnitId, { researchId: ResearchId; minLevel: number }>
> = {
  branch_manager: { researchId: "branch_management", minLevel: 1 },
};

function pushUnmetResearchChain(
  state: GameState,
  researchId: ResearchId,
  minLevel: number,
  seen: Set<string>,
  lines: ProgressionLockNavTarget[],
): void {
  if ((state.researchLevels[researchId] ?? 0) >= minLevel) {
    return;
  }

  const def = RESEARCH.find((r) => r.id === researchId);
  if (!def) return;

  const rndRequired = def.rndLevelRequired ?? 0;
  if (rndRequired > 0 && deptRndLevel(state) < rndRequired) {
    const key = `structure:dept_rnd:${rndRequired}`;
    if (!seen.has(key)) {
      seen.add(key);
      const dept = getStructureDefinition("dept_rnd");
      lines.push({
        kind: "structure",
        structureId: "dept_rnd",
        label: `${dept.name} Lv ${rndRequired}`,
      });
    }
  }

  for (const req of def.requires ?? []) {
    if ((state.researchLevels[req.id] ?? 0) >= req.minLevel) continue;
    pushUnmetResearchChain(state, req.id, req.minLevel, seen, lines);
  }

  const selfKey = `research:${researchId}:${minLevel}`;
  if (!seen.has(selfKey)) {
    seen.add(selfKey);
    lines.push({
      kind: "research",
      researchId,
      label: `${def.name} Lv ${minLevel}`,
    });
  }
}

export function researchProgressionLockNav(
  state: GameState,
  research: ResearchDefinition,
): ProgressionLockNavTarget[] {
  if (isResearchUnlocked(state, research)) return [];
  const lines: ProgressionLockNavTarget[] = [];
  pushUnmetResearchChain(state, research.id, 1, new Set(), lines);
  return lines;
}

export function structureProgressionLockNav(
  state: GameState,
  structureId: StructureId,
): ProgressionLockNavTarget[] {
  if (isStructureUnlocked(state, structureId)) return [];
  const unlockResearch = researchUnlockForStructure(structureId);
  if (!unlockResearch) return [];
  const lines: ProgressionLockNavTarget[] = [];
  pushUnmetResearchChain(state, unlockResearch.id, 1, new Set(), lines);
  return lines;
}

export function recruitmentUnitProgressionLockNav(
  state: GameState,
  unitId: UnitId,
): ProgressionLockNavTarget[] {
  const gate = RECRUITMENT_UNIT_RESEARCH_GATES[unitId];
  if (!gate) return [];
  if ((state.researchLevels[gate.researchId] ?? 0) >= gate.minLevel) {
    return [];
  }
  const lines: ProgressionLockNavTarget[] = [];
  pushUnmetResearchChain(state, gate.researchId, gate.minLevel, new Set(), lines);
  return lines;
}

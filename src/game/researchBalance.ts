import { RESEARCH_DEFINITIONS } from "./researchData";
import type { ResearchId } from "./types";

export function researchBuildTimeHours(
  researchId: ResearchId,
  targetLevel: number,
): number {
  const def = RESEARCH_DEFINITIONS.find((r) => r.id === researchId);
  if (!def?.buildTimeHoursPerLevel) return 0;
  const row = def.buildTimeHoursPerLevel[targetLevel - 1];
  return row ?? def.buildTimeHoursPerLevel[0] ?? 0;
}

/** Real-time ms for research upgrade to targetLevel (game hours = real hours). */
export function researchBuildTimeMs(
  researchId: ResearchId,
  targetLevel: number,
): number {
  const hours = researchBuildTimeHours(researchId, targetLevel);
  if (hours <= 0) return 0;
  return hours * 3600 * 1000;
}

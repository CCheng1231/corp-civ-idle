import { unitDefinition } from "./unitEffects";
import type { JobDefinition, UnitAssignment, UnitId } from "./types";

/** Lowest unit tier allowed on this job (tier 2 jobs require tier 2+). */
export function requiredMinUnitTierForJob(
  def: Pick<JobDefinition, "minUnitTier" | "tier">,
): number {
  const minUnitTier = Number(def.minUnitTier);
  const jobTier = Number(def.tier);
  return Math.max(
    Number.isFinite(minUnitTier) && minUnitTier > 0 ? minUnitTier : 1,
    Number.isFinite(jobTier) && jobTier > 0 ? jobTier : 1,
  );
}

export function pruneAssignmentForJob(
  assignment: UnitAssignment,
  def: Pick<JobDefinition, "requiredCategory" | "minUnitTier" | "tier">,
): UnitAssignment {
  const minUnitTier = requiredMinUnitTierForJob(def);
  const next: UnitAssignment = {};
  for (const [key, raw] of Object.entries(assignment)) {
    const count = Math.max(0, Math.floor(raw ?? 0));
    if (count <= 0) continue;
    const unitId = key as UnitId;
    try {
      const unit = unitDefinition(unitId);
      if (unit.category !== def.requiredCategory) continue;
      if (unit.tier < minUnitTier) continue;
      next[unitId] = count;
    } catch {
      /* drop unknown units */
    }
  }
  return next;
}

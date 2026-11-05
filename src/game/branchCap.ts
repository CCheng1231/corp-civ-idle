import type { GameState } from "./types";
import { activePlayerId } from "../multiplayer/playerHq";
import { branchManagementResearched } from "./mapWorld";

/** Max company sites (HQ + branches) once Branch Management is researched. */
export function maxCompanyOfficeSites(state: GameState): number {
  if (!branchManagementResearched(state)) return 1;
  const n = state.researchLevels.massive_expansion ?? 0;
  return 2 + Math.max(0, n);
}

export function ownedBranchSitesForPlayer(
  state: GameState,
  ownerId: string = activePlayerId(state),
): number {
  return state.branchSites.filter(
    (s) => (s.ownerPlayerId ?? ownerId) === ownerId && !s.closingStartedAt,
  ).length;
}

/** HQ counts as 1; branches count toward cap after BM. */
export function companyOfficeSiteCount(state: GameState): number {
  return 1 + ownedBranchSitesForPlayer(state);
}

export function companyOfficeSiteFraction(state: GameState): {
  open: number;
  max: number;
} {
  const open = companyOfficeSiteCount(state);
  const max = maxCompanyOfficeSites(state);
  return { open, max };
}

export function canOpenAnotherBranch(state: GameState): boolean {
  return companyOfficeSiteCount(state) < maxCompanyOfficeSites(state);
}

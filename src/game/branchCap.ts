import type { GameState } from "./types";
import { activePlayerId } from "../multiplayer/playerHq";
import { branchManagementResearched } from "./mapWorld";

/** Max branch offices (HQ is not included) once Branch Management is researched. */
export function maxBranchOffices(state: GameState): number {
  if (!branchManagementResearched(state)) return 0;
  const n = state.researchLevels.massive_expansion ?? 0;
  return 1 + Math.max(0, n);
}

/** HQ + branch count — UI/travel only; not used for branch cap. */
export function maxCompanyOfficeSites(state: GameState): number {
  return 1 + maxBranchOffices(state);
}

export function ownedBranchSitesForPlayer(
  state: GameState,
  ownerId: string = activePlayerId(state),
): number {
  return state.branchSites.filter(
    (s) => (s.ownerPlayerId ?? ownerId) === ownerId && !s.closingStartedAt,
  ).length;
}

export function companyOfficeSiteCount(state: GameState): number {
  return ownedBranchSitesForPlayer(state);
}

export function companyOfficeSiteFraction(state: GameState): {
  open: number;
  max: number;
} {
  const open = ownedBranchSitesForPlayer(state);
  const max = maxBranchOffices(state);
  return { open, max };
}

export function canOpenAnotherBranch(state: GameState): boolean {
  return ownedBranchSitesForPlayer(state) < maxBranchOffices(state);
}

import { secretaryIsUnlocked } from "./secretaryProgress";
import type { GameState, SecretaryId } from "./types";

export function teamLeadsOnActiveJobs(state: GameState): SecretaryId[] {
  const busy = new Set<SecretaryId>();
  for (const engagement of state.jobEngagements) {
    if (!engagement.teamLeadSecretaryId) continue;
    if (engagement.phase === "returning") continue;
    busy.add(engagement.teamLeadSecretaryId);
  }
  return [...busy];
}

export function canAssignTeamLead(
  state: GameState,
  secretaryId: SecretaryId,
): boolean {
  if (!secretaryIsUnlocked(state, secretaryId)) return false;
  if (state.chiefOfStaffId === secretaryId) return false;
  return !teamLeadsOnActiveJobs(state).includes(secretaryId);
}

export function availableTeamLeadSecretaries(state: GameState): SecretaryId[] {
  return (Object.keys(state.secretaryUnlocks) as SecretaryId[]).filter((id) =>
    canAssignTeamLead(state, id),
  );
}

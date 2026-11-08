import { appendActivityLogs } from "./logbook";
import { secretaryById } from "./secretaryData";
import { grantSecretaryExp } from "./secretaryProgress";
import { checkSecretaryRecruitmentMilestones } from "./secretaryRecruitment";
import { totalAssigned } from "./unitEffects";
import type { GameState, OfficeLocationId, SecretaryId, StructureId } from "./types";

const STRUCTURE_EXP_BASE = 12;
const RESEARCH_EXP_BASE = 18;
const BRANCH_EXP_BASE = 80;
const JOB_EXP_BASE = 10;

export function expForStructureComplete(
  structureId: StructureId,
  newLevel: number,
): number {
  return STRUCTURE_EXP_BASE + newLevel * 4 + (structureId.length % 7);
}

export function expForResearchComplete(newLevel: number): number {
  return RESEARCH_EXP_BASE + newLevel * 6;
}

export function grantChiefProgressionExp(
  state: GameState,
  amount: number,
  summary: string,
  now?: number,
): GameState {
  if (amount <= 0) return state;
  const chiefId = state.chiefOfStaffId;
  const { state: withExp, levelsGained } = grantSecretaryExp(
    state,
    chiefId,
    amount,
  );
  let next = withExp;
  if (levelsGained > 0) {
    const name = secretaryById(chiefId).name;
    next = appendActivityLogs(
      next,
      [
        {
          category: "secretary",
          summary: `${name} reached level ${next.secretaryProgress[chiefId]?.level ?? 1}`,
          impacts: [
            summary,
            levelsGained > 1
              ? `+${levelsGained} levels · skill points awarded`
              : "+1 skill point",
          ],
        },
      ],
      now,
    );
  }
  return checkSecretaryRecruitmentMilestones(next, state);
}

export function grantTeamLeadJobExp(
  state: GameState,
  teamLeadId: SecretaryId,
  crewAssigned: GameState["jobEngagements"][number]["crewAssigned"],
  now?: number,
): GameState {
  const units = totalAssigned(crewAssigned);
  const amount = Math.floor(JOB_EXP_BASE * (1 + 0.1 * Math.max(0, units - 1)));
  const { state: withExp, levelsGained } = grantSecretaryExp(
    state,
    teamLeadId,
    amount,
  );
  let next = withExp;
  if (levelsGained > 0) {
    const name = secretaryById(teamLeadId).name;
    next = appendActivityLogs(
      next,
      [
        {
          category: "secretary",
          summary: `${name} reached level ${next.secretaryProgress[teamLeadId]?.level ?? 1}`,
          impacts: ["Field leadership experience", "+skill points"],
        },
      ],
      now,
    );
  }
  return checkSecretaryRecruitmentMilestones(next, state);
}

export function onStructureQueueComplete(
  state: GameState,
  officeId: OfficeLocationId,
  structureId: StructureId,
  newLevel: number,
  now: number,
): GameState {
  const amount = expForStructureComplete(structureId, newLevel);
  return grantChiefProgressionExp(
    state,
    amount,
    `Structure complete · ${officeId}`,
    now,
  );
}

export function onResearchQueueComplete(
  state: GameState,
  newLevel: number,
  now: number,
): GameState {
  return grantChiefProgressionExp(
    state,
    expForResearchComplete(newLevel),
    "Research complete",
    now,
  );
}

export function onBranchEstablished(state: GameState, now: number): GameState {
  return grantChiefProgressionExp(
    state,
    BRANCH_EXP_BASE,
    "New branch opened",
    now,
  );
}

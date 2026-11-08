import type { SecretaryDefinition } from "./secretaryData";
import { secretaryById } from "./secretaryData";
import { jobDefinitionById } from "./jobs";
import { officeSiteLabel } from "./officeSelection";
import { teamLeadsOnActiveJobs } from "./secretaryTeamLead";
import type { GameState, OfficeSelectionId, SecretaryId } from "./types";

/** One active posting shown on the secretary roster row. */
export interface SecretaryRoleLine {
  id: string;
  text: string;
  emphasis?: boolean;
}

export function secretaryRoleLinesFor(
  secretaryId: SecretaryId,
  state: GameState,
): SecretaryRoleLine[] {
  const lines: SecretaryRoleLine[] = [];

  if (state.chiefOfStaffId === secretaryId) {
    lines.push({
      id: "chief-of-staff",
      text: "Acting Chief of Staff",
      emphasis: true,
    });
  }

  for (const engagement of state.jobEngagements) {
    if (engagement.teamLeadSecretaryId !== secretaryId) continue;
    if (engagement.phase === "returning") continue;
    const def = jobDefinitionById(engagement.definitionId);
    lines.push({
      id: `team-lead-${engagement.id}`,
      text: `Team lead · ${def.title}`,
    });
  }

  return lines;
}

export function secretaryIsAssigned(
  secretaryId: SecretaryId,
  state: GameState,
): boolean {
  return secretaryRoleLinesFor(secretaryId, state).length > 0;
}

export function secretariesForOfficeFilter(
  entries: readonly SecretaryDefinition[],
  selectedOffice: OfficeSelectionId,
): SecretaryDefinition[] {
  if (selectedOffice === "all") return [...entries];
  return entries.filter((entry) => entry.officeId === selectedOffice);
}

export function secretaryRosterRoleLines(
  entry: SecretaryDefinition,
  state: GameState,
): SecretaryRoleLine[] {
  const site = officeSiteLabel(state, entry.officeId);
  const lines = secretaryRoleLinesFor(entry.id, state);

  if (lines.length === 0) {
    if (teamLeadsOnActiveJobs(state).includes(entry.id)) {
      return [{ id: "available", text: `Available · ${site}` }];
    }
    return [{ id: "available", text: `Available · ${site}` }];
  }

  return lines.map((line) => ({
    ...line,
    text: `${line.text} · ${site}`,
  }));
}

export function sortSecretariesForRoster<T extends { id: SecretaryId }>(
  entries: readonly T[],
  chiefOfStaffId: SecretaryId,
): T[] {
  return [...entries].sort((a, b) => {
    if (a.id === chiefOfStaffId) return -1;
    if (b.id === chiefOfStaffId) return 1;
    return 0;
  });
}

export function secretaryProgressSummary(
  state: GameState,
  secretaryId: SecretaryId,
): string {
  const progress = state.secretaryProgress[secretaryId];
  if (!progress) return "Lv 1";
  const name = secretaryById(secretaryId).name;
  return `${name} · Lv ${progress.level}`;
}

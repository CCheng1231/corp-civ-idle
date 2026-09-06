import type { SecretaryDefinition } from "./secretaryData";
import { officeSiteLabel } from "./officeSelection";
import type { GameState, OfficeSelectionId, SecretaryId } from "./types";

/** One active posting shown on the secretary roster row. */
export interface SecretaryRoleLine {
  id: string;
  text: string;
  emphasis?: boolean;
}

/**
 * Current secretary postings derived from game state.
 * Extend here when team-lead / department-head assignments are wired in.
 */
export function secretaryRoleLinesFor(
  secretaryId: SecretaryId,
  state: Pick<GameState, "chiefOfStaffId">,
): SecretaryRoleLine[] {
  const lines: SecretaryRoleLine[] = [];

  if (state.chiefOfStaffId === secretaryId) {
    lines.push({
      id: "chief-of-staff",
      text: "Acting Chief of Staff",
      emphasis: true,
    });
  }

  return lines;
}

export function secretaryIsAssigned(
  secretaryId: SecretaryId,
  state: Pick<GameState, "chiefOfStaffId">,
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

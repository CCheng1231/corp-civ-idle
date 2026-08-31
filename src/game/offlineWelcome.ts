import {
  RESEARCH,
  RESOURCE_LABELS,
  STRUCTURES,
  formatNumber,
  officeSiteLabel,
} from "./constants";
import { ownedOfficeIds } from "./branchSites";
import { formatQueueTimeMs } from "./timers";
import { unitDefinition } from "./unitEffects";
import type {
  GameState,
  OfflineWelcomeSummary,
  ResourceCost,
  Resources,
  UnitId,
} from "./types";

/** Don't pop the dialog for short reloads / tab flickers. */
export const OFFLINE_WELCOME_MIN_SEC = 2 * 60;

function resourceGains(before: Resources, after: Resources): ResourceCost {
  const gained: ResourceCost = {};
  for (const key of Object.keys(before) as (keyof Resources)[]) {
    const delta = after[key] - before[key];
    if (delta > 0.0001) {
      gained[key] = delta;
    }
  }
  return gained;
}

function structureCompletionLines(
  before: GameState,
  after: GameState,
): string[] {
  const lines: string[] = [];
  for (const officeId of ownedOfficeIds(after)) {
    for (const def of STRUCTURES) {
      const from = before.structureLevelsByLocation[officeId][def.id] ?? 0;
      const to = after.structureLevelsByLocation[officeId][def.id] ?? 0;
      if (to > from) {
        const site = officeSiteLabel(before, officeId);
        lines.push(
          to - from === 1
            ? `${def.name} → Lv ${to} (${site})`
            : `${def.name} Lv ${from} → ${to} (${site})`,
        );
      }
    }
  }
  return lines;
}

function researchCompletionLines(
  before: GameState,
  after: GameState,
): string[] {
  const lines: string[] = [];
  for (const def of RESEARCH) {
    const from = before.researchLevels[def.id] ?? 0;
    const to = after.researchLevels[def.id] ?? 0;
    if (to > from) {
      lines.push(
        to - from === 1
          ? `${def.name} → Lv ${to}`
          : `${def.name} Lv ${from} → ${to}`,
      );
    }
  }
  return lines;
}

function hireCompletionLines(before: GameState, after: GameState): string[] {
  const lines: string[] = [];
  for (const officeId of ownedOfficeIds(after)) {
    const beforeRoster = before.contractorsByLocation[officeId];
    const afterRoster = after.contractorsByLocation[officeId];
    for (const unitId of Object.keys(afterRoster) as UnitId[]) {
      const from = beforeRoster[unitId] ?? 0;
      const to = afterRoster[unitId] ?? 0;
      const gained = to - from;
      if (gained > 0) {
        const name = unitDefinition(unitId).name;
        const site = officeSiteLabel(before, officeId);
        lines.push(
          gained === 1
            ? `${name} arrived (${site})`
            : `${name} ×${gained} arrived (${site})`,
        );
      }
    }
  }
  return lines;
}

export function formatOfflineAway(awaySec: number): string {
  return formatQueueTimeMs(awaySec * 1000);
}

export function formatOfflineGained(gained: ResourceCost): string {
  const parts = (Object.keys(gained) as (keyof Resources)[])
    .filter((key) => (gained[key] ?? 0) > 0)
    .map(
      (key) =>
        `${RESOURCE_LABELS[key]} ${formatNumber(gained[key] ?? 0)}`,
    );
  return parts.join(" · ");
}

export function buildOfflineWelcomeSummary(
  before: GameState,
  afterQueues: GameState,
  afterProduction: GameState,
  awaySec: number,
): OfflineWelcomeSummary | null {
  if (awaySec < OFFLINE_WELCOME_MIN_SEC) return null;

  const gained = resourceGains(afterQueues.resources, afterProduction.resources);
  const structures = structureCompletionLines(before, afterQueues);
  const research = researchCompletionLines(before, afterQueues);
  const hires = hireCompletionLines(before, afterQueues);
  const jobsFinished = Math.max(
    0,
    before.jobEngagements.length - afterQueues.jobEngagements.length,
  );

  const hasGains = Object.keys(gained).length > 0;
  const hasCompletions =
    structures.length > 0 ||
    research.length > 0 ||
    hires.length > 0 ||
    jobsFinished > 0;

  if (!hasGains && !hasCompletions) return null;

  return {
    awaySec,
    gained,
    structures,
    research,
    hires,
    jobsFinished,
  };
}

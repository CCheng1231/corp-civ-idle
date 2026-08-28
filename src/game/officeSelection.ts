import { recruitmentJobsAtOffice } from "./constants";
import { officeDisplayName, ownedOfficeIds } from "./mapWorld";
import type {
  GameState,
  OfficeLocationId,
  OfficeSelectionId,
  RecruitmentJob,
  ResearchJob,
  StructureBuildJob,
} from "./types";

export function isAllOfficesSelected(
  selection: OfficeSelectionId,
): selection is "all" {
  return selection === "all";
}

export function allOfficesOptionAvailable(state: GameState): boolean {
  return state.branchEstablished;
}

/** Last specific HQ/Branch — used for read-only catalogs and engine fallbacks. */
export function lastSelectedOffice(state: GameState): OfficeLocationId {
  if (!isAllOfficesSelected(state.selectedOffice)) {
    return state.selectedOffice;
  }
  return state.lastSelectedOffice;
}

export function resolveOfficeLocation(
  state: GameState,
  officeId?: OfficeSelectionId,
): OfficeLocationId {
  const pick = officeId ?? state.selectedOffice;
  if (isAllOfficesSelected(pick)) {
    return lastSelectedOffice(state);
  }
  return pick;
}

export function officeSiteLabel(
  state: GameState,
  officeId: OfficeLocationId,
): string {
  return officeDisplayName(state, officeId);
}

export interface OfficeTaggedJob<T> {
  job: T;
  officeId: OfficeLocationId;
  siteLabel: string;
}

export function structureJobsForOffices(
  state: GameState,
  officeIds: OfficeLocationId[] = ownedOfficeIds(state),
): OfficeTaggedJob<StructureBuildJob>[] {
  const entries: OfficeTaggedJob<StructureBuildJob>[] = [];
  for (const officeId of officeIds) {
    const siteLabel = officeSiteLabel(state, officeId);
    for (const job of state.structureQueues[officeId]) {
      entries.push({ job, officeId, siteLabel });
    }
  }
  return entries;
}

export function researchJobsForOffices(
  state: GameState,
  officeIds: OfficeLocationId[] = ownedOfficeIds(state),
): OfficeTaggedJob<ResearchJob>[] {
  const entries: OfficeTaggedJob<ResearchJob>[] = [];
  for (const officeId of officeIds) {
    const siteLabel = officeSiteLabel(state, officeId);
    for (const job of state.researchQueues[officeId] ?? []) {
      entries.push({ job, officeId, siteLabel });
    }
  }
  return entries;
}

export function recruitmentJobsForOffices(
  state: GameState,
  officeIds: OfficeLocationId[] = ownedOfficeIds(state),
): OfficeTaggedJob<RecruitmentJob>[] {
  const entries: OfficeTaggedJob<RecruitmentJob>[] = [];
  for (const officeId of officeIds) {
    const siteLabel = officeSiteLabel(state, officeId);
    for (const job of recruitmentJobsAtOffice(state, officeId)) {
      entries.push({ job, officeId, siteLabel });
    }
  }
  return entries;
}

export function totalStaffAcrossOffices(state: GameState): number {
  return ownedOfficeIds(state).reduce(
    (sum, officeId) =>
      sum +
      Object.values(state.contractorsByLocation[officeId]).reduce(
        (inner, count) => inner + (count ?? 0),
        0,
      ),
    0,
  );
}

import type {
  GameState,
  OfficeLocationId,
  UnitId,
  UnitRoster,
} from "./types";
import {
  branchOfficeIdForSite,
  isBranchOfficeId,
  parseBranchOfficeId,
} from "./branchSites";
import { withDerivedStats } from "./engineQueues";

function mergeRosterInto(target: UnitRoster, from: UnitRoster): UnitRoster {
  const next = { ...target };
  for (const unitId of Object.keys(from) as UnitId[]) {
    const count = from[unitId] ?? 0;
    if (count <= 0) continue;
    next[unitId] = (next[unitId] ?? 0) + count;
  }
  return next;
}

function transitTargetsPad(
  transit: GameState["branchEstablishmentTransits"][number],
  hexKey: string | undefined,
  padIndex: number | undefined,
  commercialLotId: string | undefined,
): boolean {
  if (hexKey != null && padIndex != null) {
    return transit.hexKey === hexKey && transit.padIndex === padIndex;
  }
  if (commercialLotId != null && padIndex != null) {
    return false;
  }
  return false;
}

/** Dev map only — wipe a branch site and all per-office state; staff return to HQ. */
export function removeBranchOfficeForDev(
  state: GameState,
  officeId: OfficeLocationId,
): GameState | null {
  if (state.settings.mapPresentation !== "dev") return null;
  if (!isBranchOfficeId(officeId)) return null;
  const site = state.branchSites.find(
    (s) => branchOfficeIdForSite(s) === officeId,
  );
  if (!site) return null;

  const parsed = parseBranchOfficeId(officeId);
  const next = structuredClone(state);

  next.branchSites = next.branchSites.filter(
    (site) => branchOfficeIdForSite(site) !== officeId,
  );

  const branchRoster = next.contractorsByLocation[officeId];
  if (branchRoster) {
    next.contractorsByLocation = {
      ...next.contractorsByLocation,
      hq: mergeRosterInto(next.contractorsByLocation.hq, branchRoster),
    };
  }

  delete next.structureLevelsByLocation[officeId];
  delete next.contractorsByLocation[officeId];
  delete next.structureQueues[officeId];
  delete next.researchQueues[officeId];
  next.recruitmentJobs = next.recruitmentJobs.filter(
    (job) => job.officeId !== officeId,
  );

  if (parsed) {
    next.branchEstablishmentTransits =
      next.branchEstablishmentTransits.filter(
        (transit) =>
          !transitTargetsPad(
            transit,
            parsed.hexKey,
            parsed.slotIndex,
            parsed.commercialLotId,
          ),
      );
  }

  if (
    next.selectedOffice === officeId ||
    next.lastSelectedOffice === officeId
  ) {
    next.selectedOffice = "hq";
    next.lastSelectedOffice = "hq";
    next.settings = { ...next.settings, mapMainOffice: "hq", mapReferenceOfficeId: "hq" };
  } else if (next.settings.mapReferenceOfficeId === officeId) {
    next.settings = {
      ...next.settings,
      mapMainOffice: "hq",
      mapReferenceOfficeId: "hq",
    };
  }

  return withDerivedStats(next);
}

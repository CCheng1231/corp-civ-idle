import { MAP_GOV, axialEquals, officeAtCoord } from "../game/hexLayout";
import { OFFICE_LABELS } from "../game/constants";
import {
  REGION_LABELS,
  commercialSiteAt,
  hexDistanceFromHq,
  isAvailableCommercialLot,
  regionAtCoord,
  towerAtCoord,
  towerById,
} from "../game/mapWorld";
import type { AxialCoord, GameState, OfficeLocationId, TowerId } from "../game/types";
export type MapHexInfo =
  | { kind: "gov"; coord: AxialCoord; region: ReturnType<typeof regionAtCoord> }
  | {
      kind: "office";
      coord: AxialCoord;
      officeId: OfficeLocationId;
      region: ReturnType<typeof regionAtCoord>;
    }
  | {
      kind: "tower";
      coord: AxialCoord;
      towerId: TowerId;
      region: ReturnType<typeof regionAtCoord>;
    }
  | {
      kind: "commercial";
      coord: AxialCoord;
      label: string;
      region: ReturnType<typeof regionAtCoord>;
      available: boolean;
    }
  | { kind: "terrain"; coord: AxialCoord; region: ReturnType<typeof regionAtCoord> };

export function mapHexInfo(coord: AxialCoord, state: GameState): MapHexInfo {
  const region = regionAtCoord(coord);

  if (axialEquals(coord, MAP_GOV)) {
    return { kind: "gov", coord, region };
  }

  const officeId = officeAtCoord(coord, {
    established: state.branchEstablished,
    coord: state.branchCoord,
  });
  if (officeId) {
    return { kind: "office", coord, officeId, region };
  }

  const towerId = towerAtCoord(coord);
  if (towerId) {
    return { kind: "tower", coord, towerId, region };
  }

  const commercial = commercialSiteAt(coord);
  if (commercial) {
    return {
      kind: "commercial",
      coord,
      label: commercial.label,
      region: commercial.region,
      available: isAvailableCommercialLot(coord, state),
    };
  }

  return { kind: "terrain", coord, region };
}

export function mapHexTitle(info: MapHexInfo): string {  switch (info.kind) {
    case "gov":
      return "Regional government seat";
    case "office":
      return OFFICE_LABELS[info.officeId];
    case "tower":
      return towerById(info.towerId).name;
    case "commercial":
      return info.label;
    case "terrain":
      return REGION_LABELS[info.region];
  }
}

export function mapHexKindLabel(info: MapHexInfo): string {
  switch (info.kind) {
    case "gov":
      return "Government";
    case "office":
      return "Company office";
    case "tower":
      return "Office tower";
    case "commercial":
      return "Commercial lot";
    case "terrain":
      return "Open region";
  }
}

export function mapHexDistanceLabel(coord: AxialCoord): string {
  const steps = hexDistanceFromHq(coord);
  return steps === 0 ? "At HQ tile" : `${steps} hex${steps === 1 ? "" : "es"} from HQ`;
}

export function towerEngagementCount(state: GameState, towerId: TowerId): number {
  return state.jobEngagements.filter((engagement) => {
    const posting = state.jobPostings.find((p) => p.id === engagement.postingId);
    return posting?.towerId === towerId;
  }).length;
}

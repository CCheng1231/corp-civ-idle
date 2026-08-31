import { MAP_GOV, axialEquals } from "../game/hexLayout";
import { officeAtForState } from "../multiplayer/playerHq";
import {
  hexDistanceFromMainOfficeForState,
  REGION_LABELS,
  commercialSiteAt,
  isAvailableCommercialLot,
  officeDisplayName,
  regionAtCoord,
  towerAtCoord,
  towerById,
} from "../game/mapWorld";
import type {
  AxialCoord,
  CommercialLotId,
  GameState,
  OfficeLocationId,
  TowerId,
} from "../game/types";
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
      commercialLotId: CommercialLotId;
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

  const officeId = officeAtForState(coord, state);
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
      commercialLotId: commercial.id,
      label: commercial.label,
      region: commercial.region,
      available: isAvailableCommercialLot(coord, state),
    };
  }

  return { kind: "terrain", coord, region };
}

export function mapHexTitle(info: MapHexInfo, state?: GameState): string {
  switch (info.kind) {
    case "gov":
      return "Regional government seat";
    case "office":
      return state
        ? officeDisplayName(state, info.officeId)
        : info.officeId === "hq"
          ? "HQ"
          : "Branch Office";
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

export function mapHexDistanceLabel(state: GameState, coord: AxialCoord): string {
  const steps = hexDistanceFromMainOfficeForState(state, coord);
  return `${steps} hex${steps === 1 ? "" : "es"}`;
}

export function towerEngagementCount(state: GameState, towerId: TowerId): number {
  return state.jobEngagements.filter((engagement) => {
    const posting = state.jobPostings.find((p) => p.id === engagement.postingId);
    return posting?.towerId === towerId;
  }).length;
}

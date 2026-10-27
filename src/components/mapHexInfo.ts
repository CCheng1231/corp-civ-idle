import { MAP_GOV, axialEquals } from "../game/hexLayout";
import { officeAtForState, playerHqSiteAt } from "../multiplayer/playerHq";
import type { PlayerId } from "../multiplayer/types";
import { PLAYER_LABELS } from "../multiplayer/types";
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
import { majorHubAtCoord } from "../game/worldMapMajorHubs";
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
  | {
      kind: "major-hub";
      coord: AxialCoord;
      hubId: string;
      label: string;
      region: ReturnType<typeof regionAtCoord>;
    }
  | {
      kind: "player-hq";
      coord: AxialCoord;
      playerId: PlayerId;
      region: ReturnType<typeof regionAtCoord>;
    }
  | { kind: "terrain"; coord: AxialCoord; region: ReturnType<typeof regionAtCoord> };

export function mapHexInfo(coord: AxialCoord, state: GameState): MapHexInfo {
  const region = regionAtCoord(coord, state.settings);

  if (axialEquals(coord, MAP_GOV)) {
    return { kind: "gov", coord, region };
  }

  const officeId = officeAtForState(coord, state);
  if (officeId) {
    return { kind: "office", coord, officeId, region };
  }

  const playerHq = playerHqSiteAt(coord, state.settings);
  if (playerHq) {
    return {
      kind: "player-hq",
      coord,
      playerId: playerHq.id,
      region,
    };
  }

  const towerId = towerAtCoord(coord, state.settings);
  if (towerId) {
    return { kind: "tower", coord, towerId, region };
  }

  const commercial = commercialSiteAt(coord, state.settings);
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

  const major = majorHubAtCoord(coord, state.settings);
  if (major) {
    return {
      kind: "major-hub",
      coord,
      hubId: major.id,
      label: major.label,
      region,
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
    case "major-hub":
      return info.label;
    case "player-hq":
      return `${PLAYER_LABELS[info.playerId]} HQ`;
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
    case "major-hub":
      return "Major hub";
    case "player-hq":
      return "Player headquarters";
    case "terrain":
      return "Open region";
  }
}

export function mapHexDistanceLabel(state: GameState, coord: AxialCoord): string {
  const steps = hexDistanceFromMainOfficeForState(state, coord);
  return `${steps} Hx`;
}

export function towerEngagementCount(state: GameState, towerId: TowerId): number {
  return state.jobEngagements.filter((engagement) => {
    const posting = state.jobPostings.find((p) => p.id === engagement.postingId);
    return posting?.towerId === towerId;
  }).length;
}

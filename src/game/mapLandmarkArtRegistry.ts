/**
 * Static art definitions for player-map landmarks (assets + layout presets).
 */
import {
  loadBranchPadCampusBake2x,
  loadBranchPadCompactBake2x,
  loadBranchPadStandardBake2x,
  loadCommercialCountrysideLotBake2x,
  loadCommercialRuralHighwayBake2x,
  loadCommercialSuburbanStripBake2x,
  loadGovCapitolBake2x,
  loadMajorHubSupertallBake2x,
  loadOfficeTowerCountryEstateBake2x,
  loadOfficeTowerMetroCentralBake2x,
  loadOfficeTowerRuralCrossingBake2x,
  loadOfficeTowerSuburbanParkBake2x,
  loadPlayerHqMineBake2x,
  loadPlayerHqPeerBake2x,
} from "./mapLandmarkBakedAssets";
import {
  MAP_BAKED_LANDMARK_BRANCH_PAD_CAMPUS,
  MAP_BAKED_LANDMARK_BRANCH_PAD_COMPACT,
  MAP_BAKED_LANDMARK_BRANCH_PAD_STANDARD,
  MAP_BAKED_LANDMARK_COMMERCIAL_COUNTRYSIDE_LOT,
  MAP_BAKED_LANDMARK_COMMERCIAL_RURAL_HIGHWAY,
  MAP_BAKED_LANDMARK_COMMERCIAL_SUBURBAN_STRIP,
  MAP_BAKED_LANDMARK_GOV_CAPITOL,
  MAP_BAKED_LANDMARK_MAJOR_HUB_SUPERTALL,
  MAP_BAKED_LANDMARK_OFFICE_TOWER_COUNTRYSIDE,
  MAP_BAKED_LANDMARK_OFFICE_TOWER_METRO,
  MAP_BAKED_LANDMARK_OFFICE_TOWER_RURAL,
  MAP_BAKED_LANDMARK_OFFICE_TOWER_SUBURBAN,
  MAP_BAKED_LANDMARK_PLAYER_HQ_MINE,
  MAP_BAKED_LANDMARK_PLAYER_HQ_PEER,
  type MapBakedLandmarkPreset,
} from "./mapBakedLandmark";

export type KnownMapLandmarkArtId =
  | "gov-capitol"
  | "major-hub-supertall"
  | "commercial-suburban-strip"
  | "commercial-rural-highway"
  | "commercial-countryside-lot"
  | "office-tower-metro-central"
  | "office-tower-suburban-park"
  | "office-tower-rural-crossing"
  | "office-tower-country-estate"
  | "player-hq-mine"
  | "player-hq-peer"
  | "branch-pad-compact"
  | "branch-pad-standard"
  | "branch-pad-campus";
export type MapLandmarkArtId = KnownMapLandmarkArtId | (string & {});

export type MapLandmarkArtDefinition = {
  id: string;
  plane: "svg";
  kind: "baked-raster";
  preset: MapBakedLandmarkPreset;
  loadHref: () => Promise<string>;
  className: string;
};

function bakedEntry(
  id: string,
  preset: MapBakedLandmarkPreset,
  loadHref: () => Promise<string>,
  className: string,
): MapLandmarkArtDefinition {
  return { id, plane: "svg", kind: "baked-raster", preset, loadHref, className };
}

export const MAP_LANDMARK_ART: Record<string, MapLandmarkArtDefinition> = {
  "gov-capitol": bakedEntry(
    "gov-capitol",
    MAP_BAKED_LANDMARK_GOV_CAPITOL,
    loadGovCapitolBake2x,
    "map-gov-capitol-bake",
  ),
  "major-hub-supertall": bakedEntry(
    "major-hub-supertall",
    MAP_BAKED_LANDMARK_MAJOR_HUB_SUPERTALL,
    loadMajorHubSupertallBake2x,
    "map-major-hub-bake",
  ),
  "commercial-suburban-strip": bakedEntry(
    "commercial-suburban-strip",
    MAP_BAKED_LANDMARK_COMMERCIAL_SUBURBAN_STRIP,
    loadCommercialSuburbanStripBake2x,
    "map-commercial-lot-bake map-commercial-lot-bake-suburban",
  ),
  "commercial-rural-highway": bakedEntry(
    "commercial-rural-highway",
    MAP_BAKED_LANDMARK_COMMERCIAL_RURAL_HIGHWAY,
    loadCommercialRuralHighwayBake2x,
    "map-commercial-lot-bake map-commercial-lot-bake-rural",
  ),
  "commercial-countryside-lot": bakedEntry(
    "commercial-countryside-lot",
    MAP_BAKED_LANDMARK_COMMERCIAL_COUNTRYSIDE_LOT,
    loadCommercialCountrysideLotBake2x,
    "map-commercial-lot-bake map-commercial-lot-bake-countryside",
  ),
  "office-tower-metro-central": bakedEntry(
    "office-tower-metro-central",
    MAP_BAKED_LANDMARK_OFFICE_TOWER_METRO,
    loadOfficeTowerMetroCentralBake2x,
    "map-office-tower-bake map-office-tower-bake-metro",
  ),
  "office-tower-suburban-park": bakedEntry(
    "office-tower-suburban-park",
    MAP_BAKED_LANDMARK_OFFICE_TOWER_SUBURBAN,
    loadOfficeTowerSuburbanParkBake2x,
    "map-office-tower-bake map-office-tower-bake-suburban",
  ),
  "office-tower-rural-crossing": bakedEntry(
    "office-tower-rural-crossing",
    MAP_BAKED_LANDMARK_OFFICE_TOWER_RURAL,
    loadOfficeTowerRuralCrossingBake2x,
    "map-office-tower-bake map-office-tower-bake-rural",
  ),
  "office-tower-country-estate": bakedEntry(
    "office-tower-country-estate",
    MAP_BAKED_LANDMARK_OFFICE_TOWER_COUNTRYSIDE,
    loadOfficeTowerCountryEstateBake2x,
    "map-office-tower-bake map-office-tower-bake-countryside",
  ),
  "player-hq-mine": bakedEntry(
    "player-hq-mine",
    MAP_BAKED_LANDMARK_PLAYER_HQ_MINE,
    loadPlayerHqMineBake2x,
    "map-player-hq-bake map-player-hq-bake-mine",
  ),
  "player-hq-peer": bakedEntry(
    "player-hq-peer",
    MAP_BAKED_LANDMARK_PLAYER_HQ_PEER,
    loadPlayerHqPeerBake2x,
    "map-player-hq-bake map-player-hq-bake-peer",
  ),
  "branch-pad-compact": bakedEntry(
    "branch-pad-compact",
    MAP_BAKED_LANDMARK_BRANCH_PAD_COMPACT,
    loadBranchPadCompactBake2x,
    "map-branch-pad-bake map-branch-pad-bake-compact",
  ),
  "branch-pad-standard": bakedEntry(
    "branch-pad-standard",
    MAP_BAKED_LANDMARK_BRANCH_PAD_STANDARD,
    loadBranchPadStandardBake2x,
    "map-branch-pad-bake map-branch-pad-bake-standard",
  ),
  "branch-pad-campus": bakedEntry(
    "branch-pad-campus",
    MAP_BAKED_LANDMARK_BRANCH_PAD_CAMPUS,
    loadBranchPadCampusBake2x,
    "map-branch-pad-bake map-branch-pad-bake-campus",
  ),
};

export function getMapLandmarkArt(
  artId: string,
): MapLandmarkArtDefinition | undefined {
  return MAP_LANDMARK_ART[artId];
}

export type MapLandmarkSiteKind =
  | "gov"
  | "major-hub"
  | "commercial-lot"
  | "office-tower"
  | "player-hq"
  | "branch-pad"
  | "unique";

export function defaultSiteKindForArtId(artId: string): MapLandmarkSiteKind {
  if (artId === "gov-capitol") return "gov";
  if (artId === "major-hub-supertall") return "major-hub";
  if (artId.startsWith("commercial-")) return "commercial-lot";
  if (artId.startsWith("office-tower-")) return "office-tower";
  if (artId.startsWith("player-hq-")) return "player-hq";
  if (artId.startsWith("branch-pad-")) return "branch-pad";
  return "unique";
}

export function mapLandmarkArtDisplayName(artId: string): string {
  if (artId === "gov-capitol") return "Regional capitol";
  if (artId === "major-hub-supertall") return "Major hub tower";
  if (artId === "commercial-suburban-strip") return "Suburban strip parcel";
  if (artId === "commercial-rural-highway") return "Rural highway frontage";
  if (artId === "commercial-countryside-lot") return "Countryside lot";
  if (artId === "office-tower-metro-central") return "Central Exchange Tower";
  if (artId === "office-tower-suburban-park") return "Parkview Office Tower";
  if (artId === "office-tower-rural-crossing") return "Crossroads Business Tower";
  if (artId === "office-tower-country-estate") return "Hillside Corporate Tower";
  if (artId === "player-hq-mine") return "Company HQ";
  if (artId === "player-hq-peer") return "Peer company HQ";
  if (artId === "branch-pad-compact") return "Branch office · compact";
  if (artId === "branch-pad-standard") return "Branch office · standard";
  if (artId === "branch-pad-campus") return "Branch office · campus";
  return artId.replace(/-/g, " ");
}

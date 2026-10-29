/**
 * Static art definitions for player-map landmarks (assets + layout presets).
 */
import {
  loadCommercialCountrysideLotBake2x,
  loadCommercialRuralHighwayBake2x,
  loadCommercialSuburbanStripBake2x,
  loadGovCapitolBake2x,
} from "./mapLandmarkBakedAssets";
import {
  MAP_BAKED_LANDMARK_COMMERCIAL_COUNTRYSIDE_LOT,
  MAP_BAKED_LANDMARK_COMMERCIAL_RURAL_HIGHWAY,
  MAP_BAKED_LANDMARK_COMMERCIAL_SUBURBAN_STRIP,
  MAP_BAKED_LANDMARK_GOV_CAPITOL,
  type MapBakedLandmarkPreset,
} from "./mapBakedLandmark";

export type KnownMapLandmarkArtId =
  | "gov-capitol"
  | "major-hub-supertall"
  | "commercial-suburban-strip"
  | "commercial-rural-highway"
  | "commercial-countryside-lot";
export type MapLandmarkArtId = KnownMapLandmarkArtId | (string & {});

export type MapLandmarkArtDefinition =
  | {
      id: string;
      plane: "svg";
      kind: "baked-raster";
      preset: MapBakedLandmarkPreset;
      loadHref: () => Promise<string>;
      className: string;
    }
  | {
      id: string;
      plane: "svg";
      kind: "vector-inline";
      template: "major-hub-supertall";
      className: string;
    }
  | {
      id: string;
      plane: "html-overlay";
      kind: "css-3d-tower";
      template: "hq-office-tower";
      className: string;
    };

export const MAP_LANDMARK_ART: Record<string, MapLandmarkArtDefinition> = {
  "gov-capitol": {
    id: "gov-capitol",
    plane: "svg",
    kind: "baked-raster",
    preset: MAP_BAKED_LANDMARK_GOV_CAPITOL,
    loadHref: loadGovCapitolBake2x,
    className: "map-gov-capitol-bake",
  },
  "major-hub-supertall": {
    id: "major-hub-supertall",
    plane: "svg",
    kind: "vector-inline",
    template: "major-hub-supertall",
    className: "map-major-hub-supertall-marker",
  },
  "commercial-suburban-strip": {
    id: "commercial-suburban-strip",
    plane: "svg",
    kind: "baked-raster",
    preset: MAP_BAKED_LANDMARK_COMMERCIAL_SUBURBAN_STRIP,
    loadHref: loadCommercialSuburbanStripBake2x,
    className: "map-commercial-lot-bake map-commercial-lot-bake-suburban",
  },
  "commercial-rural-highway": {
    id: "commercial-rural-highway",
    plane: "svg",
    kind: "baked-raster",
    preset: MAP_BAKED_LANDMARK_COMMERCIAL_RURAL_HIGHWAY,
    loadHref: loadCommercialRuralHighwayBake2x,
    className: "map-commercial-lot-bake map-commercial-lot-bake-rural",
  },
  "commercial-countryside-lot": {
    id: "commercial-countryside-lot",
    plane: "svg",
    kind: "baked-raster",
    preset: MAP_BAKED_LANDMARK_COMMERCIAL_COUNTRYSIDE_LOT,
    loadHref: loadCommercialCountrysideLotBake2x,
    className: "map-commercial-lot-bake map-commercial-lot-bake-countryside",
  },
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
  | "unique";

export function defaultSiteKindForArtId(artId: string): MapLandmarkSiteKind {
  if (artId === "gov-capitol") return "gov";
  if (artId === "major-hub-supertall") return "major-hub";
  if (artId.startsWith("commercial-")) return "commercial-lot";
  return "unique";
}

export function mapLandmarkArtDisplayName(artId: string): string {
  if (artId === "gov-capitol") return "Regional capitol";
  if (artId === "major-hub-supertall") return "Major hub tower";
  if (artId === "commercial-suburban-strip") return "Suburban strip parcel";
  if (artId === "commercial-rural-highway") return "Rural highway frontage";
  if (artId === "commercial-countryside-lot") return "Countryside lot";
  return artId.replace(/-/g, " ");
}

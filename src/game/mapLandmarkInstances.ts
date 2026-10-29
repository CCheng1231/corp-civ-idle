/**
 * Resolves which landmark art instances to draw on the player map.
 *
 * Add providers here — not in WorldView.
 * Multi-hex: use `landmarkArtInstanceMultiHex` (footprint length ≥ 2).
 * Unique building: register art in mapLandmarkArtRegistry.ts, then reference by artId.
 */
import { MAP_GOV, axialEquals, axialKey, type AxialCoord } from "./hexLayout";
import type { GameSettings } from "./types";
import {
  defaultSiteKindForArtId,
  type MapLandmarkArtId,
  type MapLandmarkSiteKind,
} from "./mapLandmarkArtRegistry";
import type { MapLandmarkFootprint } from "./mapLandmarkPresentation";
import { resolveZ1MajorHubs } from "./worldMapMajorHubs";
import { playerWorldLandmarkArtVisible } from "./mapLandmarkPolicy";
import { canonMultiHexLandmarkProviders } from "./mapLandmarkCanonSites";
import { COMMERCIAL_REAL_ESTATE } from "./mapWorld";
import { effectiveLandmarkCoord } from "./mapDevLayout";
import type { CommercialLotId } from "./types";

export interface MapLandmarkArtInstance {
  instanceKey: string;
  siteId: string;
  artId: MapLandmarkArtId;
  footprint: MapLandmarkFootprint;
  /** Primary hex — inspect, travel, dev focus (especially for multi-hex). */
  anchorCoord: AxialCoord;
  variant?: string;
  /** Overrides default ring/hide-fill styling from artId. */
  siteKind?: MapLandmarkSiteKind;
}

export interface MapLandmarkHexSiteMeta {
  siteKind: MapLandmarkSiteKind;
  siteId: string;
  /** True when footprint covers more than one hex. */
  multiHex: boolean;
}

export type MapLandmarkSiteProvider = (
  settings: GameSettings,
) => MapLandmarkArtInstance[];

export function landmarkArtInstanceSingleHex(input: {
  instanceKey: string;
  siteId: string;
  artId: MapLandmarkArtId;
  coord: AxialCoord;
  variant?: string;
  siteKind?: MapLandmarkSiteKind;
}): MapLandmarkArtInstance {
  return {
    instanceKey: input.instanceKey,
    siteId: input.siteId,
    artId: input.artId,
    footprint: [input.coord],
    anchorCoord: input.coord,
    variant: input.variant,
    siteKind: input.siteKind,
  };
}

/** Multi-hex site — art layout uses footprint bbox (mapLandmarkPresentation). */
export function landmarkArtInstanceMultiHex(input: {
  instanceKey: string;
  siteId: string;
  artId: MapLandmarkArtId;
  footprint: MapLandmarkFootprint;
  primaryCoord: AxialCoord;
  variant?: string;
  siteKind?: MapLandmarkSiteKind;
}): MapLandmarkArtInstance {
  const footprint = input.footprint.filter(
    (c, i, arr) => arr.findIndex((o) => axialEquals(o, c)) === i,
  );
  if (footprint.length < 2) {
    const only = footprint[0] ?? input.primaryCoord;
    return landmarkArtInstanceSingleHex({
      instanceKey: input.instanceKey,
      siteId: input.siteId,
      artId: input.artId,
      coord: only,
      variant: input.variant,
      siteKind: input.siteKind,
    });
  }
  return {
    instanceKey: input.instanceKey,
    siteId: input.siteId,
    artId: input.artId,
    footprint,
    anchorCoord: input.primaryCoord,
    variant: input.variant,
    siteKind: input.siteKind ?? "unique",
  };
}

const govCapitolProvider: MapLandmarkSiteProvider = () => [
  landmarkArtInstanceSingleHex({
    instanceKey: "gov-capitol",
    siteId: "gov",
    artId: "gov-capitol",
    coord: MAP_GOV,
    siteKind: "gov",
  }),
];

const z1MajorHubProvider: MapLandmarkSiteProvider = (settings) =>
  resolveZ1MajorHubs(settings).map((hub) =>
    landmarkArtInstanceSingleHex({
      instanceKey: `major-hub-${hub.id}`,
      siteId: hub.id,
      artId: "major-hub-supertall",
      coord: hub.coord,
      variant: hub.id,
      siteKind: "major-hub",
    }),
  );

/*
 * Multi-hex template (enable when design + coords exist):
 *
 * const examplePlantProvider: MapLandmarkSiteProvider = () => [
 *   landmarkArtInstanceMultiHex({
 *     instanceKey: "plant-example",
 *     siteId: "plant-example",
 *     artId: "unique-plant-example", // register in MAP_LANDMARK_ART first
 *     footprint: [{ q: 1, r: 0 }, { q: 2, r: 0 }, { q: 1, r: 1 }],
 *     primaryCoord: { q: 1, r: 0 },
 *     siteKind: "unique",
 *   }),
 * ];
 */

const COMMERCIAL_LOT_ART_ID: Record<CommercialLotId, MapLandmarkArtId> = {
  suburban_strip: "commercial-suburban-strip",
  rural_highway: "commercial-rural-highway",
  countryside_lot: "commercial-countryside-lot",
};

const commercialLotLandmarkProvider: MapLandmarkSiteProvider = (settings) =>
  COMMERCIAL_REAL_ESTATE.map((lot) => {
    const coord =
      effectiveLandmarkCoord(`commercial:${lot.id}`, settings) ?? lot.coord;
    return landmarkArtInstanceSingleHex({
      instanceKey: `commercial-${lot.id}`,
      siteId: lot.id,
      artId: COMMERCIAL_LOT_ART_ID[lot.id],
      coord,
      siteKind: "commercial-lot",
    });
  });

const PLAYER_MAP_LANDMARK_PROVIDERS: MapLandmarkSiteProvider[] = [
  govCapitolProvider,
  z1MajorHubProvider,
  commercialLotLandmarkProvider,
  ...canonMultiHexLandmarkProviders,
];

export function playerLandmarkArtInstanceAtCoord(
  instances: MapLandmarkArtInstance[],
  coord: AxialCoord,
): MapLandmarkArtInstance | null {
  for (const inst of instances) {
    if (inst.footprint.some((c) => axialEquals(c, coord))) return inst;
  }
  return null;
}

export function resolvePlayerMapLandmarkArtInstances(
  settings: GameSettings,
): MapLandmarkArtInstance[] {
  if (!playerWorldLandmarkArtVisible(settings)) return [];
  return PLAYER_MAP_LANDMARK_PROVIDERS.flatMap((p) => p(settings));
}

export function buildPlayerMapLandmarkHexSiteIndex(
  instances: MapLandmarkArtInstance[],
): Map<string, MapLandmarkHexSiteMeta> {
  const index = new Map<string, MapLandmarkHexSiteMeta>();
  for (const inst of instances) {
    const siteKind =
      inst.siteKind ?? defaultSiteKindForArtId(String(inst.artId));
    const multiHex = inst.footprint.length > 1;
    for (const coord of inst.footprint) {
      index.set(axialKey(coord), { siteKind, siteId: inst.siteId, multiHex });
    }
  }
  return index;
}

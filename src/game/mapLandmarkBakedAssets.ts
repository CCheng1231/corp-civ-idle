/** Lazy-loaded baked landmark rasters (code-split; not in main chunk). */

export function loadGovCapitolBake2x(): Promise<string> {
  return import("../assets/map/gov-capitol-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadCommercialSuburbanStripBake2x(): Promise<string> {
  return import(
    "../assets/map/commercial-suburban-strip-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadCommercialRuralHighwayBake2x(): Promise<string> {
  return import(
    "../assets/map/commercial-rural-highway-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadCommercialCountrysideLotBake2x(): Promise<string> {
  return import(
    "../assets/map/commercial-countryside-lot-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadMajorHubSupertallBake2x(): Promise<string> {
  return import("../assets/map/major-hub-supertall-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadOfficeTowerMetroCentralBake2x(): Promise<string> {
  return import(
    "../assets/map/office-tower-metro-central-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadOfficeTowerSuburbanParkBake2x(): Promise<string> {
  return import(
    "../assets/map/office-tower-suburban-park-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadOfficeTowerRuralCrossingBake2x(): Promise<string> {
  return import(
    "../assets/map/office-tower-rural-crossing-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadOfficeTowerCountryEstateBake2x(): Promise<string> {
  return import(
    "../assets/map/office-tower-country-estate-isometric-bake@2x.png"
  ).then((m) => m.default);
}

export function loadPlayerHqMineBake2x(): Promise<string> {
  return import("../assets/map/player-hq-mine-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadPlayerHqPeerBake2x(): Promise<string> {
  return import("../assets/map/player-hq-peer-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadBranchPadCompactBake2x(): Promise<string> {
  return import("../assets/map/branch-pad-compact-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadBranchPadStandardBake2x(): Promise<string> {
  return import("../assets/map/branch-pad-standard-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

export function loadBranchPadCampusBake2x(): Promise<string> {
  return import("../assets/map/branch-pad-campus-isometric-bake@2x.png").then(
    (m) => m.default,
  );
}

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

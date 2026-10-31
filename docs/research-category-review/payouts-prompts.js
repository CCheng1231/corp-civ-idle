/**
 * Research tab — Project payouts (`mult`). Currently one project: bid_modeling.
 */
const PAYOUTS_ANTI_HERO =
  "Standalone isometric office module, NOT character battle splash";

const PAYOUTS_CARD_STYLE =
  "Isometric office vignette essentials wing soft pastel anime 16:9 single keystone tiny crop safe no text no logos";

const PAYOUTS_PASS2_VERSION_STYLE = {
  1: "Pass 2 v1 grounded anime Arknights soft sim pastels",
  2: "Pass 2 v2 grounded anime alternate angle",
  3: "Pass 2 v3 cinematic anime rim light",
  4: "Pass 2 v4 cinematic anime alternate lighting",
};

const PAYOUTS_BANNER_STYLE =
  "Wide isometric office wing project payouts research category banner spreadsheet analytics towers cash multiplier glow abstract job payout charts no text 16:9 strip crop";

const PAYOUTS_PROJECTS = [
  {
    id: "bid_modeling",
    name: "Bid Modeling",
    layout:
      "Analyst war room: dual monitors with spreadsheet grids and tower bid model blocks, calculator pad, stacked proposal folders blank",
    keystone:
      "Spreadsheet screens with tower silhouette blocks and upward cash payout arrow shapes golden accent",
  },
];

function payoutsPass2BannerPrompt(version) {
  const versionStyle = PAYOUTS_PASS2_VERSION_STYLE[version] ?? PAYOUTS_PASS2_VERSION_STYLE[1];
  return `${PAYOUTS_BANNER_STYLE}. ${PAYOUTS_ANTI_HERO}. Category project payouts. ${versionStyle}.`;
}

function payoutsPass2CardPrompt(version, researchId) {
  const row = PAYOUTS_PROJECTS.find((p) => p.id === researchId);
  const versionStyle = PAYOUTS_PASS2_VERSION_STYLE[version] ?? PAYOUTS_PASS2_VERSION_STYLE[1];
  return [
    PAYOUTS_CARD_STYLE,
    PAYOUTS_ANTI_HERO,
    versionStyle,
    `Research: ${row?.name ?? researchId}`,
    `Layout: ${row?.layout ?? ""}`,
    `Keystone: ${row?.keystone ?? ""}`,
  ].join(". ");
}

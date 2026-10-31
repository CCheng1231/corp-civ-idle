/**
 * Research tab — Resource efficiency category: banner + per-project card art.
 */
const RESOURCES_ANTI_HERO =
  "Standalone isometric office module, NOT character battle splash, NOT full-body hero";

const RESOURCES_CARD_STYLE =
  "Isometric office module vignette, essentials wing world, soft pastel anime background, single keystone readable at tiny vertical crop, no text no logos no readable UI, 16:9 negative space for UI crop";

const RESOURCES_MANUAL_SHARED_LAYOUT =
  "Same efficiency manual nook for all manual projects: small research desk angled binder stack open manual pages blank colored tabs workflow chart shapes without numbers";

const RESOURCES_PASS2_VERSION_STYLE = {
  1: "Pass 2 v1 grounded anime Arknights soft sim pastels balanced mid-tones",
  2: "Pass 2 v2 grounded anime alternate isometric angle same palette",
  3: "Pass 2 v3 cinematic anime rim light sharp keystone",
  4: "Pass 2 v4 cinematic anime alternate lighting v3 family",
};

const RESOURCES_BANNER_STYLE =
  "Wide isometric office research wing resource efficiency overview soft pastel anime optimization lab binders supply flow abstract no text 16:9 strip crop safe";

const RESOURCES_PROJECTS = [
  {
    id: "eff_manuals_cash",
    name: "Efficiency Manuals for $",
    keystone: "Gold coin stacks and cash tray beside binder stack hero accent warm yellow",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "eff_manuals_sup",
    name: "Efficiency Manuals for SUP",
    keystone: "Supply crates and closet shelves beside binders hero accent teal boxes",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "eff_manuals_con",
    name: "Efficiency Manuals for CON",
    keystone: "Abstract linked node constellation beside binders hero accent coral connection shapes",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "eff_manuals_mood",
    name: "Efficiency Manuals for Mood",
    keystone: "Coffee mug plant smile sticker shapes beside binders hero accent soft pink green morale",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "eff_manuals_rep",
    name: "Efficiency Manuals REP",
    keystone: "Star badge and microphone silhouette beside binders hero accent purple reputation glow",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "eff_manuals_grep",
    name: "Efficiency Manuals GREP",
    keystone: "Formal seal rosette shapes and liaison folder beside binders hero accent slate gov decor",
    layout: RESOURCES_MANUAL_SHARED_LAYOUT,
  },
  {
    id: "planning_ahead",
    name: "Planning ahead",
    keystone: "Forecast planning wall dual warehouse silo shapes cash and supply cap gauges abstract calendar grid",
    layout:
      "Distinct from manual nook: planning war room corner tall forecast board warehouse projection shelves timeline strips NOT binder desk clone",
  },
];

function researchIdToSlug(id) {
  return id.replace(/_/g, "-");
}

function resourcesPass2CardPrompt(version, researchId) {
  const row = RESOURCES_PROJECTS.find((p) => p.id === researchId);
  const versionStyle = RESOURCES_PASS2_VERSION_STYLE[version] ?? RESOURCES_PASS2_VERSION_STYLE[1];
  return [
    RESOURCES_CARD_STYLE,
    RESOURCES_ANTI_HERO,
    versionStyle,
    `Research: ${row?.name ?? researchId}`,
    `Layout: ${row?.layout ?? "Research pod"}`,
    `Keystone: ${row?.keystone ?? "Prop hero"}`,
  ].join(". ");
}

function resourcesPass2BannerPrompt(version) {
  const versionStyle = RESOURCES_PASS2_VERSION_STYLE[version] ?? RESOURCES_PASS2_VERSION_STYLE[1];
  return `${RESOURCES_BANNER_STYLE}. ${RESOURCES_ANTI_HERO}. Category resource efficiency. ${versionStyle}.`;
}

function resourcesEfficiencyPass2BannerPrompt(version) {
  return resourcesPass2BannerPrompt(version);
}

function resourcesEfficiencyBannerPrompt(variantNote) {
  return resourcesPass2BannerPrompt(1) + (variantNote ? `. ${variantNote}` : "");
}

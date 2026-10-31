/**
 * Research tab — Discover structures (`discover`). Five discover projects.
 * Card art = scouting pod echoing Build-tab target structure layout (not banner crop).
 */
const DISCOVER_ANTI_HERO =
  "Standalone isometric office module, NOT character battle splash, NOT a crop from category banner";

const DISCOVER_CARD_STYLE =
  "Isometric office vignette essentials wing soft pastel anime 16:9 single keystone tiny crop safe no text no logos no readable UI";

const DISCOVER_PASS2_VERSION_STYLE = {
  1: "Pass 2 v1 grounded anime Arknights soft sim pastels",
  2: "Pass 2 v2 grounded anime alternate isometric angle same palette",
  3: "Pass 2 v3 cinematic anime rim light sharp keystone",
  4: "Pass 2 v4 cinematic anime alternate lighting v3 family",
};

const DISCOVER_BANNER_STYLE =
  "Wide isometric office wing discover structures research category banner five distinct scouting pods mosaic blueprint tables site plan rolls survey gear soft pastel anime no text 16:9 strip crop safe";

const DISCOVER_BANNER_BRIEF =
  "Discover structures category header: wing slice with five separate scouting pods echoing video edit bay press stage company statue lobby generator bay MIT classroom — essentials palette, readable horizontal strip";

const DISCOVER_PROJECTS = [
  {
    id: "discover_video_studio",
    name: "Discover: Video production studio",
    slug: "discover-video-studio",
    structureRef: "video_production_studio",
    layout:
      "Scouting nook: blueprint table with rolled plans, tiny isometric maquette of split edit desk plus camera tripod silhouette on table",
    keystone:
      "Tabletop maquette showing edit monitors timeline shapes and camera tripod, blueprint rolls and compass",
  },
  {
    id: "discover_press_room",
    name: "Discover: Press Room",
    slug: "discover-press-room",
    structureRef: "press_room",
    layout:
      "Scouting nook: shallow stage maquette on table with podium mic cluster and monitor wall depth sketch",
    keystone: "Podium silhouette maquette and mic array on blueprint, survey tripod corner",
  },
  {
    id: "discover_company_statue",
    name: "Discover: Company Statue",
    slug: "discover-company-statue",
    structureRef: "company_statue",
    layout:
      "Scouting nook: lobby monument maquette on table with spotlight cone and plinth, rolled architectural elevation sheets",
    keystone: "Small company mascot statue maquette on plinth with soft spotlight, blueprint rolls",
  },
  {
    id: "discover_electricity_generator",
    name: "Discover: Electricity Generator",
    slug: "discover-electricity-generator",
    structureRef: "electricity_generator",
    layout:
      "Scouting nook: industrial bay maquette on table with paired generator blocks cooling fans and cable umbilicals sketch",
    keystone: "Generator housing maquette with fan grilles and green power glow accent on table",
  },
  {
    id: "discover_mit_room",
    name: "Discover: MIT room",
    slug: "discover-mit-room",
    structureRef: "mit_room",
    layout:
      "Scouting nook: classroom maquette on table U-shaped table projection screen wall flip chart easel silhouette",
    keystone: "U-table training room maquette with blank screen wall on blueprint table",
  },
];

function discoverPass2BannerPrompt(version) {
  const versionStyle = DISCOVER_PASS2_VERSION_STYLE[version] ?? DISCOVER_PASS2_VERSION_STYLE[1];
  return `${DISCOVER_BANNER_STYLE}. ${DISCOVER_BANNER_BRIEF}. ${DISCOVER_ANTI_HERO}. ${versionStyle}. Generate after structure card masters.`;
}

function discoverPass2CardPrompt(version, researchId) {
  const row = DISCOVER_PROJECTS.find((p) => p.id === researchId);
  const versionStyle = DISCOVER_PASS2_VERSION_STYLE[version] ?? DISCOVER_PASS2_VERSION_STYLE[1];
  return [
    DISCOVER_CARD_STYLE,
    DISCOVER_ANTI_HERO,
    versionStyle,
    `Research: ${row?.name ?? researchId}`,
    `Layout: ${row?.layout ?? ""}`,
    `Keystone: ${row?.keystone ?? ""}`,
    "Match Build-tab target structure floor plan language not identical copy",
  ].join(". ");
}

function discoverStructureRefImagePath(version, structureRef) {
  const v = version;
  const map = {
    video_production_studio: `departments/pass2/structures/departments-video-production-studio-pass2-v${v}.jpg`,
    press_room: `departments/pass2/structures/departments-press-room-pass2-v${v}.jpg`,
    company_statue: `essentials/pass2/structures/essentials-company-statue-pass2-v${v}.jpg`,
    electricity_generator: `power-research/pass2/structures/power-research-electricity-generator-pass2-v${v}.jpg`,
    mit_room: `recruitment/pass2/structures/recruitment-mit-room-pass2-v${v}.jpg`,
  };
  return map[structureRef] ?? null;
}

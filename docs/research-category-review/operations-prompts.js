/**
 * Research tab — Operations (`unlock`). Three projects.
 */
const OPERATIONS_ANTI_HERO =
  "Standalone isometric office module, NOT character battle splash, NOT category banner crop";

const OPERATIONS_CARD_STYLE =
  "Isometric office vignette essentials wing soft pastel anime 16:9 single keystone tiny crop safe no text no logos no readable UI";

const OPERATIONS_PASS2_VERSION_STYLE = {
  1: "Pass 2 v1 grounded anime Arknights soft sim pastels",
  2: "Pass 2 v2 grounded anime alternate isometric angle same palette",
  3: "Pass 2 v3 cinematic anime rim light sharp keystone",
  4: "Pass 2 v4 cinematic anime alternate lighting v3 family",
};

const OPERATIONS_BANNER_STYLE =
  "Wide isometric office wing operations research category banner three distinct strategy pods branch network job portfolio expansion planning soft pastel anime no text 16:9 strip crop safe";

const OPERATIONS_BANNER_BRIEF =
  "Operations category header wing slice three pods branch lead training bay concurrent jobs war room massive expansion network map table essentials palette horizontal strip";

const OPERATIONS_PROJECTS = [
  {
    id: "branch_management",
    name: "Branch Management",
    slug: "operations-branch-management",
    layout:
      "Branch ops nook: lead training desk with miniature commercial lot site model and tiny remote office tower maquette on table, relocation binders blank",
    keystone:
      "Commercial lot pad model with small office tower silhouette and branch lead chair cluster warm accent",
  },
  {
    id: "portfolio_management",
    name: "Portfolio Management",
    slug: "operations-portfolio-management",
    layout:
      "Portfolio war room: triple job board columns with abstract ticket cards and engagement slot gauges no readable text, central planner desk",
    keystone:
      "Three-column job board with stacked abstract job tiles and plus-slot counter shapes coral accent",
  },
  {
    id: "massive_expansion",
    name: "Massive Expansion",
    slug: "operations-massive-expansion",
    layout:
      "Expansion strategy table: isometric network map mat with many branch pad silhouettes linked by routes, tower count markers abstract",
    keystone:
      "Map table with clustered branch office tower models and expansion arrow routes teal network glow",
  },
];

function operationsPass2BannerPrompt(version) {
  const versionStyle = OPERATIONS_PASS2_VERSION_STYLE[version] ?? OPERATIONS_PASS2_VERSION_STYLE[1];
  return `${OPERATIONS_BANNER_STYLE}. ${OPERATIONS_BANNER_BRIEF}. ${OPERATIONS_ANTI_HERO}. ${versionStyle}. Generate after structure card masters.`;
}

function operationsPass2CardPrompt(version, researchId) {
  const row = OPERATIONS_PROJECTS.find((p) => p.id === researchId);
  const versionStyle = OPERATIONS_PASS2_VERSION_STYLE[version] ?? OPERATIONS_PASS2_VERSION_STYLE[1];
  return [
    OPERATIONS_CARD_STYLE,
    OPERATIONS_ANTI_HERO,
    versionStyle,
    `Research: ${row?.name ?? researchId}`,
    `Layout: ${row?.layout ?? ""}`,
    `Keystone: ${row?.keystone ?? ""}`,
    "Distinct layout per project not three identical desks",
  ].join(". ");
}

/**
 * Image-generation briefs — Build tab category "Power & research" (infrastructure).
 * Same family as Essentials / Departments. Pass 2: standalone layouts, structures first, banner last.
 */
const POWER_RESEARCH_ANTI_CLONE =
  "Standalone single-room isometric cutaway diorama, NOT a crop from a wide banner, unique floor plan for this structure only";

const POWER_RESEARCH_CARD_STYLE =
  "Isometric office module vignette, same building world as essentials wing, soft pastel anime background, single keystone prop readable at tiny vertical crop, no text no logos no readable UI, 16:9 with negative space for vertical UI crop";

const POWER_RESEARCH_BANNER_STYLE =
  "Wide isometric office floor banner, power and research wing overview mosaic, soft pastel anime background, three distinct pods on one tile electrical utility closet generator bay and R&D lab zone, not three identical rooms, no text no logos, 16:9 horizontal strip crop safe";

const POWER_RESEARCH_PASS2_VERSION_STYLE = {
  1: "Pass 2 set v1 grounded anime office wing, Arknights-inspired soft sim pastels, balanced mid-tones, gentle ambient light",
  2: "Pass 2 set v2 grounded anime, alternate isometric angles, same grounded palette family as v1",
  3: "Pass 2 set v3 cinematic anime UI background, 13 Sentinels-inspired depth, rim light, sharp keystone prop hero",
  4: "Pass 2 set v4 cinematic anime, alternate lighting within v3 family",
};

const POWER_RESEARCH_STRUCTURES = [
  {
    id: "power_panel",
    name: "Electrical Panel",
    layout:
      "Narrow utility alcove: open breaker panel wall, thick conduit bundles, amber status indicator lights, floor cable trays",
    camera: "Straight-on 3/4 toward breaker panel hero",
    keystone: "Electrical breaker panel with switch rows and glowing amber indicators, no readable labels",
    avoid: "No generator engines, no lab benches",
  },
  {
    id: "electricity_generator",
    name: "Electricity Generator",
    layout:
      "Open industrial bay: paired generator units or battery rack modules, exhaust vents, cooling fans, heavy floor grating",
    camera: "Low isometric angle emphasizing generator bulk",
    keystone: "Generator housings with cooling fans and power cable umbilicals, subtle green power glow",
    avoid: "Not a breaker closet, not a science lab",
  },
  {
    id: "dept_rnd",
    name: "Department of R&D",
    layout:
      "Bright research lab wing: glass lab benches, microscope silhouette, flask racks, blank holographic data sphere, rolling lab stool",
    camera: "Higher angle over lab bench row",
    keystone: "Lab bench with microscope and colored flask silhouettes, soft cyan research glow",
    avoid: "No electrical breaker wall, no diesel generators",
  },
];

const POWER_RESEARCH_BANNER_BRIEF =
  "Power and research category header: isometric wing slice with three separate pods electrical panel utility nook generator floor bay and R&D lab benches, essentials palette continuity, readable at small horizontal strip crop";

function powerResearchPass2StructurePrompt(version, structureId) {
  const row = POWER_RESEARCH_STRUCTURES.find((s) => s.id === structureId);
  const versionStyle =
    POWER_RESEARCH_PASS2_VERSION_STYLE[version] ?? POWER_RESEARCH_PASS2_VERSION_STYLE[1];
  const name = row?.name ?? structureId;
  return [
    POWER_RESEARCH_CARD_STYLE,
    POWER_RESEARCH_ANTI_CLONE,
    versionStyle,
    `Structure: ${name}`,
    `Layout: ${row?.layout ?? "Unique pod"}`,
    `Camera: ${row?.camera ?? "Isometric 3/4"}`,
    `Keystone: ${row?.keystone ?? "Single prop"}`,
    `Avoid: ${row?.avoid ?? "Clone layouts"}`,
  ].join(". ");
}

function powerResearchPass2BannerPrompt(version) {
  const versionStyle =
    POWER_RESEARCH_PASS2_VERSION_STYLE[version] ?? POWER_RESEARCH_PASS2_VERSION_STYLE[1];
  return `${POWER_RESEARCH_BANNER_STYLE}. ${POWER_RESEARCH_BANNER_BRIEF}. ${versionStyle}. Mosaic of three distinct pods; generate after structure masters.`;
}

function powerResearchStructurePrompt(structureId, variantNote) {
  return (
    powerResearchPass2StructurePrompt(1, structureId) +
    (variantNote ? `. ${variantNote}` : "")
  );
}

function powerResearchBannerPrompt(variantNote) {
  return `${POWER_RESEARCH_BANNER_STYLE}. ${POWER_RESEARCH_BANNER_BRIEF}. ${variantNote || "Version exploration."}`;
}

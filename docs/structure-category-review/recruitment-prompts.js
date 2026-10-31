/**
 * Image-generation briefs — Build tab category Recruitment (staffing).
 */
const RECRUITMENT_ANTI_CLONE =
  "Standalone single-room isometric cutaway diorama, NOT a crop from a wide banner, unique floor plan for this structure only";

const RECRUITMENT_CARD_STYLE =
  "Isometric office module vignette, same building world as essentials wing, soft pastel anime background, single keystone prop readable at tiny vertical crop, no text no logos no readable UI, 16:9 with negative space for vertical UI crop";

const RECRUITMENT_BANNER_STYLE =
  "Wide isometric office floor banner recruitment wing overview mosaic, soft pastel anime background, two distinct pods HR recruitment desk zone and MIT management training classroom, not duplicate layouts, no text no logos, 16:9 horizontal strip crop safe";

const RECRUITMENT_PASS2_VERSION_STYLE = {
  1: "Pass 2 set v1 grounded anime office wing, Arknights-inspired soft sim pastels, balanced mid-tones, gentle ambient light",
  2: "Pass 2 set v2 grounded anime, alternate isometric angles, same grounded palette family as v1",
  3: "Pass 2 set v3 cinematic anime UI background, 13 Sentinels-inspired depth, rim light, sharp keystone prop hero",
  4: "Pass 2 set v4 cinematic anime, alternate lighting within v3 family",
};

const RECRUITMENT_STRUCTURES = [
  {
    id: "recruitment_desk",
    name: "Recruitment Desk (RD)",
    layout:
      "Front-desk HR bay: curved welcome counter, interview chairs opposite, blank resume paper stacks, potted plant, soft warm welcome lighting",
    camera: "3/4 toward welcome counter hero",
    keystone:
      "HR recruitment counter with stacked blank folders and dual guest chairs, optional tiny soft chibi anime HR staff silhouette back/side only not photoreal",
    avoid: "Not a classroom, no projector wall training layout",
  },
  {
    id: "mit_room",
    name: "MIT (Management in training) room",
    layout:
      "Training classroom: U-shaped conference table, blank projection screen wall, flip-chart easel silhouette, leadership podium at head, certificate frames without text",
    camera: "Elevated angle over U-table toward screen",
    keystone:
      "U-table with projection screen and flip chart, management training energy, no HR welcome desk",
    avoid: "Not recruitment front desk, no interview waiting chairs at counter",
  },
];

const RECRUITMENT_BANNER_BRIEF =
  "Recruitment category header: isometric wing slice with two separate pods HR desk interview bay and MIT training classroom, essentials palette continuity, readable at small horizontal strip crop";

function recruitmentPass2StructurePrompt(version, structureId) {
  const row = RECRUITMENT_STRUCTURES.find((s) => s.id === structureId);
  const versionStyle =
    RECRUITMENT_PASS2_VERSION_STYLE[version] ?? RECRUITMENT_PASS2_VERSION_STYLE[1];
  const name = row?.name ?? structureId;
  return [
    RECRUITMENT_CARD_STYLE,
    RECRUITMENT_ANTI_CLONE,
    versionStyle,
    `Structure: ${name}`,
    `Layout: ${row?.layout ?? "Unique pod"}`,
    `Camera: ${row?.camera ?? "Isometric 3/4"}`,
    `Keystone: ${row?.keystone ?? "Single prop"}`,
    `Avoid: ${row?.avoid ?? "Clone layouts"}`,
  ].join(". ");
}

function recruitmentPass2BannerPrompt(version) {
  const versionStyle =
    RECRUITMENT_PASS2_VERSION_STYLE[version] ?? RECRUITMENT_PASS2_VERSION_STYLE[1];
  return `${RECRUITMENT_BANNER_STYLE}. ${RECRUITMENT_BANNER_BRIEF}. ${versionStyle}. Two-pod mosaic; generate after structure masters.`;
}

function recruitmentStructurePrompt(structureId, variantNote) {
  return (
    recruitmentPass2StructurePrompt(1, structureId) +
    (variantNote ? `. ${variantNote}` : "")
  );
}

function recruitmentBannerPrompt(variantNote) {
  return `${RECRUITMENT_BANNER_STYLE}. ${RECRUITMENT_BANNER_BRIEF}. ${variantNote || "Version exploration."}`;
}

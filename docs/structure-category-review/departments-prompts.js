/**
 * Image-generation briefs for Departments (Build tab).
 * Player-facing / copy-paste prompts only — no title drops, no real brands, no readable text.
 * Visual target: same production family as wired Essentials (isometric floor, soft anime BG).
 *
 * Pass 2b (Oct 2026): five standalone room layouts per set — generate structures first,
 * banner last (mosaic). Style ref: Essentials desk pass2 matching version only — never
 * use department banner as structure reference.
 */
const DEPARTMENTS_ANTI_CLONE =
  "Standalone single-room isometric cutaway diorama, NOT a crop from a wide banner, unique floor plan and sightline for this room type only";

const DEPARTMENTS_CARD_STYLE =
  "Isometric office module vignette, same building world as essentials wing, soft pastel anime background, single keystone prop readable at tiny vertical crop, no text no logos no readable UI, 16:9 with negative space for vertical UI crop";

const DEPARTMENTS_BANNER_STYLE =
  "Wide isometric office floor banner, departments wing overview mosaic, soft pastel anime background, five visually distinct pods on one wing tile matching separate room layouts (center table bullpen, corner break nook, open social connection wall, split video edit bay, shallow press stage), not five copies of the same desk wall, no text no logos, 16:9 horizontal strip crop safe";

const DEPARTMENTS_PASS2_VERSION_STYLE = {
  1: "Pass 2 set v1 grounded anime office wing, Arknights-inspired soft sim pastels, balanced mid-tones, gentle ambient light",
  2: "Pass 2 set v2 grounded anime, alternate isometric angles, same grounded palette family as v1, color balance emphasis",
  3: "Pass 2 set v3 cinematic anime UI background, 13 Sentinels-inspired depth, rim light, sharp keystone prop hero",
  4: "Pass 2 set v4 cinematic anime, alternate lighting and camera within v3 family",
};

/** Essentials pass2 desk JPG — palette/building ref only (path relative to structure-category-review). */
function departmentsEssentialsStyleRefPath(version) {
  const v = Math.min(4, Math.max(1, version));
  return `./images/essentials/pass2/structures/essentials-office-desk-pass2-v${v}.jpg`;
}

const DEPARTMENTS_STRUCTURES = [
  {
    id: "dept_b2b",
    name: "Department of B2B",
    layout:
      "Center-floor bullpen: curved oval meeting table in open aisle space, connection hologram rings floating above table center, no podium no monitor wall",
    camera: "Classic isometric corner pull-back, table and holo readable",
    keystone:
      "Connection network hologram rings and curved table edge, tiny abstract handshake figurines not realistic humans, no anime staff portraits",
    avoid: "Do not use desk-facing-flat-wall layout or press podium",
  },
  {
    id: "break_room",
    name: "Break room",
    layout:
      "Corner L-shaped cozy nook: couch on two walls, vending machine glow on side wall, coffee table and plant, warm pool of light",
    camera: "Closer lower cozy 3/4 angle",
    keystone: "Vending machine glow or plush couch arm, warm mood lighting",
    avoid: "No creator desk row, no podium, no edit monitors",
  },
  {
    id: "social_media",
    name: "Social Media",
    layout:
      "Open creator bay: arc desk facing a connection wall — abstract linked nodes and blank colored tiles forming audience constellation, optional tiny anime staff silhouettes at desk back/side only, soft chibi style not photoreal",
    camera: "Slightly higher angle toward connection wall as hero",
    keystone:
      "Connection wall graph and linked bubbles as primary hero, PR community energy, ring light secondary if needed",
    avoid: "Not a press briefing desk, not same layout as video edit bay or press stage",
  },
  {
    id: "video_production_studio",
    name: "Video production studio",
    layout:
      "Split asymmetric bay: edit desk with dual monitors showing abstract timeline blocks and color grading panel shapes as primary side, camera on tripod and softbox secondary on opposite side, backdrop roll in back",
    camera: "3/4 toward edit desk so timeline shapes read at small crop",
    keystone:
      "Video editing station monitors with timeline strips and color wheel shape, camera tripod secondary",
    avoid: "Not camera-only hero without edit desk, not press monitor grid behind podium",
  },
  {
    id: "press_room",
    name: "Press Room",
    layout:
      "Shallow briefing stage: podium and microphone cluster in foreground, deep background wall of blank monitor panels, flag-free decor",
    camera: "Lower angle toward podium",
    keystone: "Podium silhouette and mic array, monitor grid depth",
    avoid: "Only room with podium-forward layout; not creator arc desk",
  },
];

const DEPARTMENTS_BANNER_BRIEF =
  "Departments category header: isometric wing slice with five separate colored pods echoing B2B center table, break corner, social connection wall, video edit+camera split, press podium stage — essentials wing palette continuity, hero readability at small horizontal strip crop";

function departmentsPass2StructurePrompt(version, structureId) {
  const row = DEPARTMENTS_STRUCTURES.find((s) => s.id === structureId);
  const versionStyle = DEPARTMENTS_PASS2_VERSION_STYLE[version] ?? DEPARTMENTS_PASS2_VERSION_STYLE[1];
  const name = row?.name ?? structureId;
  return [
    DEPARTMENTS_CARD_STYLE,
    DEPARTMENTS_ANTI_CLONE,
    versionStyle,
    `Structure: ${name}`,
    `Layout: ${row?.layout ?? "Unique department pod"}`,
    `Camera: ${row?.camera ?? "Isometric 3/4"}`,
    `Keystone: ${row?.keystone ?? "Single prop"}`,
    `Avoid: ${row?.avoid ?? "Clone layouts"}`,
  ].join(". ");
}

function departmentsPass2BannerPrompt(version) {
  const versionStyle = DEPARTMENTS_PASS2_VERSION_STYLE[version] ?? DEPARTMENTS_PASS2_VERSION_STYLE[1];
  return `${DEPARTMENTS_BANNER_STYLE}. ${DEPARTMENTS_BANNER_BRIEF}. ${versionStyle}. Generate AFTER five structure masters exist; mosaic of distinct pods not one room sliced.`;
}

/** @deprecated Pass 0 — use pass2 helpers for regen */
const DEPARTMENTS_SHARED_STYLE =
  "Isometric cutaway office floor diorama, soft pastel anime-inspired background painting, gentle ambient light, corporate satire tone, absolutely no text no logos no readable screens no watermarks, 16:9 master composition with clear single focal prop and negative space for UI crop";

function departmentsBannerPrompt(variantNote) {
  return `${DEPARTMENTS_BANNER_STYLE}. ${DEPARTMENTS_BANNER_BRIEF}. ${variantNote || "Version exploration sample."}`;
}

function departmentsStructurePrompt(structureId, variantNote) {
  return departmentsPass2StructurePrompt(1, structureId) + (variantNote ? `. ${variantNote}` : "");
}

function departmentsPass0GenrePrompt(genreLabel, structureId) {
  const row = DEPARTMENTS_STRUCTURES.find((s) => s.id === structureId);
  return `${genreLabel}. ${DEPARTMENTS_CARD_STYLE}. ${row?.name}: ${row?.keystone}. Layout: ${row?.layout}`;
}

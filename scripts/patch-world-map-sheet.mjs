/**
 * Creates or replaces the "world map" tab with art-direction prompts (hybrid soft Z1–Z4).
 * Run: node scripts/patch-world-map-sheet.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const SHEET_NAME = "world map";
const workbookPath = resolveWorkbookPath();

const SHARED_STYLE_CORE = `Hybrid style: natural earth terrain (greens, tan scrub, soft blue water) plus subtle soft-futurist accents (muted teal and warm amber glow, gentle glass-tower sheen) — NOT harsh cyberpunk neon, NOT grim noir, NOT photoreal satellite or Google Maps density.
Low density: generous open land, parks, and water between built areas; simplified shapes; calm overcast daylight; low saturation; painterly soft edges.
No text, no labels, no icons, no UI, no people, no cars.`;

const SHARED_STYLE_BLOCK = `Illustrated game world map reference, top-down orthographic (flat, not isometric unless noted).
${SHARED_STYLE_CORE}`;

const Z1_PROMPT = `Illustrated game world map reference — mild 3/4 aerial perspective (match hybrid-soft Z1 ref obliquity; NOT flat top-down orthographic).
${SHARED_STYLE_CORE}

Z1 strategic world map — entire metro region, very wide field (40+ km scale). PASS 1 v5 (LOCKED Sep 14): match approved bake world-map-z1-hybrid-soft-pass1-v5.png — hybrid-soft pass1-v3 palette, obliquity, road clarity, and painterly density.

HUB COUNT (mandatory): one warm amber Gov glow in the inner basin (NOT on the forest belt). Exactly SIX muted teal major hub glows — not five, not seven. NO teal hub at 3 o'clock (east); that spoke may continue without a major glow.

HUB PLACEMENT (clock = map north at 12h):
• 12h — ONLY major embedded IN the dark-green forest greenbelt (single in-belt site).
• 9h — west, outside belt, near large lake (keep).
• ~5h — southeast, outside belt near water (keep).
• ~1:30h — northeast, FAR outside belt in northern hills (redline arrow — not on forest ring).
• ~10:15h — northwest, outside belt toward upper-left lakes (redline arrow).
• ~7:15h — southwest plains between forest and bottom-left water (redline arrow from old 6h — not straight south on the belt).

Do NOT evenly space six majors on the belt rim. Do NOT add a seventh outer teal. Six equal strategic sites (fiction majors — not the four office tower pins). Muted teal outers, warm amber Gov (not neon).

Placement refs: world-map-z1-v5-hub-redline.jpg (delete 3h), world-map-z1-v5-hub-redline-v3-arrows.jpg (three outer moves). Engine pin math (when enabled): node scripts/sync-z1-v5-hub-layout.mjs → render-z1-v5-pin-layout.mjs.

Dark green forest greenbelt ring clearly readable between inner basin and outer majors. Major solarpunk highways: soft grey-blue arterials with mix of gentle curves and straight runs — realistic illustrated game-map roads (not star spokes from center). Roads connect central hub to each outer major and link outers where natural; major roads cross the greenbelt through readable tree gaps / gates (design the crossings, not a thin line on top).

Optional lakes, river, or quiet water where it fits the composition — no required “east bay”; water is mood not geography homework.

Large calm areas between hubs: sage fields, warm scrub, soft haze. Outside the greenbelt: hazy pastoral margin with faint distant hills (not dead black).

INNER BASIN (do not flatten): readable land texture and subtle density around Gov — not an empty smooth disk; keep illustrated variation like approved pass1-v3.

ROADS (do not lose): major solarpunk highways must stay CLEAR like pass1-v3 — soft grey-blue, visible width, ring linking outer majors, radials/gates through greenbelt; not faint smears or missing network.

Paint roads and terrain detail in this pass (not a separate road-only pass). No building blocks at city scale; zone glow + land texture + major roads only.`;

const Z1_PASS2_PROMPT = `${Z1_PROMPT}

PASS 2 — layout guide on top of pass 1 v5 style: same oblique Z1 framing. Add ONLY simple dots for seven glow centers (one Gov amber + six teal majors at v5 clock positions above) and faint centerlines for major highways already painted — no new terrain, no labels, no hex grid, no eighth outer dot. Used to align pass 1 art to engine landmark hexes in the game.`;

const Z2_PROMPT = `${SHARED_STYLE_BLOCK}

Z2 regional map — medium-wide altitude, district scale.
4–6 separated urban clusters with LARGE green and rocky gaps between them; curved river and optional bay with illustrated shores (not photo GIS).
Muted earth urban fabric; one cluster may have a small glass-tower core with soft teal accent lighting along arterials.
Roads as clear but soft grey-blue lines — not hyper-detailed street grid.`;

const Z3_PROMPT = `${SHARED_STYLE_BLOCK}

Z3 city-scale map — neighborhood districts readable as block massing, MODERATE detail only.
Breathing room: plazas, tree canopy, canal or park strips between clusters; NOT overcrowded rooftops.
Mix of warm stone/beige blocks and a few taller towers with diffuse teal edge light (no sharp hologram spam).
Stylized clarity like watercolor game map, not satellite.`;

const Z4_PROMPT = `${SHARED_STYLE_BLOCK}

Z4 detailed neighborhood — several blocks with clear gaps: tree-lined boulevards, courtyards, park wedges, optional river or canal.
Simplified building masses (illustrated, not photoreal roofs); earthy concrete/brick with muted teal and soft gold accent on key towers.
Subtle futuristic transit spine or soft under-street glow; optimistic low contrast.
Still airy — not street-level, not Google Maps density.`;

function row(label, content) {
  return [label, content];
}

const rows = [
  ["Field", "Content"],
  row("World map version", "0.1 — hybrid soft"),
  row("Spec doc (repo)", "docs/world-map-v0.1.md"),
  row("Style name", "Soft hybrid regional map (solarpunk-adjacent, not noir cyberpunk)"),
  row("Last updated", "9/15/2026 (Z1 pass-1 v5 locked — 6 teal + Gov; 12h in belt only; no 3h)"),
  row(
    "Landmarks (axial q,r) — pass 2 align",
    "Pass 1: fictional six + Gov. Pass 2 / engine: Gov 0,0 | Central Ex. -1,1 | Parkview 4,-5 | Crossroads -6,2 | Hillside 3,4 | Tim HQ 2,-7 | Chris HQ -2,-4 | Lots 6,-3 / -5,4 / -2,6 | MAP_RADIUS 7",
  ),
  row(
    "Future generation checklist",
    "1) Version 0.1 hybrid soft 2) Shared style block 3) Z1–Z4 prompt 4) Low density 5) 6 main sites + tiny beginner pockets 6) Separated pockets Z1–Z2 7) Living outside margin 8) No text/UI — see docs/world-map-v0.1.md",
  ),
  row(
    "Design goals",
    "Blend earth + futurist: softer colors than cyberpunk (less sharp/grim); less dense than satellite (not Google Maps packed). Separated hub pockets at Z1–Z2 per Sep 9 spec.",
  ),
  row(
    "Runtime map (engine today)",
    "Z1: hybrid-soft pass-1-v5 bake (in-game); v3 archive for road/palette bar. Z2–Z4 hybrid-soft PNGs. Default: bake + pins; filter overlays optional (v0.2).",
  ),
  row(
    "Reference images (repo)",
    "src/assets/reference/zoom-levels/world-map-z1-hybrid-soft.png … z4-hybrid-soft.png; older cyberpunk/satellite sets in same folder",
  ),
  row("", ""),
  row("KEEP", "Natural greens/tan/soft water; negative space; muted teal + amber accents; illustrated game map"),
  row("AVOID", "Harsh neon; black void; rooftop/GIS clutter; continuous megacity blob at Z1"),
  row("", ""),
  row("Shared style block (prepend to Z2–Z4 if editing)", SHARED_STYLE_BLOCK),
  row("", ""),
  row("Z1 image prompt (pass 1 — paint)", Z1_PROMPT),
  row(
    "Z1 pass-1 v5 refs",
    "Bake: world-map-z1-hybrid-soft-pass1-v5.png | Redlines: world-map-z1-v5-hub-redline.jpg, world-map-z1-v5-hub-redline-v3-arrows.jpg | Pins (dev): world-map-z1-pass1-v5-pin-layout.png after sync-z1-v5-hub-layout.mjs",
  ),
  row("Z1 image prompt (pass 2 — guide)", Z1_PASS2_PROMPT),
  row("", ""),
  row("Z2 image prompt", Z2_PROMPT),
  row("", ""),
  row("Z3 image prompt", Z3_PROMPT),
  row("", ""),
  row("Z4 image prompt", Z4_PROMPT),
  row("", ""),
  row(
    "Z1 UX (planned v0.2)",
    "Default map: terrain bake + pins only (no hub glow overlays). Filters toggle highlight layers (main sites, commercial, etc.).",
  ),
  row(
    "Z1 design notes (Sep 14)",
    "Pass-1 v5 locked: six teal majors + Gov; only 12h major in greenbelt; no 3h major; three outers pushed per arrow redline (NE, NW, SW). Highways through greenbelt; oblique hybrid-soft; water optional; rasterAlign + majorHubMarkers in z1-layout-canonical.json after in-game align export.",
  ),
  row(
    "Open questions for v2",
    "Filter taxonomy; commercial pin parity; Z2 aligned generator after Z1 bake approved.",
  ),
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const ws = XLSX.utils.aoa_to_sheet(rows);
ws["!cols"] = [{ wch: 36 }, { wch: 100 }];

const existingIdx = wb.SheetNames.indexOf(SHEET_NAME);
if (existingIdx >= 0) {
  wb.Sheets[SHEET_NAME] = ws;
} else {
  XLSX.utils.book_append_sheet(wb, ws, SHEET_NAME);
}

writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Updated "${SHEET_NAME}" in ${workbookPath}`);

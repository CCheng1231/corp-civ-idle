/**
 * Appends 8/4/2026 changelog rows (discover research unlocks + progression UI pass).
 * Run: node scripts/append-changelog-aug4-progression-ui.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/4/2026",
    "SUMMARY (for other devs) — Discover research unlocks + unified progression UI pass (research, structures, recruitment). Five discover nodes gate new structures (video studio, press room, company statue, electricity generator, MIT room). Shared collapsed-maxed cards and category sections; queue-first layout; no duplicate affordability/blocker copy. Agent handoff: AGENTS.md + docs/ui-principles.md + .cursor/rules/player-view-ui.mdc. Follow-ups: further recruitment density, sheet rows for discover structure balance.",
  ],
  [
    "8/4/2026",
    "Cursor AI: Discover research (#15–19) — unlocksStructure in ProgressionEffects; new StructureIds wired through build scripts, isStructureUnlocked(), engine build gate, research preview, and functional structure categories (not a separate “discovered” bucket).",
  ],
  [
    "",
    "Cursor AI: Research tab — grouped by category (Resource efficiency, Project payouts, Discover structures, Operations); ProgressionMaxedCard + ProgressionCategorySection; hide completed in queue header; compact Lv 2 → 3 · max 5; In progress when queued (not Maxed); playerDescription via researchDisplayDescription().",
  ],
  [
    "",
    "Cursor AI: Structures tab — grouped by Essentials / Departments / Power & research / Recruitment; sell ConfirmDialog (50% refund); structureUpgradeBlockerDisplay filters redundant power/cost blockers; hide maxed in queue header; same in-progress and collapsed-maxed patterns as research.",
  ],
  [
    "",
    "Cursor AI: Recruitment tab — grouped by contractor category (tier badge on card); collapsible Staff at HQ roster; recruitment-grid (200px) + recruitment-card-compact (inline cost · time, 2-line role clamp, qty + queue on one row). Branch Manager still gated on Branch Management research.",
  ],
  [
    "",
    "Cursor AI: Shared progression UI — progressionUi.tsx (ProgressionCategorySection, ProgressionMaxedCard), formatCompactBonus(); progression-grid minmax(220px); StructureCostLine affordability = red/green only (no duplicate blocker lines). OfficeSiteSummary: staff count in stats only.",
  ],
  [
    "8/4/2026",
    "Cursor AI: Handoff docs for new Cursor chats — AGENTS.md, docs/ui-principles.md, player-view-ui.mdc cursor rule. Session log lives on this ChangeLog tab (not a separate CHANGELOG.md).",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, {
  header: 1,
  defval: "",
});

const already = rows.some((r) =>
  String(r[1] ?? "").includes("unified progression UI pass"),
);
if (already) {
  console.log("8/4/2026 progression UI changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

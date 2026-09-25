/**
 * Appends 9/24/2026 changelog rows (job tiers, online connect, module split, icon drafts, Z1 plate).
 * Run: node scripts/append-changelog-sep24-tiers-split-icons.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/24/2026",
    "SUMMARY (for other devs) — Job crew: a unit may staff a job at its tier or lower; tier 2 jobs require tier 2+ (requiredMinUnitTierForJob = max of sheet min and job tier). Unknown posting defs no longer crash the job board. Secretary job-board toolbar vertical gap reduced. Online bootstrap times out at 45s and starts job maintenance only after connect; Settings Online switch checks the access-key binding. Behavior-preserving split of jobs, engine, worldSync, and App.css (public import paths unchanged). Icon drafts saved but not wired into UI. Z1 world plate underlay under v5 (pad 2600); hex layout unchanged.",
  ],
  [
    "",
    "Cursor AI: jobUnitTier.ts, jobCatalog.ts, MissionCrewPicker.tsx, JobPostingCard.tsx, JobBoard.tsx, jobBoard.ts, jobHubData.ts, scripts/build-job-data.mjs — tier gate, prune crew below the job minimum, skip unknown definitions. Tier 2 jobs regenerated with minUnitTier 2.",
  ],
  [
    "",
    "Cursor AI: src/styles secretary/job-board/mobile partials, SecretaryBriefing.tsx — tighter job-board toolbar; Filters control no longer stretched by the mobile 2.75rem min-height.",
  ],
  [
    "",
    "Cursor AI: useOnlineWorld.ts, SettingsView.tsx, App.tsx, session.ts — bootstrap timeout and generation guard; Settings mode switch loads or redeems a binding before reload; error banner points to Switch account.",
  ],
  [
    "",
    "Cursor AI: jobs.ts, engine.ts, and worldSync.ts are re-export facades. Implementation moved to jobCatalog/jobEngagementSim/jobEngage, engineQueues/engineTick/engineReducer, and worldMeta/privateSaveSync/sharedJobSync/companyPresenceSync/worldReset/worldDocs. App.css is an ordered @import of src/styles partials. Removed unused createSession, emptyAssignmentForProject, and ensureRemoteSaveSessionId. Split does not change formulas.",
  ],
  [
    "",
    "Cursor AI: assets/icons (flat line) and assets/icons/flat-filled — 16 structure + 16 research PNGs each. Discover research are blueprint variants; efficiency manuals share a binder with a resource-colored spine. Not imported by the game.",
  ],
  [
    "",
    "Cursor AI: WorldMapBaseArt.tsx, worldMapZ1WorldPlate.ts, scripts/composite-z1-world-plate.mjs, reference world-plate and world-extend-draft PNGs, AGENTS.md — Z1 margin plate under v5. Hex and hub layout unchanged.",
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
  String(r[1] ?? "").includes("requiredMinUnitTierForJob"),
);
if (already) {
  console.log("9/24/2026 changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

/**
 * Appends 8/3/2026 mechanics / engine changelog rows (queues, cancel, save, job reports).
 * Run after append-changelog-aug3.mjs. Close Excel first if EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSXNS from "xlsx";

const XLSX = XLSXNS.default ?? XLSXNS;
const __dirname = dirname(fileURLToPath(import.meta.url));
import { resolveWorkbookPath } from "./workbook-path.mjs";

const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/3/2026",
    "Cursor AI: Structure upgrades queue per site (max 2) — pay upfront, real-time build hours from balance sheet; level applies when job completes (office expansion uses same queue).",
  ],
  [
    "",
    "Cursor AI: Research queues per office (max 2) — buildTimeHoursPerLevel from research data; research level applies firm-wide on completion.",
  ],
  [
    "",
    "Cursor AI: Recruitment batch orders (START_RECRUITMENT, max 2 queue slots per site) — hire count 1–100 per order; all units arrive when order finishes; build time scales with batch size.",
  ],
  [
    "8/3/2026",
    "Cursor AI: Queue cancel — CANCEL_STRUCTURE_JOB / CANCEL_RESEARCH_JOB / CANCEL_RECRUITMENT_JOB; refund 95% spent resources + 100% power (refunds.ts); confirm dialog; logbook categories structure_cancel / research_cancel / recruit_cancel.",
  ],
  [
    "",
    "Cursor AI: Projected structure & research levels — costs, blockers, and upgrade previews use queued target levels (Lv N → N+1) while builds are in flight.",
  ],
  [
    "",
    "Cursor AI: Save migration — backfill structure queue job ids, targetLevel, spentCost, completesAt; normalize researchQueues, recruitment job unitId/count/spentCost; dismissedJobReportIds defaults for older saves.",
  ],
  [
    "8/3/2026",
    "Cursor AI: Secretary job reports — pendingJobReports surfaces undismissed job_complete and job_cancel log entries; DISMISS_JOB_REPORT action; dismissed ids persist; SET_LOGBOOK_FILTER deep-links to logbook Jobs tab.",
  ],
  [
    "",
    "Cursor AI: jobBoard.ts — filter/sort helpers for open postings (region, tower, tier, size, category, expiration, payout per hour).",
  ],
  [
    "",
    "Cursor AI: Removed world-map ProjectPanel and legacy tower START_PROJECT bid UI — tower contracts only via Secretary job board (ENGAGE_JOB) or map hex panel → Open job board.",
  ],
  [
    "",
    "Cursor AI: researchBalance.ts + regenerated researchData.ts — per-level research build times synced from workbook (build-research-data.mjs).",
  ],
  [
    "8/3/2026",
    "Cursor AI: Dedicated Recruitment tab (RecruitmentView) replaces in-office recruitment panel; Operations/Overview/Office sites views aligned to per-site queues.",
  ],
  [
    "",
    "Cursor AI: scripts/workbook-path.mjs — shared resolver for balance workbook path across changelog and build scripts.",
  ],
];

if (!existsSync(workbookPath)) {
  console.error("Workbook not found:", workbookPath);
  process.exit(1);
}

const wb = XLSX.read(readFileSync(workbookPath), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets.ChangeLog, { header: 1, defval: "" });

const already = rows.some((r) =>
  String(r[1] ?? "").includes("CANCEL_STRUCTURE_JOB / CANCEL_RESEARCH_JOB"),
);
if (already) {
  console.log("8/3/2026 mechanics changelog rows already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} mechanics rows to ChangeLog in ${workbookPath}`);

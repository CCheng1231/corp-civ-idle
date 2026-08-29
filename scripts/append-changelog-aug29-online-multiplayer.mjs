/**
 * Appends 8/29/2026 changelog rows (Online multiplayer MVP + polish).
 * Run: node scripts/append-changelog-aug29-online-multiplayer.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/29/2026",
    "SUMMARY (for other devs) — Online multiplayer MVP (Option B). Tim/Chris account gate with Offline vs Online modes; separate saves per player/mode. Online uses Firestore worlds/dev: shared jobPostings (aggregate progress only in UI), company map presence (fixed HQs Tim {2,-7} / Chris {-4,-6}), private company state per player. Hybrid sync: realtime listeners + local sim; 5s work flush to shared postings; proportional payout on completion (contributors stored but never shown). Settings: account/mode switch, Firestore connection status. Dev cheats disabled in Online (ignore costs/timers, time skip, dev map view, reset save, reset shared world). Removed bottom-nav session strip (player · online + Switch account). Firebase via VITE_FIREBASE_* in .env.local; firestore.rules open on worlds/dev/** for dev trust. Netlify: fix UPDATE_SETTINGS TypeScript check after online dev-settings strip.",
  ],
  [
    "8/29/2026",
    "Cursor AI: AccountGate + session localStorage (corp-civ-idle-session); App boot gate; per-player offline save keys (corp-civ-idle-save-v2-tim|chris) and online Firestore cache.",
  ],
  [
    "",
    "Cursor AI: src/multiplayer/ — firebase.ts, types, session, playerHq, companySave (strip jobPostings from private blob), worldSync (bootstrap meta, seed postings, listeners, transaction flush, reset shared world).",
  ],
  [
    "",
    "Cursor AI: useOnlineWorld hook — bootstrap, job/company onSnapshot, 5s pendingSyncUnitHours flush, debounced private save, presence upsert, completion payout guard (completedPostingPayouts).",
  ],
  [
    "",
    "Cursor AI: jobs.ts/engine.ts — activePlayerId threading; online accrual pendingSyncUnitHours; SYNC_SHARED_JOBS / SYNC_COMPANY_PRESENCE; handleOnlinePostingCompleted. WorldView peer HQ/branch markers; JobPostingCard Shared world badge.",
  ],
  [
    "",
    "Cursor AI: Online UX polish — hide Developer settings + Reset save in Online; force player map view; sanitize dev flags on online load. ShortcutSidebar session controls removed. package.json firebase dep; .env.example VITE_FIREBASE_* vars.",
  ],
  [
    "",
    "Cursor AI: Fix Netlify build — UPDATE_SETTINGS finalizeLoadedState checks action.settings.ignoreTimers (not stripped online patch). Commits: 2f8eb22, c6ce1a9.",
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
  String(r[1] ?? "").includes("Online multiplayer MVP (Option B)"),
);
if (already) {
  console.log(
    "8/29/2026 online multiplayer changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

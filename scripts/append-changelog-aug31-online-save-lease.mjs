/**
 * Appends 8/31/2026 changelog rows (Online save integrity + browser lease + HQ focus).
 * Run: node scripts/append-changelog-aug31-online-save-lease.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "8/31/2026",
    "SUMMARY (for other devs) — Online stability pass: fixed refresh wiping Tim/Chris saves (bootstrap race, structureQueues/branchSites migration crashes, stale localStorage cache overwriting Firestore). Added playerResetAt + playerSaveSessionId + resetGeneration / onlineSaveSessionId so account resets and stale tabs cannot clobber progress. savePrivateState uses Firestore transactions; corrupt loads repair instead of delete. Settings: per-player account reset, shared-world reset (job board only), pull from Firestore, timeouts. Browser lease (playerBrowserLease + claimGeneration): one active tab per online account; stale tabs alert and return to account gate; fixed StrictMode false kicks. Chris HQ coord {-2,-4}; map Home/HQ focus uses DOM-centered pan (mapViewport). Secretary stats banner counts clickable. Blank favicon silences /favicon.ico 404.",
  ],
  [
    "8/31/2026",
    "Cursor AI: save.ts, structureBalance.ts, worldSync.ts, useOnlineWorld.ts, companySave.ts — migration guards, bootstrap gating, mergeOnlineRemoteState, isPrivateStateStale, authorizeOnlineSaveState.",
  ],
  [
    "",
    "Cursor AI: browserLease.ts, useOnlineBrowserLease.ts, App.tsx, AccountGate — Firestore lease claim/heartbeat/subscribe; claimGeneration prevents dev remount self-kick.",
  ],
  [
    "",
    "Cursor AI: SettingsView — online reset account/shared-world/full world + pull from Firestore; playerHq.ts, WorldView.tsx, mapViewport.ts — Chris HQ + focus centering.",
  ],
  [
    "",
    "Cursor AI: AGENTS.md + docs/ui-principles.md handoff; commits 6454370 + online save batch.",
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
  String(r[1] ?? "").includes("playerBrowserLease + claimGeneration"),
);
if (already) {
  console.log(
    "8/31/2026 online save + browser lease changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

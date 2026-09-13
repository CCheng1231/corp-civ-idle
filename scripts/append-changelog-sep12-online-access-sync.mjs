/**
 * Appends 9/12/2026 changelog rows (access-key online auth + Firestore sync throttle).
 * Run: node scripts/append-changelog-sep12-online-access-sync.mjs
 * Close the workbook in Excel first if you get EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();

const NEW_ROWS = [
  [
    "9/12/2026",
    "SUMMARY (for other devs) — Online security: replaced open Firestore test mode with Anonymous Auth + reusable access keys (worlds/dev/accessKeys/{uuid}) and browser bindings (bindings/{firebaseUid}). Playtester pastes key once; same key works on new devices; one binding per browser profile. accountId replaces playerId online (tim/chris/guest-*). AccountGate: Online key entry + resume; dev shortcuts VITE_ONLINE_DEV_KEY_TIM/CHRIS. Settings: Tim/Chris create playtest keys. firestore.rules + docs/firestore-security.md + firebase.json; scripts/create-access-key.mjs (Admin SDK, auto-loads .env.local / firebase-admin-sa.json). Browser lease unchanged (one tab per account).",
  ],
  [
    "9/12/2026",
    "Cursor AI: onlineAccess.ts, AccountGate.tsx, types.ts, session.ts — redeemAccessKey, loadBrowserBinding, ensureOnlineAccess; playerId→accountId across worldSync/playerHq/useOnlineWorld.",
  ],
  [
    "",
    "Cursor AI: firestore.rules, docs/firestore-security.md, create-access-key.mjs, .env.example — access-key rules, bootstrap docs, dev key script.",
  ],
  [
    "",
    "Cursor AI: useOnlineWorld.ts, engine.ts, save.ts — throttle Firestore writes: private save + shared job flush every 60s (was 5s); immediate sync on economy/world actions via worldPersistRevision (build/research/recruit/branch/job engage-cancel/completion payout); safety flush on tab hide + account switch; map presence still 15s. Commit 3fa0719.",
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
  String(r[1] ?? "").includes("worldPersistRevision"),
);
if (already) {
  console.log(
    "9/12/2026 online access + sync throttle changelog rows already present — skipping.",
  );
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);

/**
 * Appends 11/14/2026 changelog — full day across sessions (jobs, auth, map art, secretaries).
 * Run: node scripts/append-changelog-nov14-full-day.mjs
 * (Partial ground/crew rows may already exist from append-changelog-nov14-region-ground-crew.mjs.)
 * Close Corp Idle Working.xlsx first if EBUSY.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import * as XLSXNS from "xlsx";
import { resolveWorkbookPath } from "./workbook-path.mjs";

const XLSX = XLSXNS.default ?? XLSXNS;
const workbookPath = resolveWorkbookPath();
const BLOCK_MARKER = "11/14/2026 full day block (jobs auth map skins)";

const NEW_ROWS = [
  [
    "11/14/2026",
    "SUMMARY — Major day: procedural jobs (13 sites×3 slots, location types, satirical titles, tier pay, hidden respawn, fuzzy engage hints, any unit on all jobs); Police + Hospital world landmarks and job reconcile (online + map drawer); Google SSO option 1B with email-locked access keys + title screen (Play Solo / Sign in with Google) for playtesters; secretary wardrobe + nurse skin (−1% hospital on-site when team lead); online fixes (welcome-back dialog, branch-milestone recruitment scoped to owner); map (removed job-filter dimming, HQ region from distance rings, iso-strong ground all four rings, baked hospital + police station); assorted load/sign-in fixes. — " +
      BLOCK_MARKER,
  ],
  [
    "11/14/2026",
    `Cursor AI: jobSites.ts, jobSlots.ts, jobProcedural.ts, jobNamePools.ts, jobDefinitions.ts, jobCatalog.ts, jobEngagementSim.ts, jobBoard.ts, JobBoard.tsx, JobPostingCard.tsx, MapJobFilterPanel, MapHexDrawer, sharedJobSlotSync.ts, save migrations — procedural jobs replace static hub catalog; ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: firebaseAuth.ts, onlineAccess.ts, AccountGate.tsx, TitleScreen, SettingsView, list-access-keys.mjs, create-access-key.mjs — Google sign-in + access key redeem (email-locked keys); playtester gate (not Tim/Chris-only); OAuth diagnostics copy; ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: secretarySkins.ts, secretarySkinData.ts, SecretarySkinUnlockModal, SecretaryRosterView, SecretaryDetailDialog, nurse portraits Secretary_skins/nurse — wardrobe unlock on max skill tree; nurse hospital work bonus; drag-scroll catalogue; ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: hospital/police bake assets, mapLandmarkInstances, mapBakedLandmark, key-map-landmark-bake.mjs — hospital concept A + police g3d-c on map; police:world (0,-2), hospital:world (-5,3); ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: mapMetropolisCoreGround.ts, mapMetroFringeGround.ts, mapCountyGround.ts, mapGreenbeltGround.ts, WorldView.tsx, 09-world-map-ground.css, reference map previews — player map iso-strong ground all region rings; ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: offlineWelcome.ts, engineTick.ts, secretaryRecruitment.ts — online welcome-back shows after away time; executive recruitment milestone counts owned branches only online; ${BLOCK_MARKER}.`,
  ],
  [
    "11/14/2026",
    `Cursor AI: WorldView.tsx (job filter spotlight removed), mapWorld.ts (HQ region distance rings), MissionCrewPicker.tsx (crew list availability), formatUtil/commercialSiteLookup (white-screen import split) — ${BLOCK_MARKER}.`,
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

if (rows.some((r) => String(r[1] ?? "").includes(BLOCK_MARKER))) {
  console.log("11/14/2026 full-day changelog block already present — skipping.");
  process.exit(0);
}

rows.push(...NEW_ROWS);
wb.Sheets.ChangeLog = XLSX.utils.aoa_to_sheet(rows);
writeFileSync(workbookPath, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log(`Appended ${NEW_ROWS.length} rows to ChangeLog in ${workbookPath}`);
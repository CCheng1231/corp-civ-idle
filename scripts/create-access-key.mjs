/**
 * Create a dev or playtest access key in Firestore (Admin SDK).
 *
 * Usage:
 *   node scripts/create-access-key.mjs "Alice"
 *   node scripts/create-access-key.mjs "Tim dev" --account tim
 *   node scripts/create-access-key.mjs "Chris dev" --account chris
 *
 * Env (optional if .env.local / service account JSON present):
 *   GOOGLE_APPLICATION_CREDENTIALS — path to service account JSON
 *   VITE_FIREBASE_PROJECT_ID — Firebase project id
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PLACEHOLDER_PROJECT_IDS = new Set([
  "your-firebase-project-id",
  "your-gcp-project-id",
  "",
]);

function loadDotEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function resolveCredentialsPath() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    join(ROOT, "firebase-admin-sa.json"),
    join(ROOT, "..", ".config", "corp-civ-idle", "google-sheets-sa.json"),
  ].filter(Boolean);

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function projectIdFromServiceAccount(credentialsPath) {
  try {
    const json = JSON.parse(readFileSync(credentialsPath, "utf8"));
    return typeof json.project_id === "string" ? json.project_id : null;
  } catch {
    return null;
  }
}

function resolveProjectId(credentialsPath) {
  const fromEnv = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (fromEnv && !PLACEHOLDER_PROJECT_IDS.has(fromEnv)) return fromEnv;
  const fromSa = projectIdFromServiceAccount(credentialsPath);
  if (fromSa && !PLACEHOLDER_PROJECT_IDS.has(fromSa)) return fromSa;
  return null;
}

loadDotEnvLocal();

const args = process.argv.slice(2);
const accountFlag = args.indexOf("--account");
const accountId =
  accountFlag >= 0 ? args[accountFlag + 1] : `guest-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
const displayName =
  accountFlag >= 0
    ? args.filter((_, i) => i !== accountFlag && i !== accountFlag + 1).join(" ").trim()
    : args.join(" ").trim();

if (!displayName) {
  console.error(
    'Usage: node scripts/create-access-key.mjs "Playtester name" [--account tim|chris|guest-xxx]',
  );
  process.exit(1);
}

const credentialsPath = resolveCredentialsPath();
if (!credentialsPath) {
  console.error(
    "Service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS or add firebase-admin-sa.json in the project root.",
  );
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

const projectId = resolveProjectId(credentialsPath);
if (!projectId) {
  console.error(
    "Could not resolve Firebase project id. Set VITE_FIREBASE_PROJECT_ID in .env.local (not the placeholder from .env.example).",
  );
  process.exit(1);
}

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();
const keyId = randomUUID();
const worldId = "dev";

await db.doc(`worlds/${worldId}/accessKeys/${keyId}`).set({
  accountId,
  displayName,
  createdAt: Date.now(),
  createdBy: "script",
  revoked: false,
});

console.log(`Created access key for ${displayName}`);
console.log(`  projectId: ${projectId}`);
console.log(`  accountId: ${accountId}`);
console.log(`  key:       ${keyId}`);
console.log("");
console.log("Send the key to the playtester. They enter it once at the account gate.");

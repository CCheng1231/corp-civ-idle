/**
 * List access keys in Firestore (Admin SDK).
 * Usage: node scripts/list-access-keys.mjs [name filter substring]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const filterArg = process.argv[2]?.trim();

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
    if (process.env[key] == null) process.env[key] = value;
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

loadDotEnvLocal();
const credentialsPath = resolveCredentialsPath();
if (!credentialsPath) {
  console.error("Service account JSON not found.");
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
if (!projectId) {
  console.error("Set VITE_FIREBASE_PROJECT_ID in .env.local");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId });
const snap = await getFirestore().collection("worlds/dev/accessKeys").get();

for (const doc of snap.docs) {
  const data = doc.data();
  const displayName = String(data.displayName ?? "");
  if (
    filterArg &&
    !displayName.toLowerCase().includes(filterArg.toLowerCase())
  ) {
    continue;
  }
  console.log(
    [
      doc.id,
      displayName,
      data.lockedEmail ? `locked:${data.lockedEmail}` : "",
      data.revoked ? "(revoked)" : "",
    ]
      .filter(Boolean)
      .join("\t"),
  );
}
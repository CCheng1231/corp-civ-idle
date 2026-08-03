/**
 * Shared balance workbook resolution for scripts/.
 * Prefers the newest dated working copy, then older fallbacks.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** First existing path wins. */
export const WORKBOOK_CANDIDATES = [
  join(ROOT, "20270802 Corp Idle Working.xlsx"),
  join(ROOT, "20260731 Corp Idle Working.xlsx"),
  join(ROOT, "..", "Corp-Civ-Balance-Reference-working.xlsx"),
  join(ROOT, "..", "Corp-Civ-Balance-Reference.xlsx"),
  join(ROOT, "Corp-Civ-Balance-Reference.xlsx"),
];

export function resolveWorkbookPath() {
  const path = WORKBOOK_CANDIDATES.find((p) => existsSync(p));
  if (!path) {
    console.error("No balance workbook found. Expected one of:", WORKBOOK_CANDIDATES);
    process.exit(1);
  }
  return path;
}

export const workbookPath = resolveWorkbookPath();

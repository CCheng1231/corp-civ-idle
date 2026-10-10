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
  join(ROOT, "20260905 Corp Idle Working.xlsx"),
  join(ROOT, "20260827 Corp Idle Working.xlsx"),
  join(ROOT, "20260804 Corp Idle Working.xlsx"),
  join(ROOT, "20260803 Corp Idle Working.xlsx"),
  join(ROOT, "20270802 Corp Idle Working.xlsx"),
  join(ROOT, "20260731 Corp Idle Working.xlsx"),
  join(ROOT, "..", "Corp-Civ-Balance-Reference-working.xlsx"),
  join(ROOT, "..", "Corp-Civ-Balance-Reference.xlsx"),
  join(ROOT, "Corp-Civ-Balance-Reference.xlsx"),
];

/** @returns {string | null} First existing candidate, or null if none (game build does not need a workbook). */
export function findWorkbookPath() {
  return WORKBOOK_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

/** Legacy scripts: exits 1 if no reference workbook is present. */
export function resolveWorkbookPath() {
  const path = findWorkbookPath();
  if (!path) {
    console.error("No balance workbook found. Expected one of:", WORKBOOK_CANDIDATES);
    process.exit(1);
  }
  return path;
}

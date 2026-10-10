/**
 * Optional path to reference xlsx (not used by game build).
 * CLI: --workbook path | env BALANCE_WORKBOOK_PATH | workbook-path.mjs candidates
 */
import { existsSync } from "node:fs";
import { findWorkbookPath, WORKBOOK_CANDIDATES } from "../workbook-path.mjs";

export function resolveBalanceWorkbookFromArgs(argv = process.argv) {
  const flagIdx = argv.indexOf("--workbook");
  if (flagIdx >= 0 && argv[flagIdx + 1]) {
    const p = argv[flagIdx + 1];
    if (!existsSync(p)) {
      throw new Error(`Workbook not found: ${p}`);
    }
    return p;
  }
  const envPath = process.env.BALANCE_WORKBOOK_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }
  return findWorkbookPath() ?? WORKBOOK_CANDIDATES.find((p) => existsSync(p)) ?? null;
}
